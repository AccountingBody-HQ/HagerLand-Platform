'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit } from '@/lib/admin/guard'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { developmentUpdateSchema } from '@/lib/validation/development'
import { orgManagerEmails } from '@/lib/enquiries'
import { sendEmail } from '@/lib/email/send'
import { jobDecisionEmail } from '@/lib/email/templates'
import { revalidateEntity } from '@/lib/revalidate'
import { canonicalUrl } from '@/lib/site'

type Done = ActionResult<{ message: string }>

/** Approve a job (it goes live and expiry is set) or send it back with a reason (spec 24.9, 24.12). */
export async function jobDecisionAction(id: string, approve: boolean, note?: string): Promise<Done> {
  assertAdmin()
  if (!z.uuid().safeParse(id).success) return fail('Invalid job.')
  if (!approve && !note?.trim()) return fail('Write the reason, so the employer knows what to change.')
  const db = getAdminSupabase()
  const { data: job } = await db.from('jobs').select('id, title, slug, status, employer_org_id').eq('id', id).maybeSingle()
  if (!job) return fail('Job not found.')
  const { data: updated, error } = await db
    .from('jobs')
    .update(approve ? { status: 'published', rejection_reason: null } : { status: 'rejected', rejection_reason: note?.trim().slice(0, 2000) ?? null })
    .eq('id', id)
    .select('expires_at')
    .single()
  if (error) return fail('Please try again.')
  const [{ data: org }, managers] = await Promise.all([db.from('organisations').select('name').eq('id', job.employer_org_id).maybeSingle(), orgManagerEmails(job.employer_org_id)])
  if (managers.length)
    await sendEmail({ to: managers, ...jobDecisionEmail({ name: org?.name ?? 'there', title: job.title, approved: approve, reason: note ?? null, url: canonicalUrl(`/jobs/${job.slug}`), expiresAt: updated?.expires_at ?? null }) })
  await audit(approve ? 'job.approve' : 'job.reject', { type: 'job', id, label: job.title }, approve ? null : { reason: note ?? null })
  revalidateEntity('job', id, ['/jobs'])
  revalidatePath('/roodber8', 'layout')
  return ok({ message: approve ? 'Job approved and live.' : 'Sent back to the employer.' })
}

/** Pause, close or remove any job. */
export async function adminJobStatusAction(id: string, status: 'paused' | 'archived' | 'removed'): Promise<Done> {
  assertAdmin()
  const parsed = z.object({ id: z.uuid(), status: z.enum(['paused', 'archived', 'removed']) }).safeParse({ id, status })
  if (!parsed.success) return fail('Invalid request.')
  const { data, error } = await getAdminSupabase().from('jobs').update({ status: parsed.data.status }).eq('id', parsed.data.id).select('title').single()
  if (error || !data) return fail('Please try again.')
  await audit(`job.${parsed.data.status}`, { type: 'job', id: parsed.data.id, label: data.title })
  revalidateEntity('job', parsed.data.id, ['/jobs'])
  revalidatePath('/roodber8', 'layout')
  return ok({ message: parsed.data.status === 'removed' ? 'Job removed.' : parsed.data.status === 'paused' ? 'Job paused.' : 'Job closed.' })
}

/** Publish or send back a developer's construction-progress update (spec 25.2j). */
export async function developmentUpdateDecisionAction(id: string, approve: boolean, note?: string): Promise<Done> {
  assertAdmin()
  if (!z.uuid().safeParse(id).success) return fail('Invalid update.')
  const db = getAdminSupabase()
  const { data, error } = await db
    .from('development_updates')
    .update(approve ? { status: 'published', rejection_reason: null } : { status: 'rejected', rejection_reason: note?.trim().slice(0, 2000) || null })
    .eq('id', id)
    .select('development_id, title')
    .single()
  if (error || !data) return fail('Please try again.')
  await audit(approve ? 'development_update.approve' : 'development_update.reject', { type: 'development', id: data.development_id, label: data.title }, { update: id })
  revalidateEntity('development', data.development_id)
  revalidatePath('/roodber8', 'layout')
  return ok({ message: approve ? 'Update published.' : 'Update not published.' })
}

/** Take a published progress update down. */
export async function removeDevelopmentUpdateAction(id: string): Promise<Done> {
  assertAdmin()
  if (!z.uuid().safeParse(id).success) return fail('Invalid update.')
  const { data, error } = await getAdminSupabase().from('development_updates').update({ status: 'removed' }).eq('id', id).select('development_id, title').single()
  if (error || !data) return fail('Please try again.')
  await audit('development_update.remove', { type: 'development', id: data.development_id, label: data.title }, { update: id })
  revalidateEntity('development', data.development_id)
  return ok({ message: 'Update removed.' })
}

/** HagerLand posts a progress update itself (published straight away). */
export async function adminPostDevelopmentUpdateAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  assertAdmin()
  const parsed = developmentUpdateSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  const { data, error } = await getAdminSupabase()
    .from('development_updates')
    .insert({ development_id: d.development_id, title: d.title, body: d.body, happened_on: d.happened_on, photo_paths: d.photo_paths, status: 'published', created_by: null })
    .select('id')
    .single()
  if (error || !data) return fail('We could not post the update. Please try again.')
  await audit('development_update.create', { type: 'development', id: d.development_id, label: d.title }, { update: data.id })
  revalidateEntity('development', d.development_id)
  return ok(undefined, 'Update published.')
}
