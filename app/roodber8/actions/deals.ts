'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit, changedFields } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { CURRENCIES } from '@/lib/countries'

const money = z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(String(v).replace(/[,\s]/g, ''))), z.number().min(0).max(1e12).nullable())
const schema = z.object({
  id: z.preprocess((v) => (v === '' ? undefined : v), z.uuid().optional()),
  source_reference: z.string().trim().toUpperCase().max(20).optional(),
  title: z.string().trim().min(2, 'Give the deal a title.').max(200),
  currency: z.enum(CURRENCIES),
  value: money,
  commission: money,
  lead_fee: money,
  status: z.enum(['open', 'won', 'lost', 'invoiced', 'paid']),
  notes: z.string().trim().max(4000).optional(),
})

const PREFIX: Record<string, { table: 'enquiries' | 'service_requests' | 'quote_requests'; type: 'enquiry' | 'service_request' | 'quote_request' }> = {
  HLE: { table: 'enquiries', type: 'enquiry' },
  HLS: { table: 'service_requests', type: 'service_request' },
  HLQ: { table: 'quote_requests', type: 'quote_request' },
}

/** Adds or edits a deal in the commission ledger (spec 25.2k). A reference (HLE-, HLS-, HLQ-) links it to its lead. */
export async function saveDealAction(input: Record<string, string>): Promise<ActionResult<{ message: string }>> {
  assertAdmin()
  const parsed = schema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the fields.')
  const d = parsed.data
  const db = getAdminSupabase()
  let source: { source_type: 'enquiry' | 'service_request' | 'quote_request' | 'manual'; source_id: string | null } = { source_type: 'manual', source_id: null }
  if (d.source_reference) {
    const link = PREFIX[d.source_reference.slice(0, 3)]
    if (!link) return fail('Use a reference starting HLE-, HLS- or HLQ-, or leave it empty.')
    const { data: row } = await db.from(link.table).select('id').eq('reference', d.source_reference).maybeSingle()
    if (!row) return fail(`No ${link.type.replace('_', ' ')} with reference ${d.source_reference}.`)
    source = { source_type: link.type, source_id: row.id }
  }
  const closed = ['won', 'lost', 'invoiced', 'paid'].includes(d.status)
  const values = {
    title: d.title,
    currency: d.currency,
    value_minor: d.value === null ? null : Math.round(d.value * 100),
    commission_minor: d.commission === null ? null : Math.round(d.commission * 100),
    lead_fee_minor: d.lead_fee === null ? null : Math.round(d.lead_fee * 100),
    status: d.status,
    notes: d.notes || null,
  }
  if (!d.id) {
    const { data, error } = await db.from('deals').insert({ ...values, ...source, closed_at: closed ? new Date().toISOString() : null }).select('id, reference').single()
    if (error || !data) return fail('Could not save the deal.')
    await audit('deal.create', { type: 'deal', id: data.id, label: data.reference }, values)
    revalidatePath('/roodber8/deals')
    return ok({ message: `Added ${data.reference}.` })
  }
  const { data: before } = await db.from('deals').select('reference, title, currency, value_minor, commission_minor, lead_fee_minor, status, notes, closed_at').eq('id', d.id).maybeSingle()
  if (!before) return fail('Not found.')
  const update = { ...values, closed_at: closed ? before.closed_at ?? new Date().toISOString() : null }
  const { error } = await db.from('deals').update(update).eq('id', d.id)
  if (error) return fail('Could not save the deal.')
  await audit('deal.update', { type: 'deal', id: d.id, label: before.reference }, changedFields(before, update))
  revalidatePath('/roodber8/deals')
  return ok({ message: 'Saved.' })
}
