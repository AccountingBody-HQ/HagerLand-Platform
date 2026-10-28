'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getActiveMembership, requireUser } from '@/lib/auth'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { applicationSchema, candidateSchema, EMPLOYER_APPLICATION_STATUSES, isOwnCvPath, jobColumns, jobSchema, JOBS_NOT_LIVE as NOT_LIVE } from '@/lib/jobs'
import { getVertical } from '@/lib/data/verticals'
import { getLocationById } from '@/lib/data/reference'
import { hagerlandInbox, orgManagerEmails } from '@/lib/enquiries'
import { brand } from '@/lib/brand'
import { sendEmail } from '@/lib/email/send'
import { applicationReceivedEmail, newApplicationEmail } from '@/lib/email/templates'
import { rateLimit } from '@/lib/rate-limit'
import { deletePrivateFiles } from '@/lib/storage'
import { revalidateEntity } from '@/lib/revalidate'
import { canonicalUrl } from '@/lib/site'
import { shortId, slugify } from '@/lib/slug'
import { log } from '@/lib/log'
import { withUniqueRetry } from '@/lib/unique-retry'
import { trackServer } from '@/lib/analytics-server'
import { getJobsI18n } from '@/lib/i18n/server'
import { translateResult } from '@/lib/i18n/translate'

async function jobsLive(): Promise<boolean> {
  return (await getVertical('jobs'))?.status === 'live'
}

export type JobState = ActionResult<{ id: string }> | null

/** Employers create or edit a job; "submit" sends it to HagerLand for review (spec 24.9). Live jobs are paused before editing. */
async function saveJobActionImpl(_prev: JobState, formData: FormData): Promise<JobState> {
  await requireUser('/account/jobs')
  if (!(await jobsLive())) return fail(NOT_LIVE)
  const active = await getActiveMembership()
  if (!active) return fail('Jobs are posted by organisations. Create your business profile first.')
  const parsed = jobSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  if (!(await getLocationById(parsed.data.location_id))) return fail('Choose where the job is.', { location_id: 'Choose a place from the list' })
  const submit = formData.get('intent') === 'submit'
  const d = parsed.data
  const supabase = getServerSupabase()
  let id = d.id
  if (!id) {
    const { data, error } = await withUniqueRetry(() =>
      supabase
      .from('job_posts')
      .insert({ ...jobColumns(d), slug: `${slugify(d.title, 60)}-${shortId(4)}`, employer_org_id: active.org.id, status: submit ? 'pending_review' : 'draft' })
      .select('id')
      .single(),
    )
    if (error || !data) {
      log.error('jobs', 'create failed', error)
      return fail('We could not save the job. Please try again.')
    }
    id = data.id
  } else {
    const { data: row } = await supabase.from('job_posts').select('id, status').eq('id', id).maybeSingle()
    if (!row) return fail('Job not found.')
    if (row.status === 'published') return fail('This job is live. Pause it first, then edit it and send it for review again.')
    if (row.status === 'removed') return fail('HagerLand removed this job. It cannot be changed.')
    const { error } = await supabase
      .from('job_posts')
      .update({ ...jobColumns(d), ...(submit ? { status: 'pending_review' as const } : {}) })
      .eq('id', id)
    if (error) {
      log.error('jobs', 'update failed', error)
      return fail('We could not save your changes.')
    }
  }
  revalidatePath('/account/jobs')
  redirect((await getJobsI18n()).href(`/account/jobs/${id}?${submit ? 'submitted' : 'saved'}=1`))
}

/** Pause, close (archive) or resubmit a job. */
async function setJobStatusActionImpl(id: string, status: 'paused' | 'archived' | 'pending_review'): Promise<ActionResult<{ message: string }>> {
  await requireUser('/account/jobs')
  const parsed = z.object({ id: z.uuid(), status: z.enum(['paused', 'archived', 'pending_review']) }).safeParse({ id, status })
  if (!parsed.success) return fail('Invalid request.')
  if (parsed.data.status === 'pending_review' && !(await jobsLive())) return fail(NOT_LIVE)
  const { data, error } = await getServerSupabase().from('job_posts').update({ status: parsed.data.status }).eq('id', parsed.data.id).neq('status', 'removed').select('id').maybeSingle()
  if (error || !data) return fail('We could not change this job. Please try again.')
  revalidateEntity('job', parsed.data.id, ['/account/jobs', `/account/jobs/${parsed.data.id}`])
  return ok({ message: parsed.data.status === 'paused' ? 'Job paused. It is hidden from the job board.' : parsed.data.status === 'archived' ? 'Job closed.' : 'Sent to HagerLand for review.' })
}

export type ApplyState = ActionResult<{ reference: string }> | null

