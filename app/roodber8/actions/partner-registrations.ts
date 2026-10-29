'use server'

/** Admin area these actions belong to: owner and operations; every decision also calls assertOwner(). */
const AREA = '/roodber8/supply/registrations'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, assertOwner, audit } from '@/lib/admin/guard'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { STALE_EDIT } from '@/lib/concurrency'
import { newRequestToken } from '@/lib/service-requests/token'
import { emailSchema, nameSchema } from '@/lib/validation/common'
import { checkPartnerPlaces } from '@/lib/supply/partner-registration-data'
import {
  REGISTRATION_STATUSES,
  REGISTRATION_STATUS_LABEL,
  canMoveRegistration,
  ownerOnlyRegistrationMove,
  registrationFormValues,
  staffRegistrationSchema,
  type RegistrationStatus,
} from '@/lib/supply/partner-rules'
import { sendEmail } from '@/lib/email/send'
import { partnerInvitationEmail } from '@/lib/email/templates'
import { canonicalUrl } from '@/lib/site'
import type { Database } from '@/lib/database.types'

type Msg = ActionResult<{ message: string }>
type PartnerRegisterArgs = Database['public']['Functions']['partner_register']['Args']

function refresh(id?: string) {
  revalidatePath('/roodber8/supply/registrations')
  if (id) revalidatePath(`/roodber8/supply/registrations/${id}`)
}

/**
 * Moves a registration on. Operations may start a review; approving, declining, asking for changes and suspending
 * are the owner's. Nothing is sent to the business. Declining also marks the supply partner record declined.
 */
export async function setRegistrationStatusAction(id: string, to: string, note: string, expectedUpdatedAt: string): Promise<Msg> {
  await assertAdmin(AREA)
  const target = z.enum(REGISTRATION_STATUSES).safeParse(to)
  if (!z.uuid().safeParse(id).success || !target.success) return fail('Choose a status.')
  if (ownerOnlyRegistrationMove(target.data)) await assertOwner()
  const db = getAdminSupabase()
  const { data: reg } = await db.from('partner_registrations').select('id, reference, status, org_id, updated_at').eq('id', id).maybeSingle()
  if (!reg) return fail('Registration not found.')
  if (expectedUpdatedAt && new Date(reg.updated_at).getTime() !== new Date(expectedUpdatedAt).getTime()) return fail(STALE_EDIT)
  const from = reg.status as RegistrationStatus
  if (!canMoveRegistration(from, target.data)) return fail(`A registration that is “${REGISTRATION_STATUS_LABEL[from]}” cannot become “${REGISTRATION_STATUS_LABEL[target.data]}”.`)
  const now = new Date().toISOString()
  const why = note.trim().slice(0, 2000)
  const { data: saved, error } = await db
    .from('partner_registrations')
    .update({
      status: target.data,
      status_changed_at: now,
      ...(['approved', 'declined'].includes(target.data) ? { decided_at: now } : {}),
      ...(why ? { admin_note: why } : {}),
    })
    .eq('id', id)
    .eq('status', from)
    .select('id')
    .maybeSingle()
  if (error) return fail('Could not save.')
  if (!saved) return fail(STALE_EDIT)
  if (target.data === 'declined') {
    const { error: sp } = await db.from('supply_partners').update({ relationship_status: 'declined', status_changed_at: now }).eq('org_id', reg.org_id)
    if (sp) return fail('Saved, but the supply partner record could not be marked declined. Change it on the partner page.')
  }
  await audit('supply.registration.status', { type: 'partner_registration', id, label: reg.reference }, { from, to: target.data, note: why || null })
  refresh(id)
  revalidatePath('/roodber8/supply/partners')
  return ok({ message: `Registration is now “${REGISTRATION_STATUS_LABEL[target.data]}”. Nothing was sent to the business.` })
}

/**
 * Staff add a business they met in the field (works while the public form is off). The same database step as the
 * public form: registration + private organisation + supply partner record. Nothing is sent to the business.
 */
export async function addStaffRegistrationAction(_prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin(AREA)
  const parsed = staffRegistrationSchema.safeParse(registrationFormValues(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  const places = await checkPartnerPlaces(d)
  if (!places.ok) return fail('Please check the highlighted fields.', places.fieldErrors)
  const actor = (await adminActor()).slice(0, 120)
  const { data, error } = await getAdminSupabase()
    .rpc('partner_register', {
      p_source: 'staff',
      p_roles: d.roles,
      p_business_name: d.business_name,
      p_other_names: d.other_names ?? null,
      p_tin: d.tin ?? null,
      p_city: d.city_id ?? null,
      p_subcity: d.subcity_id ?? null,
      p_woreda: d.woreda_id ?? null,
      p_contact_name: d.contact_name,
      p_phone: d.phone,
      p_email: d.email ?? null,
      p_category_ids: places.categoryIds,
      p_message: d.message ?? null,
      p_consent_version: null,
      p_actor: actor,
      p_ip_hash: null,
    } as unknown as PartnerRegisterArgs)
    .single()
  const row = data as { id: string; reference: string } | null
  if (error || !row) return fail('Could not save the registration.')
  await audit('supply.registration.add', { type: 'partner_registration', id: row.id, label: row.reference }, { business: d.business_name })
  refresh()
  redirect(`/roodber8/supply/registrations/${row.id}?added=1`)
}

/**
 * Owner: emails an approved partner a link to their private partner area (valid 7 days). Sending again withdraws the
 * previous link first. The link makes the person a partner member only (never a business member).
 */
export async function sendPartnerInvitationAction(registrationId: string, email: string, name: string): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const parsed = z.object({ id: z.uuid(), email: emailSchema, name: nameSchema }).safeParse({ id: registrationId, email, name })
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the email and name.')
  const db = getAdminSupabase()
  const { data: reg } = await db.from('partner_registrations').select('id, reference, status, org_id, business_name').eq('id', registrationId).maybeSingle()
  if (!reg) return fail('Registration not found.')
  if (reg.status !== 'approved') return fail('Approve the registration before inviting the business to its partner area.')
  const { error: revokeError } = await db.from('partner_invitations').update({ revoked_at: new Date().toISOString() }).eq('org_id', reg.org_id).is('accepted_at', null).is('revoked_at', null)
  if (revokeError) return fail('Could not withdraw the previous invitation.')
  const link = newRequestToken()
  const { error } = await db.from('partner_invitations').insert({
    org_id: reg.org_id,
    registration_id: reg.id,
    email: parsed.data.email,
    name: parsed.data.name,
    token_hash: link.hash,
    invited_by: (await adminActor()).slice(0, 120),
    expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  })
  if (error) return fail('Could not create the invitation.')
  const sent = await sendEmail({
    to: parsed.data.email,
    from: 'supply',
    ...partnerInvitationEmail({ name: parsed.data.name.split(' ')[0] || parsed.data.name, business: reg.business_name, link: canonicalUrl(`/partner/invite/${link.token}`) }),
  })
  await audit('supply.invite.send', { type: 'partner_registration', id: reg.id, label: reg.reference }, { sent })
  refresh(reg.id)
  return ok({ message: sent ? `Invitation sent to ${parsed.data.email}. The link works for 7 days.` : 'The invitation could not be emailed now; it is queued (admin → Email problems).' })
}
