'use server'

import { headers } from 'next/headers'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { getClientIp, hashIp } from '@/lib/security'
import { rateLimit } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { readSupplySwitches } from '@/lib/supply/partner-switches'
import { CONSENT_VERSION, REGISTRATION_LIMITS, ROLE_LABEL, registrationFormValues, registrationSchema, type PartnerRole } from '@/lib/supply/partner-rules'
import { checkPartnerPlaces, notifyNewRegistration } from '@/lib/supply/partner-registration-data'
import { sendEmail } from '@/lib/email/send'
import { partnerRegistrationReceivedEmail } from '@/lib/email/templates'
import { log } from '@/lib/log'
import type { Database } from '@/lib/database.types'
import { spamCheckDrop } from '@/lib/spam-check'

// The generated types mark every SQL argument as required text; these may be NULL, which partner_register (0048) accepts.
type PartnerRegisterArgs = Database['public']['Functions']['partner_register']['Args']

export type PartnerRegistrationState = ActionResult<{ reference: string }> | null

/**
 * S6-1 "Register your business with HagerLand Supply" (public, no account). One database step creates the
 * registration, a private organisation (never published) and its supply partner record. Nothing is public.
 */
export async function submitPartnerRegistrationAction(_prev: PartnerRegistrationState, formData: FormData): Promise<PartnerRegistrationState> {
  if (await spamCheckDrop(formData, 'submit_partner_registration')) return ok({ reference: 'HLB-0' })
  // The page is "not found" while the switch is off; a form left open from before is refused too (L6).
  if (!(await readSupplySwitches()).registration) return fail('Something went wrong. Please refresh the page.')
  const parsed = registrationSchema.safeParse(registrationFormValues(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data

  const ip = getClientIp(await headers())
  const ipHash = hashIp(ip)
  const [hour, day] = await Promise.all([rateLimit(`partner-reg:h:${ipHash}`, REGISTRATION_LIMITS.hour, 3600), rateLimit(`partner-reg:d:${ipHash}`, REGISTRATION_LIMITS.day, 86_400)])
  if (!hour.allowed || !day.allowed) return fail('You have sent several registrations recently. Please wait a while and try again.')
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, ip))) return fail('Please complete the security check and try again.')

  const places = await checkPartnerPlaces(d)
  if (!places.ok) return fail('Please check the highlighted fields.', places.fieldErrors)

  const { data, error } = await getAdminSupabase()
    .rpc('partner_register', {
      p_source: 'public_form',
      p_roles: d.roles,
      p_business_name: d.business_name,
      p_other_names: d.other_names ?? null,
      p_tin: d.tin ?? null,
      p_city: d.city_id,
      p_subcity: d.subcity_id ?? null,
      p_woreda: d.woreda_id ?? null,
      p_contact_name: d.contact_name,
      p_phone: d.phone,
      p_email: d.email ?? null,
      p_category_ids: places.categoryIds,
      p_message: d.message ?? null,
      p_consent_version: CONSENT_VERSION,
      p_actor: null,
      p_ip_hash: ipHash,
    } as unknown as PartnerRegisterArgs)
    .single()
  const row = data as { id: string; reference: string } | null
  if (error || !row) {
    log.error('partner-registration', 'could not save', error)
    return fail('We could not save your registration. Please try again.')
  }
  if (d.email) await sendEmail({ to: d.email, from: 'supply', ...partnerRegistrationReceivedEmail({ reference: row.reference, business: d.business_name }) })
  await notifyNewRegistration({ id: row.id, reference: row.reference, business: d.business_name, roles: d.roles.map((r) => ROLE_LABEL[r as PartnerRole]).join(', ') })
  return ok({ reference: row.reference })
}
