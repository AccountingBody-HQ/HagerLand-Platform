'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { optionalText } from '@/lib/validation/common'
import { CURRENCIES } from '@/lib/countries'
import { GUEST_LINK_DAYS } from '@/lib/service-requests/labels'
import { newRequestToken } from '@/lib/service-requests/token'
import { hagerlandInbox } from '@/lib/enquiries'
import { sendEmail } from '@/lib/email/send'
import { adminNoticeEmail, serviceQuoteReceivedEmail } from '@/lib/email/templates'
import { canonicalUrl } from '@/lib/site'
import { formatMoney } from '@/lib/format'
import { log } from '@/lib/log'

type Msg = ActionResult<{ message: string }>

/** When every provider has declined, the request goes back to HagerLand's queue and admins are told (spec 25.4). */
async function checkAllDeclined(requestId: string): Promise<void> {
  const db = getAdminSupabase()
  const { data: matches } = await db.from('service_request_matches').select('status').eq('request_id', requestId)
  const open = (matches ?? []).some((m) => ['offered', 'accepted', 'quoted', 'won'].includes(m.status))
  if (open) return
  const { data: r } = await db.from('service_requests').update({ status: 'triaged', admin_alerted_at: new Date().toISOString() }).eq('id', requestId).in('status', ['matched']).select('id, reference, title').maybeSingle()
  if (!r) return
  const to = Array.from(new Set([await hagerlandInbox('general'), process.env.ADMIN_DIGEST_EMAIL].filter((x): x is string => Boolean(x))))
  if (to.length) {
    await sendEmail({ to, ...adminNoticeEmail({ subject: `All providers declined ${r.reference}`, heading: 'Every provider declined this request: match it again or tell the customer', lines: [['Reference', r.reference], ['Request', r.title]], adminUrl: canonicalUrl(`/roodber8/service-requests/${r.id}`) }) })
  }
}

/** Accept or decline a request HagerLand sent to your business. Accepting shows the customer's contact details. */
export async function respondToMatchAction(matchId: string, decision: 'accept' | 'decline', reason?: string): Promise<Msg> {
  await requireUser('/account/requests')
  const parsed = z.object({ id: z.uuid(), decision: z.enum(['accept', 'decline']), reason: z.string().trim().max(300).optional() }).safeParse({ id: matchId, decision, reason })
  if (!parsed.success) return fail('Something went wrong. Please refresh the page.')
  const supabase = getServerSupabase()
  const { data: m, error } = await supabase
    .from('service_request_matches')
    .update({ status: parsed.data.decision === 'accept' ? 'accepted' : 'declined', responded_at: new Date().toISOString(), declined_reason: parsed.data.decision === 'decline' ? parsed.data.reason || null : null })
    .eq('id', parsed.data.id)
    .eq('status', 'offered')
    .select('id, request_id')
    .maybeSingle()
  if (error || !m) return fail('This request is no longer waiting for an answer.')
  if (parsed.data.decision === 'decline') await checkAllDeclined(m.request_id)
  revalidatePath('/account/requests', 'layout')
  return ok({ message: parsed.data.decision === 'accept' ? 'Accepted. Contact the customer and send your quote.' : 'Declined. Thank you for letting us know.' })
}

const quoteSchema = z.object({
  match_id: z.uuid(),
  amount: z.preprocess((v) => (typeof v === 'string' ? v.replace(/[,\s]/g, '') : v), z.coerce.number({ error: 'Enter the quote amount' }).positive('Enter the quote amount').max(1e12)),
  currency: z.enum(CURRENCIES),
  message: optionalText(2000, 'Message'),
  valid_until: z.preprocess((v) => (v === '' ? undefined : v), z.iso.date().optional()),
  document_path: z.preprocess((v) => (v === '' ? undefined : v), z.string().max(300).optional()),
})

/** Send (or update) your quote. The customer sees it on their request page and gets an email. */
export async function submitMatchQuoteAction(_prev: Msg | null, formData: FormData): Promise<Msg> {
  await requireUser('/account/requests')
  const parsed = quoteSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  const today = new Date().toISOString().slice(0, 10)
  if (d.valid_until && d.valid_until < today) return fail('The "valid until" date is in the past.', { valid_until: 'Choose today or a later date' })
  if (d.document_path && !d.document_path.startsWith(`docs/match/${d.match_id}/`)) return fail('Please upload the document again.')
  const supabase = getServerSupabase()
  const { data: m, error } = await supabase
    .from('service_request_matches')
    .update({ status: 'quoted', quote_amount_minor: Math.round(d.amount * 100), quote_currency: d.currency, quote_message: d.message ?? null, quote_valid_until: d.valid_until ?? null, quoted_at: new Date().toISOString(), ...(d.document_path ? { quote_document_path: d.document_path } : {}) })
    .eq('id', d.match_id)
    .in('status', ['accepted', 'quoted'])
    .select('id, request_id, org_id')
    .maybeSingle()
  if (error || !m) {
    if (error) log.error('match-quote', 'update failed', error)
    return fail('You can send a quote once you have accepted the request.')
  }
  const db = getAdminSupabase()
  const { data: r } = await db.from('service_requests').update({ status: 'quoted' }).eq('id', m.request_id).in('status', ['submitted', 'triaged', 'matched', 'quoted']).select('id, reference, name, email, requester_user_id').maybeSingle()
  const { data: org } = await db.from('organisations').select('name').eq('id', m.org_id).maybeSingle()
  if (r?.email) {
    let link = canonicalUrl(`/account/service-requests/${r.id}`)
    if (!r.requester_user_id) {
      // Only a hash of guest links is stored, so each quote email carries a fresh link (older links stop working).
      const t = newRequestToken()
      await db.from('service_requests').update({ access_token_hash: t.hash, access_token_expires_at: t.expiresAt }).eq('id', r.id)
      link = canonicalUrl(`/requests/${t.token}`)
    }
    await sendEmail({ to: r.email, ...serviceQuoteReceivedEmail({ name: r.name.split(' ')[0] || r.name, reference: r.reference, providerName: org?.name ?? 'A provider', amount: formatMoney(d.amount, d.currency, { decimals: Number.isInteger(d.amount) ? 0 : 2 }), link }) })
  }
  revalidatePath('/account/requests', 'layout')
  return ok({ message: `Quote sent. The customer has been emailed${r?.requester_user_id ? '' : ` a link that works for ${GUEST_LINK_DAYS} days`}.` })
}
