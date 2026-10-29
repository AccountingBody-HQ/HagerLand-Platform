'use server'

/** Admin area these actions belong to: the owner only (no staff role has it; every action also calls assertOwner()). */
const AREA = '/roodber8/supply/settlements'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, assertOwner, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { STALE_EDIT } from '@/lib/concurrency'
import { parsePriceEtb } from '@/lib/supply/offers'
import { todayInAddis } from '@/lib/supply/shortlist'
import { SETTLEMENT_STATUS_LABEL, type SettlementStatus } from '@/lib/supply/settlements'

type Msg = ActionResult<{ message: string }>

function refresh(id?: string) {
  revalidatePath('/roodber8/supply/settlements')
  if (id) revalidatePath(`/roodber8/supply/settlements/${id}`)
  revalidatePath('/roodber8/supply/ledger')
  revalidatePath('/roodber8/reports/supply-settlements')
}

/** The database refuses what the rules forbid (0050 guards) with a plain message. */
function dbError(error: { code?: string; message: string } | null, fallback: string): Msg {
  if (error?.code === '23505') return fail('One of these orders is already in a settlement. Reload the page.')
  return fail(error?.code === '23514' || error?.code === '22023' ? error.message : fallback)
}

const createSchema = z.object({
  from: z.iso.date({ error: 'Enter the start of the period' }),
  to: z.iso.date({ error: 'Enter the end of the period' }),
  orderIds: z.array(z.uuid()).min(1, 'Choose at least one order').max(500),
  upfrontReasons: z.record(z.uuid(), z.string().trim().max(500)),
})

/**
 * Owner: a draft settlement for one partner: the chosen orders (amounts worked out by the database) and every adjustment
 * waiting for the partner. Nothing is paid or sent to anyone.
 */
export async function createSettlementAction(orgId: string, input: z.input<typeof createSchema>): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const parsed = createSchema.safeParse(input)
  if (!z.uuid().safeParse(orgId).success || !parsed.success) return fail(parsed.success ? 'Partner not found.' : parsed.error.issues[0]?.message ?? 'Check the settlement.')
  const d = parsed.data
  if (d.to < d.from) return fail('The period ends before it starts.')
  const { data, error } = await getAdminSupabase()
    .rpc('partner_settlement_create', { p_org: orgId, p_from: d.from, p_to: d.to, p_orders: d.orderIds, p_upfront_reasons: d.upfrontReasons, p_actor: (await adminActor()).slice(0, 120) })
    .single()
  const row = data as { id: string; reference: string } | null
  if (error || !row) return dbError(error, 'Could not create the settlement.')
  await audit('supply.settlement.create', { type: 'partner_settlement', id: row.id, label: row.reference }, { org: orgId, orders: d.orderIds.length })
  refresh(row.id)
  redirect(`/roodber8/supply/settlements/${row.id}?created=1`)
}

async function loadSettlement(id: string) {
  if (!z.uuid().safeParse(id).success) return null
  const { data } = await getAdminSupabase().from('partner_settlements').select('id, reference, status, updated_at').eq('id', id).maybeSingle()
  return data
}

/** Owner: approve a draft (its total must equal its items; at least one order; above zero). */
export async function approveSettlementAction(id: string, expectedUpdatedAt: string): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const s = await loadSettlement(id)
  if (!s) return fail('Settlement not found.')
  if (expectedUpdatedAt && new Date(s.updated_at).getTime() !== new Date(expectedUpdatedAt).getTime()) return fail(STALE_EDIT)
  const { data, error } = await getAdminSupabase()
    .from('partner_settlements')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: (await adminActor()).slice(0, 120) })
    .eq('id', id)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle()
  if (error) return dbError(error, 'Could not approve.')
  if (!data) return fail(STALE_EDIT)
  await audit('supply.settlement.approve', { type: 'partner_settlement', id, label: s.reference })
  refresh(id)
  return ok({ message: 'Approved. Record the payment when you have paid the partner.' })
}

const paySchema = z.object({
  date: z.iso.date({ error: 'Enter the date' }),
  method: z.enum(['bank_transfer', 'telebirr', 'cbe_birr', 'cash', 'card', 'other']),
  reference: z.string().trim().min(1, 'Enter the bank or transfer reference').max(120),
})

/** Owner: record that the partner was paid. One step writes the ledger entries and marks it paid; a second tap is refused. */
export async function paySettlementAction(id: string, input: z.input<typeof paySchema>): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const s = await loadSettlement(id)
  if (!s) return fail('Settlement not found.')
  const parsed = paySchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the payment.')
  if (parsed.data.date > todayInAddis()) return fail('The date cannot be in the future.')
  const { data: total, error } = await getAdminSupabase().rpc('partner_settlement_pay', {
    p_settlement: id,
    p_paid_on: parsed.data.date,
    p_method: parsed.data.method,
    p_reference: parsed.data.reference,
    p_actor: (await adminActor()).slice(0, 120),
  })
  if (error) return dbError(error, 'Could not record the payment.')
  await audit('supply.settlement.pay', { type: 'partner_settlement', id, label: s.reference }, { total_cents: total, method: parsed.data.method })
  refresh(id)
  return ok({ message: 'Paid. The payment is in the supply ledger.' })
}

