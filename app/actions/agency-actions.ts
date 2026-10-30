'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getUser } from '@/lib/auth'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { getClientIp, hashIp } from '@/lib/security'
import { rateLimit } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { checkbox, emailSchema, nameSchema, optionalEmailSchema, optionalText, optionalUuid, phoneSchema, intFromForm } from '@/lib/validation/common'
import { isEthiopianLocation } from '@/lib/data/reference'
import { getAgencyAvailability } from '@/lib/data/pillars'
import { getAgencyListing, logActivity, upsertContact } from '@/lib/agency-server'
import { hagerlandInbox } from '@/lib/enquiries'
import { sendEmail } from '@/lib/email/send'
import { adminNoticeEmail } from '@/lib/email/templates'
import { applicationReceivedEmail, offerReceivedEmail, valuationReceivedEmail, viewingRequestedEmail } from '@/lib/email/agency'
import { canonicalUrl } from '@/lib/site'
import { formatETB, formatPhone } from '@/lib/format'
import { PROPERTY_TYPES, type PropertyType } from '@/lib/labels'
import { log } from '@/lib/log'
import { spamCheckDrop } from '@/lib/spam-check'

export type AgencyState = ActionResult<{ reference: string }> | null

/** Rate limit + Turnstile shared by every agency form. Returns an error message or null. */
async function guard(kind: string, formData: FormData): Promise<{ error: string | null; ipHash: string }> {
  const ip = getClientIp(await headers())
  const ipHash = hashIp(ip)
  if (!(await rateLimit(`agency:${kind}:${ipHash}`, 8, 3600)).allowed) return { error: 'You have sent several requests recently. Please wait a while and try again.', ipHash }
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, ip))) return { error: 'Please complete the security check and try again.', ipHash }
  return { error: null, ipHash }
}

async function notifyTeam(subject: string, heading: string, lines: [string, string][], adminPath: string, replyTo: string | null) {
  const to = Array.from(new Set([await hagerlandInbox('sales'), process.env.ADMIN_DIGEST_EMAIL].filter((x): x is string => Boolean(x))))
  if (to.length) await sendEmail({ to, ...(replyTo ? { replyTo } : {}), ...adminNoticeEmail({ subject, heading, lines, adminUrl: canonicalUrl(adminPath) }) })
}

const valuationSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    purpose: z.enum(['sale', 'rent'], { error: 'Tell us whether you want to sell or let' }),
    property_type: z.enum(PROPERTY_TYPES.map((t) => t.value) as [PropertyType, ...PropertyType[]], { error: 'Choose the type of property' }),
    location_id: optionalUuid,
    address_line: optionalText(300, 'Address'),
    details: optionalText(2000, 'Details'),
    preferred_times: optionalText(300, 'Preferred times'),
    time_zone: optionalText(60),
    marketing_consent: checkbox,
  })
  .refine((d) => d.location_id || d.address_line, { message: 'Tell us where the property is', path: ['location_id'] })

/** "Book a valuation" with HagerLand's estate agency (spec 26.5): a contact, a lead instruction and a valuation request. */
export async function requestValuationAction(_prev: AgencyState, formData: FormData): Promise<AgencyState> {
  if (await spamCheckDrop(formData, 'request_valuation')) return ok({ reference: 'HLVA-0' })
  const parsed = valuationSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  const agency = await getAgencyAvailability()
  if (d.purpose === 'sale' ? !agency.sales : !agency.lettings) return fail('Valuations are not available at the moment. Please contact us.')
  if (d.location_id && !(await isEthiopianLocation(d.location_id))) return fail('We value property in Ethiopia.', { location_id: 'Choose a place in Ethiopia' })
  const g = await guard('valuation', formData)
  if (g.error) return fail(g.error)
  const user = await getUser()
  const contactId = await upsertContact({ name: d.name, email: d.email, phone: d.phone, role: d.purpose === 'sale' ? 'vendor' : 'landlord', userId: user?.id ?? null, timeZone: d.time_zone ?? null, consent: d.marketing_consent, consentSource: 'valuation request' })
  const db = getAdminSupabase()
  const typeLabel = PROPERTY_TYPES.find((t) => t.value === d.property_type)?.label ?? 'Property'
  const { data: ins } = await db
    .from('agency_instructions')
    .insert({ contact_id: contactId, purpose: d.purpose, title: `${typeLabel} ${d.purpose === 'sale' ? 'to sell' : 'to let'}${d.address_line ? `: ${d.address_line}` : ''}`.slice(0, 160), location_id: d.location_id ?? null, address_line: d.address_line ?? null, property_type: d.property_type, source: 'valuation_request' })
    .select('id, reference')
    .single()
  const { data: row, error } = await db
    .from('agency_valuations')
    .insert({
      instruction_id: ins?.id ?? null,
      contact_id: contactId,
      user_id: user?.id ?? null,
      purpose: d.purpose,
      property_type: d.property_type,
      location_id: d.location_id ?? null,
      address_line: d.address_line ?? null,
      details: d.details ?? null,
      preferred_times: d.preferred_times ?? null,
      time_zone: d.time_zone ?? null,
      ip_hash: g.ipHash,
    })
    .select('id, reference')
    .single()
  if (error || !row) {
    log.error('agency', 'valuation insert failed', error)
    return fail('We could not send your request. Please try again.')
  }
  await logActivity('valuation', row.id, 'created', 'Valuation requested on the website.', 'website')
  if (ins) await logActivity('instruction', ins.id, 'created', `Lead from valuation request ${row.reference}.`, 'website')
  await sendEmail({ to: d.email, ...valuationReceivedEmail({ name: d.name.split(' ')[0] || d.name, reference: row.reference, preferredTimes: d.preferred_times ?? null }) })
  await notifyTeam(`Valuation request ${row.reference}: ${d.name}`, 'New valuation request', [['Reference', row.reference], ['Name', d.name], ['Phone', formatPhone(d.phone)], ['For', d.purpose === 'sale' ? 'Sale' : 'Letting'], ['Property', typeLabel], ['Preferred times', d.preferred_times ?? ''], ['Time zone', d.time_zone ?? '']], `/roodber8/agency/valuations/${row.id}`, d.email)
  return ok({ reference: row.reference })
}