/** A signed-in candidate applies with a CV (PDF or Word) and a cover note (spec 24.9). */
async function applyForJobActionImpl(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  const user = await requireUser('/jobs')
  if (!(await jobsLive())) return fail(NOT_LIVE)
  const parsed = applicationSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  if (d.cv_path && !isOwnCvPath(d.cv_path, user.id)) return fail('Please upload your CV again.', { cv_path: 'Upload your CV again' })
  if (!(await rateLimit(`job-apply:${user.id}`, 20, 86_400)).allowed) return fail('You have sent a lot of applications today. Please try again tomorrow.')
  const db = getAdminSupabase()
  const { data: job } = await db.from('jobs_public').select('id, slug, title, employer_org_id, employer_name, posted_for').eq('id', d.job_id).maybeSingle()
  if (!job?.id || !job.employer_org_id) return fail('This job is no longer open.')
  const { data: member } = await db.from('organisation_members').select('user_id').eq('org_id', job.employer_org_id).eq('user_id', user.id).maybeSingle()
  if (member) return fail('You cannot apply for a job your own organisation posted.')
  const { data: row, error } = await db
    .from('job_applications')
    .insert({ job_id: job.id, applicant_user_id: user.id, name: d.name, email: d.email, phone: d.phone ?? null, cover_note: d.cover_note ?? null, cv_path: d.cv_path ?? null })
    .select('id, reference')
    .single()
  if (error || !row) {
    if (error?.code === '23505') return fail('You have already applied for this job. You can see it under My applications.')
    log.error('jobs', 'application insert failed', error)
    return fail('We could not send your application. Please try again.')
  }
  const { count } = await db.from('job_applications').select('id', { count: 'exact', head: true }).eq('job_id', job.id)
  await db.from('job_posts').update({ applications_count: count ?? 0 }).eq('id', job.id)
  // Private-client jobs (Jobs Phase 4): the application goes to HagerLand's inbox only, never to the client.
  const privateClient = job.posted_for === 'private_client'
  const inbox = privateClient ? await hagerlandInbox('general') : null
  const managers = privateClient ? (inbox ? [inbox] : []) : await orgManagerEmails(job.employer_org_id)
  await Promise.all([
    managers.length ? sendEmail({ to: managers, ...newApplicationEmail({ orgName: privateClient ? brand.name : (job.employer_name ?? 'there'), title: job.title ?? '', reference: row.reference, applicantName: d.name, url: canonicalUrl(privateClient ? `/roodber8/jobs/${job.id}` : `/account/jobs/${job.id}`) }) }) : Promise.resolve(false),
    sendEmail({ to: d.email, ...applicationReceivedEmail({ name: d.name.split(' ')[0], title: job.title ?? '', employer: privateClient ? brand.name : (job.employer_name ?? ''), reference: row.reference }) }),
  ])
  await trackServer('job_application_submitted')
  redirect((await getJobsI18n()).href(`/account/applications?applied=${row.reference}`))
}

/** Candidates withdraw their own application. */
async function withdrawApplicationActionImpl(id: string): Promise<ActionResult<{ message: string }>> {
  const user = await requireUser('/account/applications')
  if (!z.uuid().safeParse(id).success) return fail('Invalid application.')
  const { data, error } = await getAdminSupabase()
    .from('job_applications')
    .update({ status: 'withdrawn' })
    .eq('id', id)
    .eq('applicant_user_id', user.id)
    .not('status', 'in', '(withdrawn,hired)')
    .select('id')
    .maybeSingle()
  if (error || !data) return fail('This application cannot be withdrawn.')
  revalidatePath('/account/applications')
  return ok({ message: 'Application withdrawn.' })
}

/** Employers move an application on (viewed, shortlisted, not progressing, hired) and keep private notes. */
async function updateApplicationActionImpl(_prev: ActionResult<{ message: string }> | null, formData: FormData): Promise<ActionResult<{ message: string }>> {
  await requireUser('/account/jobs')
  const parsed = z
    .object({ id: z.uuid(), status: z.enum(EMPLOYER_APPLICATION_STATUSES), employer_notes: z.string().max(2000).transform((v) => v.trim() || null) })
    .safeParse({ id: formData.get('id'), status: formData.get('status'), employer_notes: formData.get('employer_notes') ?? '' })
  if (!parsed.success) return fail('Please check the status and notes.')
  const { data, error } = await getServerSupabase()
    .from('job_applications')
    .update({ status: parsed.data.status, employer_notes: parsed.data.employer_notes })
    .eq('id', parsed.data.id)
    .neq('status', 'withdrawn')
    .select('job_id')
    .maybeSingle()
  if (error || !data) return fail('We could not update this application.')
  revalidatePath(`/account/jobs/${data.job_id}`)
  return ok({ message: 'Application updated.' })
}

