'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getUser } from '@/lib/auth'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { getClientIp, hashIp } from '@/lib/security'
import { rateLimit } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { checkbox, emailSchema, nameSchema, optionalPhoneSchema, optionalText, optionalUrl } from '@/lib/validation/common'
import { COUNTRY_CODES, countryByCode } from '@/lib/countries'
import { VERTICAL_KEYS, verticalHref } from '@/lib/verticals'
import { getVertical } from '@/lib/data/verticals'
import { getPillar } from '@/lib/data/pillars'
import { PILLAR_INTEREST_VERTICAL, PILLAR_KEYS, pillarHref } from '@/lib/pillars'
import { COMING_SOON, type PartnerType } from '@/lib/content/verticals'
import { sendEmail } from '@/lib/email/send'
import { interestConfirmationEmail, partnerApplicationEmail } from '@/lib/email/templates'
import { canonicalUrl } from '@/lib/site'
import { parseUtm } from '@/lib/utm'
import { log } from '@/lib/log'
import { spamCheckDrop } from '@/lib/spam-check'
import { transferConsentMissing } from '@/lib/data-transfer'
import { recordTransferConsent } from '@/lib/data-transfer-server'

export type InterestState = ActionResult<{ reference: string }> | null

const interestSchema = z.object({
  vertical_key: z.enum(VERTICAL_KEYS),
  pillar_key: z.enum(PILLAR_KEYS).optional(),
  category: optionalText(80),
  audience: optionalText(40),
  name: nameSchema,
  email: emailSchema,
  phone: optionalPhoneSchema,
  country_code: z.enum(COUNTRY_CODES, { error: 'Choose your country' }),
  city: optionalText(120, 'City'),
  message: optionalText(2000, 'Message'),
  marketing_consent: checkbox,
  source_url: optionalText(500),
  utm: z.string().max(600).optional(),
})

/** "Register your interest" on a vertical's page (spec 24.2). Stored for admin, confirmation emailed. */
export async function submitInterestAction(_prev: InterestState, formData: FormData): Promise<InterestState> {
  if (await spamCheckDrop(formData, 'submit_interest')) return ok({ reference: 'HLI-0' })
  const noConsent = transferConsentMissing(formData)
  if (noConsent) return noConsent
  const parsed = interestSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data

  const vertical = await getVertical(d.vertical_key)
  // On a pillar hub, the pillar's Interest switch decides (spec 26.3); elsewhere the vertical's form switch does.
  const pillar = d.pillar_key ? await getPillar(d.pillar_key) : null
  if (d.pillar_key && (!pillar || !pillar.interest || PILLAR_INTEREST_VERTICAL[d.pillar_key] !== d.vertical_key)) return fail('Registering interest is not open for this service.')
  if (!vertical || (!pillar && !vertical.interestEnabled)) return fail('Registering interest is not open for this service.')
  const content = COMING_SOON[d.vertical_key]
  if (d.category && content.categories && !content.categories.some((c) => c.value === d.category)) return fail('Choose one of the listed options.', { category: 'Choose one of the listed options' })
  if (d.audience && content.audiences && !content.audiences.some((a) => a.value === d.audience)) return fail('Choose one of the listed options.', { audience: 'Choose one of the listed options' })

  const ip = getClientIp(await headers())
  const ipHash = hashIp(ip)
  if (!(await rateLimit(`interest:${ipHash}`, 10, 3600)).allowed) return fail('You have sent several registrations recently. Please wait a while and try again.')
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, ip))) return fail('Please complete the security check and try again.')

  const user = await getUser()
  const country = countryByCode(d.country_code)
  const { data: row, error } = await getAdminSupabase()
    .from('interest_registrations')
    .insert({
      vertical_key: d.vertical_key,
      pillar_key: d.pillar_key ?? null,
      category: d.category ? (content.categories?.find((c) => c.value === d.category)?.label ?? d.category) : null,
      audience: d.audience ?? null,
      name: d.name,
      email: d.email,
      phone: d.phone ?? null,
      country_code: d.country_code,
      city: d.city ?? null,
      currency: country?.currency ?? 'ETB',
      message: d.message ?? null,
      marketing_consent: d.marketing_consent,
      consent_at: d.marketing_consent ? new Date().toISOString() : null,
      user_id: user?.id ?? null,
      source_url: d.source_url ?? null,
      utm: parseUtm(d.utm),
      ip_hash: ipHash,
    })
    .select('reference')
    .single()
  if (error || !row) {
    log.error('interest', 'insert failed', error)
    return fail('We could not save your registration. Please try again.')
  }
  await sendEmail({
    to: d.email,
    ...interestConfirmationEmail({ name: d.name.split(' ')[0] || d.name, reference: row.reference, verticalName: pillar?.name ?? vertical.name, href: canonicalUrl(pillar ? pillarHref(pillar) : verticalHref(vertical)), live: (pillar?.status ?? vertical.status) === 'live' }),
  })
  await recordTransferConsent({ form: 'register_interest', subjectTable: 'interest_registrations', subjectId: null, subjectReference: row.reference })
  return ok({ reference: row.reference })
}