const viewingSchema = z.object({
  property_id: z.uuid(),
  name: nameSchema,
  email: optionalEmailSchema,
  phone: phoneSchema,
  mode: z.enum(['in_person', 'video'], { error: 'Choose in person or video call' }),
  preferred_times: textRequired(300, 'Tell us when suits you'),
  time_zone: optionalText(60),
  message: optionalText(2000, 'Message'),
  marketing_consent: checkbox,
})

function textRequired(max: number, message: string) {
  return z.string().trim().min(2, message).max(max, `Use ${max} characters or fewer`)
}

/** "Book a viewing" on a listing HagerLand markets (spec 26.5). */
export async function bookViewingAction(_prev: AgencyState, formData: FormData): Promise<AgencyState> {
  if (await spamCheckDrop(formData, 'book_viewing')) return ok({ reference: 'HLVW-0' })
  const parsed = viewingSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  const listing = await getAgencyListing(d.property_id)
  if (!listing) return fail('Viewings for this property are arranged through the enquiry form.')
  const g = await guard('viewing', formData)
  if (g.error) return fail(g.error)
  const user = await getUser()
  const contactId = await upsertContact({ name: d.name, email: d.email ?? null, phone: d.phone, role: listing.purpose === 'sale' ? 'buyer' : 'tenant', userId: user?.id ?? null, timeZone: d.time_zone ?? null, consent: d.marketing_consent, consentSource: 'viewing request' })
  const { data: row, error } = await getAdminSupabase()
    .from('agency_viewings')
    .insert({ property_id: listing.id, instruction_id: listing.instructionId, contact_id: contactId, user_id: user?.id ?? null, name: d.name, email: d.email ?? null, phone: d.phone, mode: d.mode, preferred_times: d.preferred_times, time_zone: d.time_zone ?? null, message: d.message ?? null, ip_hash: g.ipHash })
    .select('id, reference')
    .single()
  if (error || !row) {
    log.error('agency', 'viewing insert failed', error)
    return fail('We could not send your request. Please try again.')
  }
  await logActivity('viewing', row.id, 'created', 'Viewing requested on the website.', 'website')
  const mode = d.mode === 'video' ? 'Video call' : 'In person'
  if (d.email) await sendEmail({ to: d.email, ...viewingRequestedEmail({ name: d.name.split(' ')[0] || d.name, reference: row.reference, property: listing.title, mode }) })
  await notifyTeam(`Viewing request ${row.reference}: ${listing.title}`, 'New viewing request', [['Reference', row.reference], ['Property', listing.title], ['Name', d.name], ['Phone', formatPhone(d.phone)], ['How', mode], ['Preferred times', d.preferred_times], ['Time zone', d.time_zone ?? '']], `/roodber8/agency/viewings/${row.id}`, d.email ?? null)
  return ok({ reference: row.reference })
}

const offerSchema = z.object({
  property_id: z.uuid(),
  name: nameSchema,
  email: optionalEmailSchema,
  phone: phoneSchema,
  amount_etb: intFromForm({ min: 1, max: 1_000_000_000_000 }).refine((v) => v !== undefined && v > 0, 'Enter your offer in birr'),
  conditions: optionalText(2000, 'Conditions'),
  funding_note: optionalText(1000, 'How you will pay'),
  understood: checkbox.refine((v) => v, 'Please confirm you understand an offer is not binding'),
  marketing_consent: checkbox,
})

