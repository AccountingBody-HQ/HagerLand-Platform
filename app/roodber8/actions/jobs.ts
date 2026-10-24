'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15). */
const AREA = '/roodber8/jobs'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { orgManagerEmails } from '@/lib/enquiries'
import { sendEmail } from '@/lib/email/send'
import { jobDecisionEmail } from '@/lib/email/templates'
import { revalidateEntity } from '@/lib/revalidate'
import { canonicalUrl } from '@/lib/site'

type Done = ActionResult<{ message: string }>

/** Approve a job (it goes live and expiry is set) or send it back with a reason (spec 24.9, 24.12). */
export async function jobDecisionAction(id: string, approve: boolean, note?: string): Promise<Done> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(id).success) return fail('Invalid job.')
  if (!approve && !note?.trim()) return fail('Write the reason, so the employer knows what to change.')
  const db = getAdminSupabase()
  const { data: job } = await db.from('job_posts').select('id, title, slug, status, employer_org_id').eq('id', id).maybeSingle()
  if (!job) return fail('Job not found.')
  const { data: updated, error } = await db
    .from('job_posts')
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
