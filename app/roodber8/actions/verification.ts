'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15). Owner and Operations only. */
const AREA = '/roodber8/organisations'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, assertOwnerOrOperations, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { revalidateEntity } from '@/lib/revalidate'
import { formatDate } from '@/lib/format'
import { firstName, ownerEmails } from '@/lib/admin/notify'
import { sendEmail } from '@/lib/email/send'
import { verificationDecisionEmail } from '@/lib/email/templates'
import { todayAddis } from '@/lib/jobs-desk'
import { CHECK_METHOD_VALUES } from '@/lib/verification'
import { recordCheck, revokeBadge } from '@/lib/verification-data'

type Msg = ActionResult<{ message: string }>
const blank = (v: unknown) => (v === null || (typeof v === 'string' && v.trim() === '') ? undefined : v)
const day = z.iso.date({ error: 'Enter the date' })

const checkSchema = z.object({
  licence_number: z.string().trim().min(2, 'Enter the trade licence number').max(80),
  licence_expires_on: z.preprocess(blank, z.iso.date().optional()),
  licence_checked_on: day,
  licence_check_method: z.enum(CHECK_METHOD_VALUES, { error: 'Choose how the licence was checked' }),
  tin_checked_on: day,
  phone_checked_on: day,
  phone_check_note: z.preprocess(blank, z.string().trim().max(500, 'Keep the note under 500 characters').optional()),
  site_visit_on: z.preprocess(blank, z.iso.date().optional()),
})

/** A check day (Addis date) stored as noon Addis time, so it never shows as the day before or after. */
const at = (d: string) => new Date(`${d}T12:00:00+03:00`).toISOString()

/**
 * Owner and Operations: records the check behind the Verified badge (licence, tax number, phone) and gives the badge
 * for 12 months, or until the licence expires if that is sooner. Who recorded it comes from the sign-in.
 */
export async function recordVerificationCheckAction(orgId: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwnerOrOperations()
  if (!z.uuid().safeParse(orgId).success) return fail('Not found.')
  const parsed = checkSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the details.')
  const d = parsed.data
  const today = todayAddis()
  for (const v of [d.licence_checked_on, d.tin_checked_on, d.phone_checked_on, d.site_visit_on]) if (v && v > today) return fail('Check dates cannot be in the future.')
  const db = getAdminSupabase()
  const { data: org } = await db.from('organisations').select('id, name, status').eq('id', orgId).maybeSingle()
  if (!org) return fail('Not found.')
  const actor = await adminActor()
  const res = await recordCheck(
    orgId,
    {
      licence_number: d.licence_number,
      licence_expires_on: d.licence_expires_on ?? null,
      licence_checked_at: at(d.licence_checked_on),
      licence_check_method: d.licence_check_method,
      tin_checked_at: at(d.tin_checked_on),
      phone_checked_at: at(d.phone_checked_on),
      phone_check_note: d.phone_check_note ?? null,
      site_visit_at: d.site_visit_on ? at(d.site_visit_on) : null,
    },
    actor,
  )
  if (!res.ok) return fail(res.error)
  if (res.requestId) {
    const { data: req } = await db.from('verification_requests').select('submitted_by').eq('id', res.requestId).maybeSingle()
    const to = await ownerEmails(orgId, req?.submitted_by ?? null)
    if (to.length) await sendEmail({ to, ...verificationDecisionEmail({ name: await firstName(req?.submitted_by ?? null), orgName: org.name, approved: true }) })
  }
  await audit('verification.check', { type: 'organisation', id: orgId, label: org.name }, { method: d.licence_check_method, valid_until: res.validUntil, request: res.requestId })
  revalidateEntity('organisation', orgId)
  revalidatePath(`/roodber8/organisations/${orgId}`)
  revalidatePath('/roodber8', 'layout')
  return ok({ message: `Check recorded. ${org.name} is Verified until ${formatDate(res.validUntil)}.` })
}

/** Owner and Operations: takes the Verified badge away now (new-standard or legacy), with a reason. */
export async function revokeBadgeAction(orgId: string, reason: string): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwnerOrOperations()
  if (!z.uuid().safeParse(orgId).success) return fail('Not found.')
  const why = (reason ?? '').trim()
  if (why.length < 3) return fail('Say why the badge is removed.')
  const { data: org } = await getAdminSupabase().from('organisations').select('id, name, verification_level').eq('id', orgId).maybeSingle()
  if (!org) return fail('Not found.')
  if (org.verification_level !== 'verified') return fail('This business does not have the Verified badge.')
  const res = await revokeBadge(orgId, why, await adminActor())
  if (!res.ok) return fail(res.error ?? 'Could not revoke the badge.')
  await audit('verification.revoke', { type: 'organisation', id: orgId, label: org.name }, { reason: why.slice(0, 500) })
  revalidateEntity('organisation', orgId)
  revalidatePath(`/roodber8/organisations/${orgId}`)
  return ok({ message: 'Badge removed.' })
}