/** "Make an offer" on a sale HagerLand markets: a non-binding expression of interest (spec 26.5). */
export async function makeOfferAction(_prev: AgencyState, formData: FormData): Promise<AgencyState> {
  if (await spamCheckDrop(formData, 'make_offer')) return ok({ reference: 'HLOF-0' })
  const parsed = offerSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  const listing = await getAgencyListing(d.property_id)
  if (!listing || listing.purpose !== 'sale') return fail('Offers on this property are made through the enquiry form.')
  const g = await guard('offer', formData)
  if (g.error) return fail(g.error)
  const user = await getUser()
  const amount = d.amount_etb as number
  const contactId = await upsertContact({ name: d.name, email: d.email ?? null, phone: d.phone, role: 'buyer', userId: user?.id ?? null, consent: d.marketing_consent, consentSource: 'offer' })
  const { data: row, error } = await getAdminSupabase()
    .from('agency_offers')
    .insert({ property_id: listing.id, instruction_id: listing.instructionId, contact_id: contactId, user_id: user?.id ?? null, name: d.name, email: d.email ?? null, phone: d.phone, amount_etb: amount, conditions: d.conditions ?? null, funding_note: d.funding_note ?? null, ip_hash: g.ipHash })
    .select('id, reference')
    .single()
  if (error || !row) {
    log.error('agency', 'offer insert failed', error)
    return fail('We could not send your offer. Please try again.')
  }
  await logActivity('offer', row.id, 'created', `Offer of ${formatETB(amount)} made on the website.`, 'website')
  if (d.email) await sendEmail({ to: d.email, ...offerReceivedEmail({ name: d.name.split(' ')[0] || d.name, reference: row.reference, property: listing.title, amount }) })
  await notifyTeam(`Offer ${row.reference}: ${formatETB(amount)} on ${listing.title}`, 'New offer', [['Reference', row.reference], ['Property', listing.title], ['Offer', formatETB(amount)], ['Name', d.name], ['Phone', formatPhone(d.phone)], ['Funding', d.funding_note ?? ''], ['Conditions', d.conditions ?? '']], `/roodber8/agency/offers/${row.id}`, d.email ?? null)
  return ok({ reference: row.reference })
}

const applySchema = z.object({
  property_id: z.uuid(),
  upload_id: optionalUuid,
  files: z.array(z.string().max(300)).max(5).default([]),
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  move_in_date: z.preprocess((v) => (v === '' ? undefined : v), z.iso.date('Choose a date').optional()),
  occupants: intFromForm({ min: 1, max: 30 }),
  employment_note: optionalText(1000, 'Work'),
  income_note: optionalText(1000, 'Income'),
  message: optionalText(2000, 'Message'),
  marketing_consent: checkbox,
})

/** "Apply to rent" on a let HagerLand markets (spec 26.5): details, optional private documents, referencing in admin. */
export async function applyToRentAction(_prev: AgencyState, formData: FormData): Promise<AgencyState> {
  if (await spamCheckDrop(formData, 'apply_to_rent')) return ok({ reference: 'HLRA-0' })
  const parsed = applySchema.safeParse({ ...Object.fromEntries(formData), files: formData.getAll('files') })
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  if (d.files.some((f) => !d.upload_id || !f.startsWith(`docs/application/${d.upload_id}/`))) return fail('Please upload your documents again.')
  const listing = await getAgencyListing(d.property_id)
  if (!listing || listing.purpose !== 'rent') return fail('Applications for this property are made through the enquiry form.')
  const g = await guard('apply', formData)
  if (g.error) return fail(g.error)
  const user = await getUser()
  const contactId = await upsertContact({ name: d.name, email: d.email, phone: d.phone, role: 'tenant', userId: user?.id ?? null, consent: d.marketing_consent, consentSource: 'rental application' })
  const { data: row, error } = await getAdminSupabase()
    .from('rental_applications')
    .insert({ property_id: listing.id, instruction_id: listing.instructionId, contact_id: contactId, user_id: user?.id ?? null, name: d.name, email: d.email, phone: d.phone, move_in_date: d.move_in_date ?? null, occupants: d.occupants ?? null, employment_note: d.employment_note ?? null, income_note: d.income_note ?? null, message: d.message ?? null, document_paths: d.files, ip_hash: g.ipHash })
    .select('id, reference')
    .single()
  if (error || !row) {
    log.error('agency', 'application insert failed', error)
    return fail('We could not send your application. Please try again.')
  }
  await logActivity('application', row.id, 'created', `Application made on the website${d.files.length ? ` with ${d.files.length} document${d.files.length === 1 ? '' : 's'}` : ''}.`, 'website')
  await sendEmail({ to: d.email, ...applicationReceivedEmail({ name: d.name.split(' ')[0] || d.name, reference: row.reference, property: listing.title }) })
  await notifyTeam(`Rental application ${row.reference}: ${listing.title}`, 'New application to rent', [['Reference', row.reference], ['Property', listing.title], ['Name', d.name], ['Phone', formatPhone(d.phone)], ['Move in', d.move_in_date ?? ''], ['Occupants', d.occupants ? String(d.occupants) : '']], `/roodber8/agency/applications/${row.id}`, d.email)
  return ok({ reference: row.reference })
}
