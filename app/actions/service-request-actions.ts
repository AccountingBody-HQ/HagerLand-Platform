'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getUser } from '@/lib/auth'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { getClientIp, hashIp } from '@/lib/security'
import { rateLimit } from '@/lib/rate-limit'
import { isHoneypotFilled, verifyTurnstileToken } from '@/lib/turnstile'
import { emailSchema, nameSchema, optionalText, optionalUuid, phoneSchema, preferredContactSchema, textSchema } from '@/lib/validation/common'
import { COUNTRY_CODES } from '@/lib/countries'
import { getRequestableCategory } from '@/lib/data/service-requests'
import { answerLines, validateAnswers } from '@/lib/service-requests/questions'
import { GUEST_LINK_DAYS, URGENCY_LABEL, isQuoteExpired } from '@/lib/service-requests/labels'
import { hashRequestToken, isWellFormedToken, newRequestToken } from '@/lib/service-requests/token'
import { hagerlandInbox, orgManagerEmails } from '@/lib/enquiries'
import { sendEmail } from '@/lib/email/send'
import { adminNoticeEmail, providerChosenEmail, serviceRequestLinkEmail, serviceRequestReceivedEmail } from '@/lib/email/templates'
import { canonicalUrl } from '@/lib/site'
import { formatPhone } from '@/lib/format'
import { parseUtm } from '@/lib/utm'
import { log } from '@/lib/log'

export type RequestState = ActionResult<{ reference: string }> | null

const schema = z
  .object({
    category_slug: z.string().max(80),
    title: textSchema(160, { min: 3, label: 'Title' }),
    details: textSchema(4000, { min: 10, label: 'Details' }),
    urgency: z.enum(['emergency', 'within_week', 'flexible'], { error: 'Choose how soon you need it' }),
    budget_band: optionalText(60),
    location_id: optionalUuid,
    location_text: optionalText(200, 'Place'),
    country_code: z.enum(COUNTRY_CODES).default('ET'),
    name: nameSchema,
    phone: phoneSchema,
    email: emailSchema,
    preferred_contact: preferredContactSchema,
    files: z.array(z.string().max(300)).max(5),
    upload_id: optionalUuid,
    source_url: optionalText(500),
    utm: z.string().max(600).optional(),
  })
  .refine((d) => d.location_id || d.location_text, { message: 'Tell us where the work is', path: ['location_id'] })

