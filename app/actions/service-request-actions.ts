'use server'

import { revalidatePath } from 'next/cache'
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
import { PAY_OFFERED_MAX, STAFFING_SLUG, askedQuestions, detailsWithPay, requestFormCopy } from '@/lib/service-requests/form-copy'
import { GUEST_LINK_DAYS, URGENCY_LABEL, isQuoteExpired } from '@/lib/service-requests/labels'
import { hashRequestToken, isWellFormedToken, linkDaysLeft, newRequestToken } from '@/lib/service-requests/token'
import { EMPLOYER_ABROAD_TEXT, employerAbroadAnswers, employerAbroadLines, parseEmployerAbroad } from '@/lib/service-requests/employer-abroad'
import { hagerlandInbox, orgManagerEmails } from '@/lib/enquiries'
import { sendEmail } from '@/lib/email/send'
import { adminNoticeEmail, providerChosenEmail, serviceRequestLinkEmail, serviceRequestReceivedEmail } from '@/lib/email/templates'
import { canonicalUrl } from '@/lib/site'
import { formatPhone } from '@/lib/format'
import { parseUtm } from '@/lib/utm'
import { log } from '@/lib/log'
import { getJobsI18n } from '@/lib/i18n/server'
import { adminActor, audit, isOwnerOrOperationsSession } from '@/lib/admin/guard'
import { linkCallbackToRequest } from '@/lib/callbacks-data'
import { translateResult } from '@/lib/i18n/translate'

export type RequestState = ActionResult<{ reference: string }> | null

