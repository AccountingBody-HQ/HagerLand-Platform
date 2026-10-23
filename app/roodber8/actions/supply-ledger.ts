'use server'

/** Admin area these actions belong to: owner only (no staff role has it, blueprint 13.3). */
const AREA = '/roodber8/supply/ledger'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, assertOwner, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { parsePriceEtb } from '@/lib/supply/offers'
import { todayInAddis } from '@/lib/supply/shortlist'

type Msg = ActionResult<{ message: string }>
const blank = (v: unknown) => (v === null || (typeof v === 'string' && v.trim() === '') ? undefined : v)

const manualSchema = z
  .object({
    type: z.enum(['service_fee', 'adjustment']),
    direction: z.enum(['in', 'out']),
    amount: z.string().max(30),
    date: z.iso.date({ error: 'Enter the date' }),
    method: z.preprocess(blank, z.enum(['bank_transfer', 'telebirr', 'cbe_birr', 'cash', 'card', 'other']).optional()),
    reference: z.preprocess(blank, z.string().trim().max(120).optional()),
    orderReference: z.preprocess(blank, z.string().trim().toUpperCase().regex(/^HLO-\d{4}-\d{6}$/, 'Order references look like HLO-2026-000001').optional()),
    reason: z.preprocess(blank, z.string().trim().max(500).optional()),
    note: z.preprocess(blank, z.string().trim().max(1000).optional()),
  })
  .refine((d) => d.type !== 'adjustment' || (d.reason?.length ?? 0) >= 3, { message: 'Say why the adjustment is needed.', path: ['reason'] })
export type ManualEntryInput = z.input<typeof manualSchema>

/** A service fee, or an adjustment with a reason. Optionally linked to an order. */
export async function addManualEntryAction(input: ManualEntryInput): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const parsed = manualSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the entry.')
  const d = parsed.data
  const amount = parsePriceEtb(d.amount)
  if (amount === null) return fail('Enter the amount in birr, like 2500 or 2,500.50.')
  if (d.date > todayInAddis()) return fail('The date cannot be in the future.')
  const db = getAdminSupabase()
  let order: { id: string; org_id: string; quote_request_id: string } | null = null
  if (d.orderReference) {
    const { data } = await db.from('supply_orders').select('id, org_id, quote_request_id').eq('reference', d.orderReference).maybeSingle()
    if (!data) return fail(`No order ${d.orderReference}.`)
    order = data
  }
  const { data, error } = await db
    .from('supply_ledger_entries')
    .insert({ entry_type: d.type, direction: d.type === 'service_fee' ? 'in' : d.direction, amount_cents: amount, occurred_on: d.date, method: d.method ?? null, reference: d.reference ?? null, order_id: order?.id ?? null, org_id: order?.org_id ?? null, quote_request_id: order?.quote_request_id ?? null, reason: d.reason ?? null, note: d.note ?? null, created_by: (await adminActor()).slice(0, 120) })
    .select('id')
    .single()
  if (error || !data) return fail('Could not record the entry.')
  await audit('supply.ledger.entry', { type: 'supply_ledger', id: data.id, label: d.orderReference ?? d.type }, { entry_type: d.type, amount_cents: amount })
  revalidatePath('/roodber8/supply/ledger')
  if (order) revalidatePath(`/roodber8/supply/orders/${order.id}`)
  return ok({ message: 'Recorded in the ledger.' })
}

/** Corrects a mistake: adds the opposite entry, linked to the original, with a reason. Each entry can be reversed once. */
export async function reverseEntryAction(entryId: string, reason: string): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const why = reason.trim().slice(0, 500)
  if (!z.uuid().safeParse(entryId).success) return fail('Entry not found.')
  if (why.length < 3) return fail('Say why this entry is being reversed.')
  const db = getAdminSupabase()
  const { data: original } = await db.from('supply_ledger_entries').select('id, entry_type, direction, amount_cents, order_id, org_id, quote_request_id').eq('id', entryId).maybeSingle()
  if (!original) return fail('Entry not found.')
  if (original.entry_type === 'reversal') return fail('A reversal cannot be reversed. Add a new entry instead.')
  const direction = original.direction === 'in' ? 'out' : original.direction === 'out' ? 'in' : 'receivable'
  const { data, error } = await db
    .from('supply_ledger_entries')
    .insert({ entry_type: 'reversal', direction, amount_cents: original.amount_cents, occurred_on: todayInAddis(), order_id: original.order_id, org_id: original.org_id, quote_request_id: original.quote_request_id, reverses_entry_id: original.id, reason: why, created_by: (await adminActor()).slice(0, 120) })
    .select('id')
    .single()
  if (error?.code === '23505') return fail('This entry has already been reversed.')
  if (error || !data) return fail('Could not reverse the entry.')
  await audit('supply.ledger.reverse', { type: 'supply_ledger', id: data.id }, { reverses: original.id, amount_cents: original.amount_cents, reason: why })
  revalidatePath('/roodber8/supply/ledger')
  if (original.order_id) revalidatePath(`/roodber8/supply/orders/${original.order_id}`)
  return ok({ message: 'Entry reversed.' })
}