/** "Request a service" (spec 24.5): validates, stores, emails the customer a link, tells HagerLand. */
export async function submitServiceRequestAction(_prev: RequestState, formData: FormData): Promise<RequestState> {
  if (isHoneypotFilled(formData)) return ok({ reference: 'HLS-0' })
  const raw: Record<string, unknown> = Object.fromEntries(formData)
  for (const k of Array.from(new Set(Array.from(formData.keys())))) if (k.startsWith('q_')) raw[k] = formData.getAll(k)
  const parsed = schema.safeParse({ ...raw, files: formData.getAll('files') })
  const category = await getRequestableCategory(String(formData.get('category_slug') ?? ''))
  if (!category) return fail('This service is not available to request right now.')
  const { answers, errors: answerErrors } = validateAnswers(category.questions, raw)
  if (!parsed.success) {
    const bad = invalid(parsed.error)
    return { ...bad, fieldErrors: { ...bad.fieldErrors, ...answerErrors } }
  }
  if (Object.keys(answerErrors).length) return fail('Please answer the highlighted questions.', answerErrors)
  const d = parsed.data
  if (d.urgency === 'emergency' && !category.allowsEmergency) return fail('Emergency requests are not available for this service.', { urgency: 'Choose another option' })
  if (d.files.some((f) => !d.upload_id || !f.startsWith(`docs/request/${d.upload_id}/`))) return fail('Please upload your files again.')

  const ip = getClientIp(headers())
  const ipHash = hashIp(ip)
  const [byIp, byPhone] = await Promise.all([rateLimit(`srequest:ip:${ipHash}`, 6, 3600), rateLimit(`srequest:phone:${d.phone}`, 10, 86_400)])
  if (!byIp.allowed || !byPhone.allowed) return fail('You have sent several requests recently. Please wait a while and try again, or contact us.')
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, ip))) return fail('Please complete the security check and try again.')

  const db = getAdminSupabase()
  if (d.location_id) {
    const { data: loc } = await db.from('locations').select('id').eq('id', d.location_id).eq('is_active', true).maybeSingle()
    if (!loc) return fail('Choose a place from the list.', { location_id: 'Choose a place from the list' })
  }
  const user = await getUser()
  const link = user ? null : newRequestToken()
  const { data: row, error } = await db
    .from('service_requests')
    .insert({
      vertical_key: category.verticalKey,
      service_category_id: category.id,
      title: d.title,
      details: d.details,
      answers,
      urgency: d.urgency,
      budget_band: d.budget_band ?? null,
      location_id: d.location_id ?? null,
      location_text: d.location_text ?? null,
      country_code: d.country_code,
      preferred_contact: d.preferred_contact ?? null,
      requester_user_id: user?.id ?? null,
      name: d.name,
      phone: d.phone,
      email: d.email,
      attachment_paths: d.files,
      access_token_hash: link?.hash ?? null,
      access_token_expires_at: link?.expiresAt ?? null,
      source_url: d.source_url ?? null,
      utm: parseUtm(d.utm),
      ip_hash: ipHash,
    })
    .select('id, reference')
    .single()
  if (error || !row) {
    log.error('service-request', 'insert failed', error)
    return fail('We could not send your request. Please try again.')
  }

  const viewUrl = link ? canonicalUrl(`/requests/${link.token}`) : canonicalUrl(`/account/service-requests/${row.id}`)
  await sendEmail({ to: d.email, ...serviceRequestReceivedEmail({ name: d.name.split(' ')[0] || d.name, reference: row.reference, title: d.title, link: viewUrl, emergency: d.urgency === 'emergency', linkDays: link ? GUEST_LINK_DAYS : 0 }) })
  const inbox = await hagerlandInbox('general')
  const admins = Array.from(new Set([inbox, process.env.ADMIN_DIGEST_EMAIL].filter((x): x is string => Boolean(x))))
  if (admins.length) {
    await sendEmail({
      to: admins,
      replyTo: d.email,
      ...adminNoticeEmail({
        subject: `${d.urgency === 'emergency' ? 'EMERGENCY ' : ''}Service request ${row.reference}: ${category.name}`,
        heading: d.urgency === 'emergency' ? 'Emergency service request: please match it now' : 'New service request to match',
        lines: [['Reference', row.reference], ['Service', category.name], ['How soon', URGENCY_LABEL[d.urgency] ?? d.urgency], ['Title', d.title], ['Name', d.name], ['Phone', formatPhone(d.phone)], ...answerLines(category.questions, answers)],
        adminUrl: canonicalUrl(`/roodber8/service-requests/${row.id}`),
      }),
    })
  }
  return ok({ reference: row.reference })
}

type Owner = { requestId: string; token?: string }

/** Loads a request the current visitor may act on: their own (signed in) or via a valid guest link. */
async function loadOwned(o: Owner) {
  const db = getAdminSupabase()
  const { data: r } = await db.from('service_requests').select('id, reference, title, status, requester_user_id, access_token_hash, access_token_expires_at').eq('id', o.requestId).maybeSingle()
  if (!r) return null
  if (o.token) {
    if (!isWellFormedToken(o.token) || r.access_token_hash !== hashRequestToken(o.token)) return null
    if (!r.access_token_expires_at || r.access_token_expires_at < new Date().toISOString()) return null
    return r
  }
  const user = await getUser()
  return user && r.requester_user_id === user.id ? r : null
}

const ownerSchema = z.object({ request_id: z.uuid(), token: z.string().max(64).optional() })