/** Candidate profile: private by default; the candidate chooses whether employers can find it (spec 24.9). */
async function saveCandidateProfileActionImpl(_prev: ActionResult<{ message: string }> | null, formData: FormData): Promise<ActionResult<{ message: string }>> {
  const user = await requireUser('/account/candidate')
  if (!(await jobsLive())) return fail(NOT_LIVE)
  const parsed = candidateSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  if (d.cv_path && !isOwnCvPath(d.cv_path, user.id)) return fail('Please upload your CV again.', { cv_path: 'Upload your CV again' })
  const loc = d.location_id ? await getLocationById(d.location_id) : null
  const supabase = getServerSupabase()
  const { data: before } = await supabase.from('candidate_profiles').select('cv_path').eq('user_id', user.id).maybeSingle()
  const { error } = await supabase.from('candidate_profiles').upsert({
    user_id: user.id,
    full_name: d.full_name,
    headline: d.headline ?? null,
    skills: d.skills,
    qualifications: d.qualifications ?? null,
    experience_years: d.experience_years ?? null,
    experience: d.experience ?? null,
    availability: d.availability,
    location_id: loc?.id ?? null,
    country_code: loc?.country_code ?? 'ET',
    cv_path: d.cv_path ?? null,
    visibility: d.visibility,
    placement_wanted: d.placement_wanted,
  })
  if (error) {
    log.error('jobs', 'candidate profile save failed', error)
    return fail('We could not save your profile. Please try again.')
  }
  if (before?.cv_path && before.cv_path !== (d.cv_path ?? null)) await removeUnusedCv(before.cv_path, user.id)
  revalidatePath('/account/candidate')
  return ok({ message: d.visibility === 'employers' ? 'Profile saved. Employers on HagerLand can now find it (without your contact details or CV).' : 'Profile saved. It is private: only you can see it.' })
}

/** Deletes the profile and its CV (CVs sent with applications stay with those applications until they are purged). */
async function deleteCandidateProfileActionImpl(): Promise<ActionResult<{ message: string }>> {
  const user = await requireUser('/account/candidate')
  const supabase = getServerSupabase()
  const { data } = await supabase.from('candidate_profiles').select('cv_path').eq('user_id', user.id).maybeSingle()
  const { error } = await supabase.from('candidate_profiles').delete().eq('user_id', user.id)
  if (error) return fail('We could not delete your profile. Please try again.')
  if (data?.cv_path) await removeUnusedCv(data.cv_path, user.id)
  revalidatePath('/account/candidate')
  return ok({ message: 'Your candidate profile has been deleted.' })
}

async function removeUnusedCv(path: string, userId: string): Promise<void> {
  if (!isOwnCvPath(path, userId)) return
  const { count } = await getAdminSupabase().from('job_applications').select('id', { count: 'exact', head: true }).eq('cv_path', path)
  if (!count) await deletePrivateFiles([path])
}

// Jobs Phase 5: the messages in the visitor's language (Amharic for Jobs: only native-reviewed text; English unchanged).
export async function saveJobAction(_prev: JobState, formData: FormData): Promise<JobState> {
  return translateResult(await saveJobActionImpl(_prev, formData), (await getJobsI18n()).t)
}

export async function setJobStatusAction(id: string, status: 'paused' | 'archived' | 'pending_review'): Promise<ActionResult<{ message: string }>> {
  return translateResult(await setJobStatusActionImpl(id, status), (await getJobsI18n()).t)
}

export async function applyForJobAction(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  return translateResult(await applyForJobActionImpl(_prev, formData), (await getJobsI18n()).t)
}

export async function withdrawApplicationAction(id: string): Promise<ActionResult<{ message: string }>> {
  return translateResult(await withdrawApplicationActionImpl(id), (await getJobsI18n()).t)
}

export async function updateApplicationAction(_prev: ActionResult<{ message: string }> | null, formData: FormData): Promise<ActionResult<{ message: string }>> {
  return translateResult(await updateApplicationActionImpl(_prev, formData), (await getJobsI18n()).t)
}

export async function saveCandidateProfileAction(_prev: ActionResult<{ message: string }> | null, formData: FormData): Promise<ActionResult<{ message: string }>> {
  return translateResult(await saveCandidateProfileActionImpl(_prev, formData), (await getJobsI18n()).t)
}

export async function deleteCandidateProfileAction(): Promise<ActionResult<{ message: string }>> {
  return translateResult(await deleteCandidateProfileActionImpl(), (await getJobsI18n()).t)
}
