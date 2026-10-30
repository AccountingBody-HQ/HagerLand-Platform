'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getUser } from '@/lib/auth'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { getClientIp, hashIp } from '@/lib/security'
import { rateLimit } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { nameSchema, optionalEmailSchema, phoneSchema, preferredContactSchema, textSchema, optionalText } from '@/lib/validation/common'
import { hagerlandInbox, INTENT_LABELS, orgManagerEmails, resolveEnquiryTarget, userEmail } from '@/lib/enquiries'
import { sendEmail } from '@/lib/email/send'
import { enquiryConfirmationEmail, newEnquiryEmail, registerInterestConfirmationEmail } from '@/lib/email/templates'
import { log } from '@/lib/log'
import { formatPhone } from '@/lib/format'
import { parseUtm } from '@/lib/utm'
import { spamCheckDrop } from '@/lib/spam-check'
import { transferConsentMissing } from '@/lib/data-transfer'
import { recordTransferConsent } from '@/lib/data-transfer-server'

const schema = z
  .object({
    target_type: z.enum(['property', 'development', 'organisation', 'product', 'hagerland_development', 'general']),
    target_id: z.preprocess((v) => (v === '' ? undefined : v), z.uuid().optional()),
    intent: z.enum(['viewing', 'more_info', 'price', 'offer', 'register_interest', 'quote', 'other']).default('more_info'),
    name: nameSchema,
    phone: phoneSchema,
    email: optionalEmailSchema,
    message: textSchema(2000, { min: 2, label: 'Message' }),
    preferred_contact: preferredContactSchema,
    budget_band: optionalText(60),
    preferred_area: optionalText(120),
    timeframe: optionalText(60),
    topic: optionalText(80),
    time_zone: optionalText(60),
    preferred_times: optionalText(300, 'Best times to call'),
    source_url: optionalText(500),
    utm: z.string().max(600).optional(),
  })
  .refine((d) => d.preferred_contact !== 'email' || d.email, { message: 'Add your email if you prefer to be contacted by email', path: ['email'] })

export type EnquiryState = ActionResult<{ reference: string }> | null

/** Unified enquiry submission (spec 12). */
export async function submitEnquiryAction(_prev: EnquiryState, formData: FormData): Promise<EnquiryState> {
  if (await spamCheckDrop(formData, 'submit_enquiry')) return ok({ reference: 'HLE-0' })
  const noConsent = transferConsentMissing(formData)
  if (noConsent) return noConsent
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  const hdrs = await headers()
  const ip = getClientIp(hdrs)
  const ipHash = hashIp(ip)

  const [byIp, byPhone] = await Promise.all([rateLimit(`enquiry:ip:${ipHash}`, 10, 3600), rateLimit(`enquiry:phone:${d.phone}`, 20, 86_400)])
  if (!byIp.allowed || !byPhone.allowed) return fail('You have sent a lot of enquiries recently. Please wait a while and try again, or call us.')
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, ip))) return fail('Please complete the security check and try again.')

  const target = await resolveEnquiryTarget(d.target_type, d.target_id ?? null)
  if (!target) return fail('This listing is no longer available.')

  const user = await getUser()
  const details = Object.fromEntries(Object.entries({ budget_band: d.budget_band, preferred_area: d.preferred_area, timeframe: d.timeframe, topic: d.topic, time_zone: d.time_zone, preferred_times: d.preferred_times }).filter(([, v]) => v))
  const db = getAdminSupabase()
  const { data: row, error } = await db
    .from('enquiries')
    .insert({
      target_type: d.target_type,
      target_id: d.target_id ?? null,
      recipient_org_id: target.recipientOrgId,
      recipient_user_id: target.recipientUserId,
      sender_user_id: user?.id ?? null,
      name: d.name,
      phone: d.phone,
      email: d.email ?? null,
      message: d.message,
      preferred_contact: d.preferred_contact ?? null,
      intent: d.intent,
      details: Object.keys(details).length ? details : null,
      source_url: d.source_url ?? null,
      utm: parseUtm(d.utm),
      ip_hash: ipHash,
      user_agent: hdrs.get('user-agent')?.slice(0, 300) ?? null,
    })
    .select('id, reference')
    .single()
  if (error || !row) {
    log.error('enquiry', 'insert failed', error)
    return fail('We could not send your enquiry. Please try again.')
  }

  if (d.target_id && ['property', 'development', 'organisation', 'hagerland_development'].includes(d.target_type)) {
    await db.rpc('increment_enquiries', { p_entity_type: d.target_type === 'hagerland_development' ? 'development' : d.target_type, p_id: d.target_id })
  }

  const recipients = target.toHagerland
    ? [await hagerlandInbox(target.inbox)].filter((x): x is string => Boolean(x))
    : target.recipientOrgId
      ? await orgManagerEmails(target.recipientOrgId)
      : target.recipientUserId
        ? [await userEmail(target.recipientUserId)].filter((x): x is string => Boolean(x))
        : []
  if (recipients.length) {
    await sendEmail({
      to: recipients,
      replyTo: d.email,
      from: target.inbox === 'supply' ? 'supply' : 'default',
      ...newEnquiryEmail({
        reference: row.reference,
        subjectLine: target.subjectLine,
        targetLabel: target.label,
        targetUrl: target.url,
        name: d.name,
        phone: formatPhone(d.phone),
        email: d.email ?? null,
        preferredContact: d.preferred_contact ?? null,
        intentLabel: INTENT_LABELS[d.intent] ?? d.intent,
        message: [d.message, ...Object.entries(details).map(([k, v]) => `${k.replace('_', ' ')}: ${v}`)].join('\n'),
      }),
    })
  }
  if (d.email) {
    await sendEmail({
      to: d.email,
      ...(d.intent === 'register_interest'
        ? registerInterestConfirmationEmail({ name: d.name, reference: row.reference, projectName: d.target_type === 'general' ? null : target.label })
        : enquiryConfirmationEmail({ name: d.name, reference: row.reference, targetLabel: target.label, recipientLabel: target.recipientName, message: d.message })),
    })
  }
  await recordTransferConsent({ form: 'enquiry', subjectTable: 'enquiries', subjectId: row.id, subjectReference: row.reference })
  return ok({ reference: row.reference })
}