/** The customer chooses one quote: that provider is told; the others are closed; a deal is opened for HagerLand. */
export async function chooseQuoteAction(input: { request_id: string; match_id: string; token?: string }): Promise<ActionResult<{ message: string }>> {
  const parsed = ownerSchema.extend({ match_id: z.uuid() }).safeParse(input)
  if (!parsed.success) return fail('Something went wrong. Please refresh the page.')
  const r = await loadOwned({ requestId: parsed.data.request_id, token: parsed.data.token })
  if (!r) return fail('This link has expired. Ask for a new one below.')
  if (!['matched', 'quoted'].includes(r.status)) return fail('This request is closed.')
  const db = getAdminSupabase()
  const { data: m } = await db.from('service_request_matches').select('id, org_id, status, quote_amount_minor, quote_currency, quote_valid_until, lead_fee_minor, commission_minor').eq('id', parsed.data.match_id).eq('request_id', r.id).maybeSingle()
  if (!m || m.status !== 'quoted') return fail('That quote is not available.')
  if (isQuoteExpired(m.quote_valid_until)) return fail('That quote has expired. Ask the provider for an updated quote.')
  const now = new Date().toISOString()
  await db.from('service_request_matches').update({ status: 'won' }).eq('id', m.id)
  await db.from('service_request_matches').update({ status: 'lost' }).eq('request_id', r.id).neq('id', m.id).in('status', ['offered', 'accepted', 'quoted'])
  await db.from('service_requests').update({ status: 'won', closed_at: now, closed_reason: 'completed' }).eq('id', r.id)
  const { data: org } = await db.from('organisations').select('name').eq('id', m.org_id).maybeSingle()
  await db.from('deals').insert({
    source_type: 'service_request',
    source_id: r.id,
    match_id: m.id,
    org_id: m.org_id,
    title: `${r.reference}: ${r.title}`.slice(0, 200),
    currency: m.quote_currency ?? 'ETB',
    value_minor: m.quote_amount_minor,
    lead_fee_minor: m.lead_fee_minor,
    commission_minor: m.commission_minor,
    status: 'won',
    closed_at: now,
  })
  const to = await orgManagerEmails(m.org_id)
  if (to.length) await sendEmail({ to, ...providerChosenEmail({ orgName: org?.name ?? 'your business', reference: r.reference, title: r.title, url: canonicalUrl(`/account/requests/${m.id}`) }) })
  return ok({ message: `You chose ${org?.name ?? 'this provider'}. They will contact you to agree the details.` })
}

/** The customer cancels their request: open offers are withdrawn. */
export async function cancelServiceRequestAction(input: { request_id: string; token?: string }): Promise<ActionResult<{ message: string }>> {
  const parsed = ownerSchema.safeParse(input)
  if (!parsed.success) return fail('Something went wrong. Please refresh the page.')
  const r = await loadOwned({ requestId: parsed.data.request_id, token: parsed.data.token })
  if (!r) return fail('This link has expired. Ask for a new one below.')
  if (['won', 'lost', 'cancelled'].includes(r.status)) return fail('This request is already closed.')
  const db = getAdminSupabase()
  await db.from('service_requests').update({ status: 'cancelled', closed_reason: 'customer_cancelled', closed_at: new Date().toISOString() }).eq('id', r.id)
  await db.from('service_request_matches').update({ status: 'withdrawn' }).eq('request_id', r.id).in('status', ['offered', 'accepted', 'quoted'])
  return ok({ message: 'Your request is cancelled. Thank you for letting us know.' })
}

const resendSchema = z.object({ email: emailSchema, reference: z.string().trim().toUpperCase().regex(/^HLS-\d{4}-\d{6}$/, 'Enter the reference from your email, e.g. HLS-2026-000123') })

/** Sends a fresh guest link. Always answers the same way, so it never reveals whether a request exists. */
export async function resendRequestLinkAction(_prev: ActionResult<{ message: string }> | null, formData: FormData): Promise<ActionResult<{ message: string }>> {
  if (isHoneypotFilled(formData)) return ok({ message: 'If the details match a request, we have emailed a new link.' })
  const parsed = resendSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const ip = getClientIp(headers())
  if (!(await rateLimit(`srlink:${hashIp(ip)}`, 5, 3600)).allowed) return fail('Too many attempts. Please wait an hour and try again.')
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, ip))) return fail('Please complete the security check and try again.')
  const db = getAdminSupabase()
  const { data: r } = await db.from('service_requests').select('id, reference, name, email, requester_user_id').eq('reference', parsed.data.reference).maybeSingle()
  if (r && r.email && r.email.toLowerCase() === parsed.data.email) {
    if (r.requester_user_id) {
      await sendEmail({ to: r.email, ...serviceRequestLinkEmail({ name: r.name.split(' ')[0] || r.name, reference: r.reference, link: canonicalUrl(`/account/service-requests/${r.id}`), linkDays: 0 }) })
    } else {
      const link = newRequestToken()
      await db.from('service_requests').update({ access_token_hash: link.hash, access_token_expires_at: link.expiresAt }).eq('id', r.id)
      await sendEmail({ to: r.email, ...serviceRequestLinkEmail({ name: r.name.split(' ')[0] || r.name, reference: r.reference, link: canonicalUrl(`/requests/${link.token}`), linkDays: GUEST_LINK_DAYS }) })
    }
  }
  return ok({ message: 'If the details match a request, we have emailed a new link. Check your inbox and spam folder.' })
}
