'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15): Owner and Operations. */
const AREA = '/roodber8/jobs'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { orgManagerEmails } from '@/lib/enquiries'
import { sendEmail } from '@/lib/email/send'
import { jobPausedEmail } from '@/lib/email/templates'
import { revalidateEntity } from '@/lib/revalidate'
import { restorePausedJob } from '@/lib/job-reports-data'
import { asJobActor } from '@/lib/job-status-actor'

type Msg = ActionResult<{ message: string }>
const uuid = z.uuid()

function refresh(jobId?: string) {
  revalidatePath('/roodber8/jobs/reports')
  revalidatePath('/roodber8/review')
  if (jobId) revalidatePath(`/roodber8/jobs/${jobId}`)
}

async function loadReport(id: string) {
  if (!uuid.safeParse(id).success) return null
  const { data } = await getAdminSupabase().from('job_reports').select('id, job_post_id, status').eq('id', id).maybeSingle()
  return data
}

/** Closes every open report on a job with the same outcome (who and when recorded). */
async function closeOpenReports(jobId: string, status: 'dismissed' | 'actioned', outcome: 'no_action' | 'paused' | 'removed' | 'employer_contacted') {
  await getAdminSupabase().from('job_reports').update({ status, outcome, handled_by: (await adminActor()).slice(0, 120), handled_at: new Date().toISOString() }).eq('job_post_id', jobId).eq('status', 'open')
}

/** No action needed: the open reports on this job are dismissed. The job is unchanged. */
export async function dismissJobReportsAction(reportId: string): Promise<Msg> {
  await assertAdmin(AREA)
  const r = await loadReport(reportId)
  if (!r) return fail('Not found.')
  await closeOpenReports(r.job_post_id, 'dismissed', 'no_action')
  await audit('job_report.dismiss', { type: 'job', id: r.job_post_id }, { report: r.id })
  refresh(r.job_post_id)
  return ok({ message: 'Reports dismissed. The job is unchanged.' })
}

/**
 * Pause while we check: the job leaves the board at once (the existing job pause) and the employer gets one neutral
 * email (W20, never who reported). HagerLand's own private-client jobs email nobody.
 */
export async function pauseJobFromReportAction(reportId: string): Promise<Msg> {
  await assertAdmin(AREA)
  const r = await loadReport(reportId)
  if (!r) return fail('Not found.')
  const db = getAdminSupabase()
  const { data: job } = await db.from('job_posts').select('id, title, status, employer_org_id, posted_for').eq('id', r.job_post_id).maybeSingle()
  if (!job) return fail('Not found.')
  if (job.status !== 'published') return fail('Only a live job can be paused.')
  const { error } = await asJobActor(db.from('job_posts').update({ status: 'paused' }).eq('id', job.id).eq('status', 'published'), 'staff')
  if (error) return fail('Please try again.')
  await closeOpenReports(job.id, 'actioned', 'paused')
  let emailed = false
  if (job.posted_for !== 'private_client') {
    const to = await orgManagerEmails(job.employer_org_id)
    if (to.length) emailed = await sendEmail({ to, ...jobPausedEmail({ title: job.title }) })
  }
  await audit('job.paused', { type: 'job', id: job.id, label: job.title }, { from_report: r.id, employer_emailed: emailed })
  revalidateEntity('job', job.id, ['/jobs'])
  refresh(job.id)
  return ok({ message: `Job paused while you check it.${emailed ? ' The employer was emailed (no reporter details).' : ''}` })
}

/** Puts a paused job back on the board with its original closing date. */
export async function restoreJobAction(jobId: string): Promise<Msg> {
  await assertAdmin(AREA)
  if (!uuid.safeParse(jobId).success) return fail('Not found.')
  const res = await restorePausedJob(jobId)
  if (!res.ok) return fail('Only a paused job can be restored.')
  const { data: job } = await getAdminSupabase().from('job_posts').select('title').eq('id', jobId).maybeSingle()
  await audit('job.restore', { type: 'job', id: jobId, label: job?.title ?? null }, { status: res.status })
  revalidateEntity('job', jobId, ['/jobs'])
  refresh(jobId)
  return ok({ message: res.status === 'published' ? 'Job back on the board.' : 'The job’s closing date has passed, so it is now closed.' })
}

/** Removes the job (the existing removal) and closes its open reports. */
export async function removeJobFromReportAction(reportId: string): Promise<Msg> {
  await assertAdmin(AREA)
  const r = await loadReport(reportId)
  if (!r) return fail('Not found.')
  const db = getAdminSupabase()
  const { data: job, error } = await asJobActor(db.from('job_posts').update({ status: 'removed' }).eq('id', r.job_post_id).select('title').single(), 'staff')
  if (error || !job) return fail('Please try again.')
  await closeOpenReports(r.job_post_id, 'actioned', 'removed')
  await audit('job.removed', { type: 'job', id: r.job_post_id, label: job.title }, { from_report: r.id })
  revalidateEntity('job', r.job_post_id, ['/jobs'])
  refresh(r.job_post_id)
  return ok({ message: 'Job removed.' })
}

/** The employer was contacted about the reports; the job is unchanged. */
export async function markEmployerContactedAction(reportId: string): Promise<Msg> {
  await assertAdmin(AREA)
  const r = await loadReport(reportId)
  if (!r) return fail('Not found.')
  await closeOpenReports(r.job_post_id, 'actioned', 'employer_contacted')
  await audit('job_report.employer_contacted', { type: 'job', id: r.job_post_id }, { report: r.id })
  refresh(r.job_post_id)
  return ok({ message: 'Recorded: employer contacted.' })
}

/** A private staff note on one report (never shown to employers or reporters). */
export async function jobReportNoteAction(reportId: string, note: string): Promise<Msg> {
  await assertAdmin(AREA)
  const r = await loadReport(reportId)
  if (!r) return fail('Not found.')
  const text = z.string().trim().max(1000, 'Keep the note under 1,000 characters').safeParse(note ?? '')
  if (!text.success) return fail(text.error.issues[0]?.message ?? 'Check the note.')
  const { error } = await getAdminSupabase().from('job_reports').update({ staff_note: text.data || null }).eq('id', r.id)
  if (error) return fail('Could not save.')
  await audit('job_report.note', { type: 'job', id: r.job_post_id }, { report: r.id, note_changed: true })
  refresh(r.job_post_id)
  return ok({ message: 'Saved.' })
}
