'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit, changedFields } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { MAX_MATCHES, URGENCY_LABEL } from '@/lib/service-requests/labels'
import { validateQuestionJson } from '@/lib/service-requests/questions'
import { orgManagerEmails } from '@/lib/enquiries'
import { sendEmail } from '@/lib/email/send'
import { providerOfferedEmail, serviceNoProviderEmail } from '@/lib/email/templates'
import { canonicalUrl } from '@/lib/site'
import { revalidateReference } from '@/lib/revalidate'
import { VERTICAL_KEYS } from '@/lib/verticals'
import type { Json } from '@/lib/database.types'

type Msg = ActionResult<{ message: string }>

const STATUSES = ['submitted', 'triaged', 'matched', 'quoted', 'won', 'lost', 'cancelled'] as const
const REASONS = ['customer_cancelled', 'no_provider', 'all_declined', 'chose_other', 'duplicate', 'spam', 'completed', 'other'] as const

function refresh(id?: string) {
  revalidatePath('/roodber8/service-requests')
  if (id) revalidatePath(`/roodber8/service-requests/${id}`)
}

export async function setRequestStatusAction(id: string, status: string, reason?: string): Promise<Msg> {
  assertAdmin()
  const parsed = z.object({ id: z.uuid(), status: z.enum(STATUSES), reason: z.enum(REASONS).optional() }).safeParse({ id, status, reason: reason || undefined })
  if (!parsed.success) return fail('Invalid status.')
  const closing = ['won', 'lost', 'cancelled'].includes(parsed.data.status)
  if (closing && !parsed.data.reason && parsed.data.status !== 'won') return fail('Choose a reason for closing the request.')
  const db = getAdminSupabase()
  const { data: before } = await db.from('service_requests').select('reference, status, closed_reason').eq('id', id).maybeSingle()
  if (!before) return fail('Not found.')
  const now = new Date().toISOString()
  const update = {
    status: parsed.data.status,
    closed_reason: closing ? parsed.data.reason ?? 'completed' : null,
    closed_at: closing ? now : null,
    ...(parsed.data.status === 'triaged' ? { triaged_at: now } : {}),
  }
  const { error } = await db.from('service_requests').update(update).eq('id', id)
  if (error) return fail('Could not change the status.')
  if (closing && parsed.data.status !== 'won') await db.from('service_request_matches').update({ status: 'withdrawn' }).eq('request_id', id).in('status', ['offered', 'accepted'])
  await audit('service_request.status', { type: 'service_request', id, label: before.reference }, changedFields(before, update))
  refresh(id)
  return ok({ message: `Marked as ${parsed.data.status}.` })
}

export async function saveRequestNotesAction(id: string, notes: string): Promise<Msg> {
  assertAdmin()
  const parsed = z.object({ id: z.uuid(), notes: z.string().trim().max(4000) }).safeParse({ id, notes })
  if (!parsed.success) return fail('Notes are too long.')
  const { error } = await getAdminSupabase().from('service_requests').update({ admin_notes: parsed.data.notes || null }).eq('id', id)
  if (error) return fail('Could not save.')
  await audit('service_request.notes', { type: 'service_request', id })
  refresh(id)
  return ok({ message: 'Saved.' })
}

/**
 * Sends the request to up to three providers (spec 24.5). Each provider's owners and admins get an email
 * with a link to the request in their account. Results report every provider, including failures.
 */