const partnerSchema = z.object({
  vertical_key: z.enum(VERTICAL_KEYS),
  partner_type: z.enum(['bank', 'lender', 'insurer', 'broker', 'microfinance', 'recruiter', 'other'], { error: 'Choose the type of organisation' }),
  organisation_name: z.string().trim().min(2, 'Enter the organisation name').max(160),
  contact_name: nameSchema,
  email: emailSchema,
  phone: optionalPhoneSchema,
  country_code: z.enum(COUNTRY_CODES, { error: 'Choose a country' }),
  website: optionalUrl,
  licence_details: optionalText(500, 'Licence details'),
  message: optionalText(2000, 'Message'),
  source_url: optionalText(500),
})

/** "Become a partner" for banks, lenders, insurers and brokers (spec 24.2, 24.8). */
export async function submitPartnerAction(_prev: InterestState, formData: FormData): Promise<InterestState> {
  if (await spamCheckDrop(formData, 'submit_partner')) return ok({ reference: 'HLP-0' })
  const noConsent = transferConsentMissing(formData)
  if (noConsent) return noConsent
  const parsed = partnerSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data

  const vertical = await getVertical(d.vertical_key)
  const allowed: PartnerType[] = COMING_SOON[d.vertical_key].partner?.types ?? []
  if (!vertical || !vertical.partnerSignupEnabled || !allowed.includes(d.partner_type)) return fail('Partner applications are not open for this service.')

  const ip = getClientIp(await headers())
  const ipHash = hashIp(ip)
  if (!(await rateLimit(`partner:${ipHash}`, 5, 3600)).allowed) return fail('You have sent several applications recently. Please wait a while and try again.')
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, ip))) return fail('Please complete the security check and try again.')

  const { data: row, error } = await getAdminSupabase()
    .from('partner_applications')
    .insert({
      vertical_key: d.vertical_key,
      partner_type: d.partner_type,
      organisation_name: d.organisation_name,
      contact_name: d.contact_name,
      email: d.email,
      phone: d.phone ?? null,
      country_code: d.country_code,
      website: d.website ?? null,
      licence_details: d.licence_details ?? null,
      message: d.message ?? null,
      source_url: d.source_url ?? null,
      ip_hash: ipHash,
    })
    .select('reference')
    .single()
  if (error || !row) {
    log.error('partner', 'insert failed', error)
    return fail('We could not send your application. Please try again.')
  }
  await sendEmail({ to: d.email, ...partnerApplicationEmail({ name: d.contact_name.split(' ')[0] || d.contact_name, organisation: d.organisation_name, reference: row.reference, verticalName: vertical.name }) })
  await recordTransferConsent({ form: 'become_partner', subjectTable: 'partner_applications', subjectId: null, subjectReference: row.reference })
  return ok({ reference: row.reference })
}