const schema = z
  .object({
    category_slug: z.string().max(80),
    title: textSchema(160, { min: 3, label: 'Title' }),
    details: textSchema(4000, { min: 10, label: 'Details' }),
    urgency: z.enum(['emergency', 'within_week', 'flexible'], { error: 'Choose how soon you need it' }),
    budget_band: optionalText(60),
    pay_offered: optionalText(PAY_OFFERED_MAX, 'Pay offered'),
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
async function submitServiceRequestActionImpl(_prev: RequestState, formData: FormData): Promise<RequestState> {
  if (isHoneypotFilled(formData)) return ok({ reference: 'HLS-0' })
  const raw: Record<string, unknown> = Object.fromEntries(formData)
  for (const k of Array.from(new Set(Array.from(formData.keys())))) if (k.startsWith('q_')) raw[k] = formData.getAll(k)
  const parsed = schema.safeParse({ ...raw, files: formData.getAll('files') })
  const category = await getRequestableCategory(String(formData.get('category_slug') ?? ''))
  if (!category) return fail('This service is not available to request right now.')
  const copy = requestFormCopy(category.slug)
  const questions = askedQuestions(category.slug, category.questions)
  const { answers: asked, errors: questionErrors } = validateAnswers(questions, raw)
  // Staffing only: "Are you based outside Ethiopia?" (saved with the answers; Jobs Phase 3).
  const abroad = copy.employerAbroad ? parseEmployerAbroad(raw) : { value: null, errors: {} }
  const answers = abroad.value ? { ...asked, ...employerAbroadAnswers(abroad.value) } : asked
  const answerErrors = { ...questionErrors, ...abroad.errors }
  if (!parsed.success) {
    const bad = invalid(parsed.error)
    return { ...bad, fieldErrors: { ...bad.fieldErrors, ...answerErrors } }
  }
  if (Object.keys(answerErrors).length) return fail('Please answer the highlighted questions.', answerErrors)
  const d = parsed.data
  const pay = copy.pay ? d.pay_offered : undefined
  const details = detailsWithPay(d.details, pay)
  if (details.length > 4000) return fail('Please shorten your description.', { details: 'Please shorten your description' })
  if (d.urgency === 'emergency' && !category.allowsEmergency) return fail('Emergency requests are not available for this service.', { urgency: 'Choose another option' })
  if (d.files.some((f) => !d.upload_id || !f.startsWith(`docs/request/${d.upload_id}/`))) return fail('Please upload your files again.')

  const ip = getClientIp(await headers())
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
      details,
      answers,
      urgency: d.urgency,
      budget_band: copy.budget ? d.budget_band ?? null : null,
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
  await sendEmail({ to: d.email, ...serviceRequestReceivedEmail({ name: d.name.split(' ')[0] || d.name, reference: row.reference, title: d.title, link: viewUrl, emergency: d.urgency === 'emergency', linkDays: link ? GUEST_LINK_DAYS : 0, nextStep: copy.nextStep, preheader: copy.customer?.receivedPreheader, extraLine: abroad.value?.abroad ? EMPLOYER_ABROAD_TEXT.confirmation : null }) })
  const inbox = await hagerlandInbox('general')
  const admins = Array.from(new Set([inbox, process.env.ADMIN_DIGEST_EMAIL].filter((x): x is string => Boolean(x))))
  if (admins.length) {
    await sendEmail({
      to: admins,
      replyTo: d.email,
      ...adminNoticeEmail({
        subject: `${d.urgency === 'emergency' ? 'EMERGENCY ' : ''}Service request ${row.reference}: ${category.name}`,
        heading: d.urgency === 'emergency' ? 'Emergency service request: please match it now' : 'New service request to match',
        lines: [['Reference', row.reference], ['Service', category.name], ['How soon', URGENCY_LABEL[d.urgency] ?? d.urgency], ['Title', d.title], ['Name', d.name], ['Phone', formatPhone(d.phone)], ...answerLines(questions, answers), ...employerAbroadLines(answers), ...(pay ? [['Pay offered', pay] as [string, string]] : [])],
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
  const ip = getClientIp(await headers())
  if (!(await rateLimit(`srlink:${hashIp(ip)}`, 5, 3600)).allowed) return fail('Too many attempts. Please wait an hour and try again.')
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, ip))) return fail('Please complete the security check and try again.')
  const db = getAdminSupabase()
  const { data: r } = await db.from('service_requests').select('id, reference, name, email, requester_user_id, category:service_categories(slug)').eq('reference', parsed.data.reference).maybeSingle()
  if (r && r.email && r.email.toLowerCase() === parsed.data.email) {
    const custom = requestFormCopy(r.category?.slug ?? '').customer
    const wording = (days: number) => ({ preheader: custom?.linkPreheader, body: custom?.linkBody(r.reference, days) })
    // Guests and signed-in customers both get a fresh private link; the email states its real lifetime (it used to say
    // "0 days" to signed-in customers, whose account page link had no expiry at all).
    const link = newRequestToken()
    await db.from('service_requests').update({ access_token_hash: link.hash, access_token_expires_at: link.expiresAt }).eq('id', r.id)
    const days = linkDaysLeft(link.expiresAt)
    await sendEmail({ to: r.email, ...serviceRequestLinkEmail({ name: r.name.split(' ')[0] || r.name, reference: r.reference, link: canonicalUrl(`/requests/${link.token}`), linkDays: days, ...wording(days) }) })
  }
  return ok({ message: 'If the details match a request, we have emailed a new link. Check your inbox and spam folder.' })
}

const reviewSchema = ownerSchema.extend({
  rating: z.coerce.number().int().min(1, 'Choose a rating from 1 to 5').max(5, 'Choose a rating from 1 to 5'),
  body: z.string().trim().min(20, 'Write at least 20 characters about the job').max(2000, 'Use 2,000 characters or fewer'),
})

/**
 * A verified review (spec 26.12): only the customer of a request that reached "won" can review the provider they
 * chose, once per job. Reviews wait for HagerLand to moderate them before they are published.
 */
export async function submitReviewAction(input: { request_id: string; token?: string; rating: number | string; body: string }): Promise<ActionResult<{ message: string }>> {
  const parsed = reviewSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check your review.')
  const r = await loadOwned({ requestId: parsed.data.request_id, token: parsed.data.token })
  if (!r) return fail('This link has expired. Ask for a new one below.')
  if (r.status !== 'won') return fail('You can review a provider once you have chosen them for the job.')
  const db = getAdminSupabase()
  const { data: m } = await db.from('service_request_matches').select('id, org_id').eq('request_id', r.id).eq('status', 'won').maybeSingle()
  if (!m) return fail('You can review a provider once you have chosen them for the job.')
  const { data: req } = await db.from('service_requests').select('name, requester_user_id').eq('id', r.id).maybeSingle()
  const { error } = await db.from('reviews').insert({ org_id: m.org_id, request_id: r.id, match_id: m.id, author_user_id: req?.requester_user_id ?? null, author_name: req?.name ?? 'Customer', rating: parsed.data.rating, body: parsed.data.body })
  if (error) return fail(error.code === '23505' ? 'You have already reviewed this job.' : 'We could not save your review. Please try again.')
  const to = Array.from(new Set([await hagerlandInbox('general'), process.env.ADMIN_DIGEST_EMAIL].filter((x): x is string => Boolean(x))))
  if (to.length) await sendEmail({ to, ...adminNoticeEmail({ subject: `Review to moderate (${r.reference})`, heading: 'A customer reviewed a provider', lines: [['Request', r.reference], ['Rating', `${parsed.data.rating} of 5`]], adminUrl: canonicalUrl('/roodber8/reviews') }) })
  return ok({ message: 'Thank you. Your review will appear once our team has checked it.' })
}

// Jobs Phase 5: the messages in the visitor's language (Amharic for Jobs: only native-reviewed text; English unchanged).
export async function submitServiceRequestAction(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const result = await submitServiceRequestActionImpl(_prev, formData)
  if (formData.get('category_slug') !== STAFFING_SLUG) return result
  // A staffing request staff sent for a call-back (Jobs Phase 5): close the call-back and link the request.
  const callbackId = String(formData.get('callback_id') ?? '')
  if (result?.ok && /^[0-9a-f-]{36}$/.test(callbackId) && (await isOwnerOrOperationsSession())) {
    const actor = await adminActor()
    if (await linkCallbackToRequest(callbackId, result.data.reference, actor)) revalidatePath('/roodber8/jobs/callbacks')
    await audit('callback.staffing_request', { type: 'callback', id: callbackId }, { reference: result.data.reference })
  }
  return translateResult(result, (await getJobsI18n()).t)
}