export async function matchProvidersAction(id: string, orgIds: string[]): Promise<Msg> {
  assertAdmin()
  const parsed = z.object({ id: z.uuid(), orgIds: z.array(z.uuid()).min(1, 'Choose at least one provider.').max(MAX_MATCHES) }).safeParse({ id, orgIds })
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Choose providers.')
  const db = getAdminSupabase()
  const { data: r } = await db.from('service_requests').select('id, reference, title, status, urgency, service_category_id, location_id, location_text').eq('id', id).maybeSingle()
  if (!r) return fail('Not found.')
  if (['won', 'lost', 'cancelled'].includes(r.status)) return fail('This request is closed.')
  const { data: existing } = await db.from('service_request_matches').select('org_id, status').eq('request_id', id)
  const active = (existing ?? []).filter((m) => !['declined', 'withdrawn'].includes(m.status))
  const already = new Set((existing ?? []).map((m) => m.org_id))
  const fresh = Array.from(new Set(parsed.data.orgIds)).filter((o) => !already.has(o))
  if (fresh.length === 0) return fail('Those providers already have this request.')
  if (active.length + fresh.length > MAX_MATCHES) return fail(`A request can go to at most ${MAX_MATCHES} providers at a time (${active.length} already).`)
  const { data: orgs } = await db.from('organisations').select('id, name, status').in('id', fresh)
  const live = (orgs ?? []).filter((o) => o.status === 'published')
  if (live.length !== fresh.length) return fail('Only published businesses can receive requests.')
  const { error } = await db.from('service_request_matches').insert(live.map((o) => ({ request_id: id, org_id: o.id })))
  if (error) return fail('Could not send the request.')
  await db.from('service_requests').update({ status: 'matched', matched_at: new Date().toISOString(), triaged_at: r.status === 'submitted' ? new Date().toISOString() : undefined }).eq('id', id).in('status', ['submitted', 'triaged', 'matched'])
  const [{ data: cat }, { data: loc }, { data: matches }] = await Promise.all([
    r.service_category_id ? db.from('service_categories').select('name').eq('id', r.service_category_id).maybeSingle() : Promise.resolve({ data: null }),
    r.location_id ? db.from('locations').select('display_name').eq('id', r.location_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from('service_request_matches').select('id, org_id').eq('request_id', id).in('org_id', live.map((o) => o.id)),
  ])
  const results: string[] = []
  for (const o of live) {
    const matchId = (matches ?? []).find((m) => m.org_id === o.id)?.id
    const to = await orgManagerEmails(o.id)
    const sent = to.length
      ? await sendEmail({ to, ...providerOfferedEmail({ orgName: o.name, reference: r.reference, title: r.title, serviceName: cat?.name ?? null, place: loc?.display_name ?? r.location_text, urgency: URGENCY_LABEL[r.urgency] ?? r.urgency, url: canonicalUrl(`/account/requests/${matchId}`) }) })
      : false
    results.push(`${o.name}: ${sent ? 'emailed' : to.length ? 'email failed' : 'no account to email (call them)'}`)
  }
  await audit('service_request.match', { type: 'service_request', id, label: r.reference }, { providers: live.map((o) => o.name) })
  refresh(id)
  return ok({ message: `Sent to ${live.length} provider${live.length === 1 ? '' : 's'}. ${results.join('; ')}.` })
}

export async function withdrawMatchAction(matchId: string): Promise<Msg> {
  assertAdmin()
  if (!z.uuid().safeParse(matchId).success) return fail('Invalid.')
  const db = getAdminSupabase()
  const { data: m } = await db.from('service_request_matches').update({ status: 'withdrawn' }).eq('id', matchId).in('status', ['offered', 'accepted', 'quoted']).select('request_id').maybeSingle()
  if (!m) return fail('This match can no longer be withdrawn.')
  await audit('service_request.withdraw', { type: 'service_request_match', id: matchId })
  refresh(m.request_id)
  return ok({ message: 'Withdrawn.' })
}

const money = z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(String(v).replace(/[,\s]/g, ''))), z.number().min(0).max(1e12).nullable())