/** Owner: void a draft or approved settlement (its orders can be settled again; adjustments go back to waiting). */
export async function voidSettlementAction(id: string, reason: string): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const why = reason.trim().slice(0, 500)
  if (why.length < 3) return fail('Give a reason (a few words).')
  const s = await loadSettlement(id)
  if (!s) return fail('Settlement not found.')
  if (!['draft', 'approved'].includes(s.status)) return fail(`A settlement that is “${SETTLEMENT_STATUS_LABEL[s.status as SettlementStatus]}” cannot be voided.`)
  const { data, error } = await getAdminSupabase().from('partner_settlements').update({ status: 'void', void_reason: why }).eq('id', id).eq('status', s.status).select('id').maybeSingle()
  if (error) return dbError(error, 'Could not void.')
  if (!data) return fail(STALE_EDIT)
  await audit('supply.settlement.void', { type: 'partner_settlement', id, label: s.reference }, { reason: why })
  refresh(id)
  return ok({ message: 'Voided.' })
}

const adjustmentSchema = z.object({
  amount: z.string().max(30),
  owed: z.enum(['partner_owes', 'hagerland_owes']),
  reason: z.string().trim().min(3, 'Give a reason (a few words).').max(500),
  orderReference: z.string().trim().max(40),
})

/** Owner: an adjustment waiting for the partner's next settlement (for example after a customer refund or a short delivery). */
export async function addAdjustmentAction(orgId: string, input: z.input<typeof adjustmentSchema>): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const parsed = adjustmentSchema.safeParse(input)
  if (!z.uuid().safeParse(orgId).success || !parsed.success) return fail(parsed.success ? 'Partner not found.' : parsed.error.issues[0]?.message ?? 'Check the adjustment.')
  const cents = parsePriceEtb(parsed.data.amount)
  if (cents === null) return fail('Enter the amount in birr, like 1250 or 1,250.50.')
  const db = getAdminSupabase()
  let orderId: string | null = null
  if (parsed.data.orderReference) {
    const { data: o } = await db.from('supply_orders').select('id, org_id').eq('reference', parsed.data.orderReference).maybeSingle()
    if (!o || o.org_id !== orgId) return fail('No supply order of this partner has that reference.')
    orderId = o.id
  }
  const { data, error } = await db
    .from('partner_settlement_items')
    .insert({ settlement_id: null, org_id: orgId, supply_order_id: orderId, kind: 'adjustment', amount_cents: parsed.data.owed === 'partner_owes' ? -cents : cents, reason: parsed.data.reason, created_by: (await adminActor()).slice(0, 120) })
    .select('id')
    .single()
  if (error || !data) return dbError(error, 'Could not save the adjustment.')
  await audit('supply.settlement.adjustment', { type: 'partner_settlement_item', id: data.id, label: parsed.data.reason }, { org: orgId, amount_cents: parsed.data.owed === 'partner_owes' ? -cents : cents })
  refresh()
  return ok({ message: 'Adjustment added. It goes into the partner’s next settlement.' })
}

/** Owner: change a waiting adjustment (the amount the partner repays after a refund, for example). */
export async function updateAdjustmentAction(itemId: string, input: z.input<typeof adjustmentSchema>): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const parsed = adjustmentSchema.safeParse(input)
  if (!z.uuid().safeParse(itemId).success || !parsed.success) return fail(parsed.success ? 'Adjustment not found.' : parsed.error.issues[0]?.message ?? 'Check the adjustment.')
  const cents = parsePriceEtb(parsed.data.amount)
  if (cents === null) return fail('Enter the amount in birr, like 1250 or 1,250.50.')
  const amount = parsed.data.owed === 'partner_owes' ? -cents : cents
  const { data, error } = await getAdminSupabase().from('partner_settlement_items').update({ amount_cents: amount, reason: parsed.data.reason }).eq('id', itemId).eq('kind', 'adjustment').is('settlement_id', null).select('id').maybeSingle()
  if (error) return dbError(error, 'Could not save the adjustment.')
  if (!data) return fail('This adjustment is already in a settlement.')
  await audit('supply.settlement.adjustment', { type: 'partner_settlement_item', id: itemId, label: parsed.data.reason }, { amount_cents: amount })
  refresh()
  return ok({ message: 'Adjustment saved.' })
}

/** Owner: remove a waiting adjustment the partner does not owe after all (recorded in the audit log). */
export async function removeAdjustmentAction(itemId: string, reason: string): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const why = reason.trim().slice(0, 500)
  if (why.length < 3) return fail('Give a reason (a few words).')
  if (!z.uuid().safeParse(itemId).success) return fail('Adjustment not found.')
  const { data, error } = await getAdminSupabase().from('partner_settlement_items').delete().eq('id', itemId).eq('kind', 'adjustment').is('settlement_id', null).select('id, amount_cents, org_id').maybeSingle()
  if (error) return dbError(error, 'Could not remove the adjustment.')
  if (!data) return fail('This adjustment is already in a settlement.')
  await audit('supply.settlement.adjustment_removed', { type: 'partner_settlement_item', id: itemId, label: why }, { org: data.org_id, amount_cents: data.amount_cents })
  refresh()
  return ok({ message: 'Adjustment removed.' })
}
