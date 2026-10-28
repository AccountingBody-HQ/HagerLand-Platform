'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15). */
const AREA = '/roodber8/jobs'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, assertOwnerOrOperations, audit, isOwnerSession } from '@/lib/admin/guard'
import { readJobsSwitches } from '@/lib/jobs-switches'
import { privateClientApproval } from '@/lib/verification'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { orgManagerEmails } from '@/lib/enquiries'
import { sendEmail } from '@/lib/email/send'
import { jobDecisionEmail } from '@/lib/email/templates'
import { revalidateEntity } from '@/lib/revalidate'
import { canonicalUrl } from '@/lib/site'
import { formatSalary } from '@/lib/jobs'
import { telegramPostText } from '@/lib/jobs-share'

type Done = ActionResult<{ message: string }>

/**
 * Approve a job (it goes live and expiry is set) or send it back with a reason (spec 24.9, 24.12). Private-client jobs
 * (Jobs Phase 4): only while that switch is on, and never by the person who created them, except the owner, whose
 * note is then the required reason (stored and audited; the database checks it too).
 */
export async function jobDecisionAction(id: string, approve: boolean, note?: string): Promise<Done> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(id).success) return fail('Invalid job.')
  if (!approve && !note?.trim()) return fail('Write the reason, so the employer knows what to change.')
  const db = getAdminSupabase()
  const { data: job } = await db.from('job_posts').select('id, title, slug, status, employer_org_id, posted_for, created_by_staff').eq('id', id).maybeSingle()
  if (!job) return fail('Job not found.')
  let fourEyes: { approved_by: string; self_approval_reason: string | null } | null = null
  if (approve && job.posted_for === 'private_client') {
    if (!(await readJobsSwitches()).privateClientPosts) return fail('Private-client jobs are switched off.')
    const actor = (await adminActor()).slice(0, 120)
    const check = privateClientApproval(job.created_by_staff, actor, await isOwnerSession(), note)
    if (check === 'refused') return fail('You created this job: another person must approve it.')
    if (check === 'needs_reason') return fail('You created this job. To approve it yourself, write the reason in the note (owner only).')
    fourEyes = { approved_by: actor, self_approval_reason: job.created_by_staff === actor ? (note ?? '').trim().slice(0, 500) : null }
  }
  const { data: updated, error } = await db
    .from('job_posts')
    .update(approve ? { status: 'published', rejection_reason: null, ...(fourEyes ?? {}) } : { status: 'rejected', rejection_reason: note?.trim().slice(0, 2000) ?? null })
    .eq('id', id)
    .select('expires_at')
    .single()
  if (error) return fail('Please try again.')
  const [{ data: org }, managers] = await Promise.all([db.from('organisations').select('name').eq('id', job.employer_org_id).maybeSingle(), orgManagerEmails(job.employer_org_id)])
  if (managers.length)
    await sendEmail({ to: managers, ...jobDecisionEmail({ name: org?.name ?? 'there', title: job.title, approved: approve, reason: note ?? null, url: canonicalUrl(`/jobs/${job.slug}`), expiresAt: updated?.expires_at ?? null }) })
  await audit(approve ? 'job.approve' : 'job.reject', { type: 'job', id, label: job.title }, approve ? (fourEyes?.self_approval_reason ? { self_approval_reason: fourEyes.self_approval_reason } : null) : { reason: note ?? null })
  revalidateEntity('job', id, ['/jobs'])
  revalidatePath('/roodber8', 'layout')
  return ok({ message: approve ? 'Job approved and live.' : 'Sent back to the employer.' })
}

/** Pause, close or remove any job. */
export async function adminJobStatusAction(id: string, status: 'paused' | 'archived' | 'removed'): Promise<Done> {
  await assertAdmin(AREA)
  const parsed = z.object({ id: z.uuid(), status: z.enum(['paused', 'archived', 'removed']) }).safeParse({ id, status })
  if (!parsed.success) return fail('Invalid request.')
  const { data, error } = await getAdminSupabase().from('job_posts').update({ status: parsed.data.status }).eq('id', parsed.data.id).select('title').single()
  if (error || !data) return fail('Please try again.')
  await audit(`job.${parsed.data.status}`, { type: 'job', id: parsed.data.id, label: data.title })
  revalidateEntity('job', parsed.data.id, ['/jobs'])
  revalidatePath('/roodber8', 'layout')
  return ok({ message: parsed.data.status === 'removed' ? 'Job removed.' : parsed.data.status === 'paused' ? 'Job paused.' : 'Job closed.' })
}

/**
 * "Copy for Telegram" (Jobs Phase 5, W16): the text for HagerLand's own Telegram channel for a live job, in English.
 * Owner and Operations only (Agent and Content are refused here as well as by the role map). Changes nothing.
 */
export async function telegramTextAction(id: string): Promise<ActionResult<{ text: string }>> {
  await assertAdmin(AREA)
  await assertOwnerOrOperations()
  if (!z.uuid().safeParse(id).success) return fail('Not found.')
  const { data: job } = await getAdminSupabase().from('jobs_public').select('slug, title, location_display, posted_for, salary_min_minor, salary_max_minor, currency, salary_period').eq('id', id).maybeSingle()
  if (!job?.slug) return fail('Only a live job can be shared.')
  const privateClient = job.posted_for === 'private_client'
  const text = telegramPostText({
    title: job.title ?? '',
    place: job.location_display?.split(', ')[0] ?? '',
    link: canonicalUrl(`/jobs/${job.slug}`),
    privateClient,
    pay: formatSalary(job.salary_min_minor, job.salary_max_minor, job.currency ?? 'ETB', job.salary_period),
  })
  return ok({ text })
}