/** Lead fee, commission and invoicing for one match: HagerLand-only figures (spec 24.5, 25.2k). */
export async function saveMatchCommercialAction(matchId: string, input: { lead_fee: string; commission_rate: string; commission: string; invoiced: boolean }): Promise<Msg> {
  assertAdmin()
  const parsed = z
    .object({ id: z.uuid(), lead_fee: money, commission_rate: money.refine((v) => v === null || v <= 100, 'Commission rate is a percentage up to 100.'), commission: money, invoiced: z.boolean() })
    .safeParse({ id: matchId, ...input })
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the figures.')
  const d = parsed.data
  const db = getAdminSupabase()
  const { data: before } = await db.from('service_request_matches').select('request_id, lead_fee_minor, commission_rate, commission_minor, invoiced, quote_amount_minor').eq('id', matchId).maybeSingle()
  if (!before) return fail('Not found.')
  const commission = d.commission ?? (d.commission_rate !== null && before.quote_amount_minor !== null ? (before.quote_amount_minor / 100) * (d.commission_rate / 100) : null)
  const update = {
    lead_fee_minor: d.lead_fee === null ? null : Math.round(d.lead_fee * 100),
    commission_rate: d.commission_rate,
    commission_minor: commission === null ? null : Math.round(commission * 100),
    invoiced: d.invoiced,
    invoiced_at: d.invoiced && !before.invoiced ? new Date().toISOString() : d.invoiced ? undefined : null,
  }
  const { error } = await db.from('service_request_matches').update(update).eq('id', matchId)
  if (error) return fail('Could not save.')
  await audit('service_request.commercial', { type: 'service_request_match', id: matchId }, changedFields(before, update))
  refresh(before.request_id)
  return ok({ message: 'Saved.' })
}

/** No suitable provider: the customer is told politely and the request is closed (spec 25.4). */
export async function noProviderAction(id: string): Promise<Msg> {
  assertAdmin()
  if (!z.uuid().safeParse(id).success) return fail('Invalid.')
  const db = getAdminSupabase()
  const { data: r } = await db.from('service_requests').update({ status: 'cancelled', closed_reason: 'no_provider', closed_at: new Date().toISOString() }).eq('id', id).in('status', ['submitted', 'triaged', 'matched']).select('reference, title, name, email').maybeSingle()
  if (!r) return fail('This request is already closed or has quotes.')
  await db.from('service_request_matches').update({ status: 'withdrawn' }).eq('request_id', id).in('status', ['offered', 'accepted'])
  const emailed = r.email ? await sendEmail({ to: r.email, ...serviceNoProviderEmail({ name: r.name.split(' ')[0] || r.name, reference: r.reference, title: r.title }) }) : false
  await audit('service_request.no_provider', { type: 'service_request', id, label: r.reference }, { emailed })
  refresh(id)
  return ok({ message: emailed ? 'Closed and the customer was emailed.' : 'Closed. The email could not be sent: please call the customer.' })
}

/** Question schema, emergency option and vertical for one service category (spec 24.5, 24.12). */
export async function saveRequestSettingsAction(categoryId: string, input: { questions: string; allows_emergency: boolean; vertical_key: string }): Promise<Msg> {
  assertAdmin()
  const parsed = z.object({ id: z.uuid(), allows_emergency: z.boolean(), vertical_key: z.enum(VERTICAL_KEYS) }).safeParse({ id: categoryId, ...input })
  if (!parsed.success) return fail('Check the fields.')
  const q = validateQuestionJson(input.questions.trim() || '[]')
  if (!q.ok) return fail(q.error)
  const db = getAdminSupabase()
  const { data: before } = await db.from('service_categories').select('name, question_schema, allows_emergency, vertical_key').eq('id', categoryId).maybeSingle()
  if (!before) return fail('Not found.')
  const update = { question_schema: q.questions as unknown as Json[], allows_emergency: parsed.data.allows_emergency, vertical_key: parsed.data.vertical_key }
  const { error } = await db.from('service_categories').update(update).eq('id', categoryId)
  if (error) return fail('Could not save.')
  await audit('service_category.questions', { type: 'service_category', id: categoryId, label: before.name }, changedFields(before, update))
  revalidateReference()
  revalidatePath('/roodber8/request-questions')
  return ok({ message: `Saved ${q.questions.length} question${q.questions.length === 1 ? '' : 's'}.` })
}
