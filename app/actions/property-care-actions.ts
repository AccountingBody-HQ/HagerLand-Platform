'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getUser } from '@/lib/auth'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { getClientIp, hashIp } from '@/lib/security'
import { rateLimit } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { checkbox, emailSchema, nameSchema, optionalText, optionalUuid, phoneSchema, preferredContactSchema } from '@/lib/validation/common'
import { COUNTRY_CODES, countryName } from '@/lib/countries'
import { CARE_SERVICE_LABEL, CARE_SERVICE_VALUES } from '@/lib/property-care'
import { isEthiopianLocation } from '@/lib/data/reference'
import { hagerlandInbox } from '@/lib/enquiries'
import { sendEmail } from '@/lib/email/send'
import { adminNoticeEmail, propertyCareReceivedEmail } from '@/lib/email/templates'
import { canonicalUrl } from '@/lib/site'
import { formatPhone } from '@/lib/format'
import { parseUtm } from '@/lib/utm'
import { log } from '@/lib/log'
import { spamCheckDrop } from '@/lib/spam-check'
import { transferConsentMissing } from '@/lib/data-transfer'
import { recordTransferConsent } from '@/lib/data-transfer-server'

export type CareState = ActionResult<{ reference: string }> | null

const schema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    country_code: z.enum(COUNTRY_CODES, { error: 'Choose the country you live in' }),
    city: optionalText(120, 'City'),
    time_zone: optionalText(60),
    contact_time: optionalText(120, 'Best time'),
    preferred_contact: preferredContactSchema,
    property_location_id: optionalUuid,
    property_location_text: optionalText(200, 'Where the property is'),
    property_type: z.enum(['house', 'apartment', 'villa', 'g_plus_building', 'land', 'commercial', 'other'], { error: 'Choose the type of property' }),
    occupancy: z.enum(['family', 'tenanted', 'vacant', 'under_construction', 'other'], { error: 'Tell us who lives there now' }),
    services: z.array(z.enum(CARE_SERVICE_VALUES)).min(1, 'Choose at least one service').max(CARE_SERVICE_VALUES.length),
    message: optionalText(2000, 'Message'),
    marketing_consent: checkbox,
    source_url: optionalText(500),
    utm: z.string().max(600).optional(),
  })
  .refine((d) => d.property_location_id || d.property_location_text, { message: 'Tell us where the property is', path: ['property_location_id'] })

/** "Request a consultation" for HagerLand Property Care (spec 24.6). Goes to the Property Care pipeline in admin. */
export async function requestPropertyCareAction(_prev: CareState, formData: FormData): Promise<CareState> {
  if (await spamCheckDrop(formData, 'request_property_care')) return ok({ reference: 'HLC-0' })
  const noConsent = transferConsentMissing(formData)
  if (noConsent) return noConsent
  const parsed = schema.safeParse({ ...Object.fromEntries(formData), services: formData.getAll('services') })
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  if (d.property_location_id && !(await isEthiopianLocation(d.property_location_id))) return fail('Property Care covers property in Ethiopia.', { property_location_id: 'Choose a place in Ethiopia' })
  const ip = getClientIp(await headers())
  const ipHash = hashIp(ip)
  if (!(await rateLimit(`care:${ipHash}`, 5, 3600)).allowed) return fail('You have sent several requests recently. Please wait a while and try again.')
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, ip))) return fail('Please complete the security check and try again.')
  const user = await getUser()
  const { data: row, error } = await getAdminSupabase()
    .from('property_care_requests')
    .insert({
      name: d.name,
      email: d.email,
      phone: d.phone,
      country_code: d.country_code,
      city: d.city ?? null,
      time_zone: d.time_zone ?? null,
      contact_time: d.contact_time ?? null,
      preferred_contact: d.preferred_contact ?? null,
      property_location_id: d.property_location_id ?? null,
      property_location_text: d.property_location_text ?? null,
      property_type: d.property_type,
      occupancy: d.occupancy,
      services: Array.from(new Set(d.services)),
      message: d.message ?? null,
      marketing_consent: d.marketing_consent,
      consent_at: d.marketing_consent ? new Date().toISOString() : null,
      user_id: user?.id ?? null,
      source_url: d.source_url ?? null,
      utm: parseUtm(d.utm),
      ip_hash: ipHash,
    })
    .select('id, reference')
    .single()
  if (error || !row) {
    log.error('property-care', 'insert failed', error)
    return fail('We could not send your request. Please try again.')
  }
  await sendEmail({ to: d.email, ...propertyCareReceivedEmail({ name: d.name.split(' ')[0] || d.name, reference: row.reference, contactTime: d.contact_time ?? null }) })
  const to = Array.from(new Set([await hagerlandInbox('sales'), process.env.ADMIN_DIGEST_EMAIL].filter((x): x is string => Boolean(x))))
  if (to.length) {
    await sendEmail({
      to,
      replyTo: d.email,
      ...adminNoticeEmail({
        subject: `Property Care consultation ${row.reference}: ${d.name}`,
        heading: 'New HagerLand Property Care lead',
        lines: [['Reference', row.reference], ['Name', d.name], ['Phone', formatPhone(d.phone)], ['Lives in', [d.city, countryName(d.country_code)].filter(Boolean).join(', ')], ['Time zone', d.time_zone ?? ''], ['Services', d.services.map((s) => CARE_SERVICE_LABEL[s]).join(', ')]],
        adminUrl: canonicalUrl(`/roodber8/property-care/${row.id}`),
      }),
    })
  }
  await recordTransferConsent({ form: 'property_care', subjectTable: 'property_care_requests', subjectId: row.id, subjectReference: row.reference })
  return ok({ reference: row.reference })
}
