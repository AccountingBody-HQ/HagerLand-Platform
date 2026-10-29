'use server'

/** Admin area these actions belong to: owner and operations; every money step also calls assertOwner(). */
const AREA = '/roodber8/supply/order-requests'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, assertOwner, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { parsePriceEtb } from '@/lib/supply/offers'
import { todayInAddis } from '@/lib/supply/shortlist'
import { EDITABLE, reservationHours, type OrderRequestStatus } from '@/lib/supply/order-requests'
import { readPaymentDetails, sendCustomerEmail } from '@/lib/supply/order-requests-data'

type Msg = ActionResult<{ message: string }>

function refresh(id: string) {
  revalidatePath('/roodber8/supply/order-requests')
  revalidatePath(`/roodber8/supply/order-requests/${id}`)
  revalidatePath('/roodber8/supply/orders')
  revalidatePath('/roodber8/supply/ledger')
}

async function loadRequest(id: string) {
  if (!z.uuid().safeParse(id).success) return null
  const { data } = await getAdminSupabase().from('order_requests').select('id, reference, status').eq('id', id).maybeSingle()
  return data ? { ...data, status: data.status as OrderRequestStatus } : null
}

/** The database refuses what the rules forbid (0049 order_requests_guard) with a plain message. */
function dbError(error: { code?: string; message: string } | null, fallback: string): Msg {
  return fail(error?.code === '23514' || error?.code === '23505' ? error.message : fallback)
}

async function move(id: string, from: OrderRequestStatus, to: OrderRequestStatus, reason?: string) {
  return getAdminSupabase()
    .from('order_requests')
    .update({ status: to, status_reason: reason ?? null, updated_by: (await adminActor()).slice(0, 120) })
    .eq('id', id)
    .eq('status', from)
    .select('id')
    .maybeSingle()
}

/* ------------------------------------------------------- Stock (Operations and owner) ------------------------------------------------------- */

/** New request → checking stock. Reopening an ended reservation is the owner's. */
export async function startStockCheckAction(id: string): Promise<Msg> {
  await assertAdmin(AREA)
  const r = await loadRequest(id)
  if (!r) return fail('Order request not found.')
  if (r.status === 'expired') await assertOwner()
  if (!['submitted', 'expired'].includes(r.status)) return fail('This request is not waiting for a stock check.')
  const { data, error } = await move(id, r.status, 'checking_stock')
  if (error) return dbError(error, 'Could not save.')
  if (!data) return fail('Someone else changed this request. Reload the page.')
  await audit(r.status === 'expired' ? 'supply.order_request.reopen' : 'supply.order_request.check', { type: 'order_request', id, label: r.reference })
  refresh(id)
  return ok({ message: r.status === 'expired' ? 'Reopened: check stock again, then reserve.' : 'Checking stock. Record what each partner can hold.' })
}

const lineSchema = z.object({
  status: z.enum(['requested', 'confirmed', 'short', 'unavailable']),
  confirmedQty: z.string().max(20),
})

/** What a partner can supply for one item: all, part (with the quantity) or nothing. */
export async function saveLineStockAction(id: string, lineId: string, input: z.input<typeof lineSchema>): Promise<Msg> {
  await assertAdmin(AREA)
  const r = await loadRequest(id)
  if (!r || !z.uuid().safeParse(lineId).success) return fail('Order request not found.')
  if (!EDITABLE.includes(r.status)) return fail('The items of this request can no longer change.')
  const parsed = lineSchema.safeParse(input)
  if (!parsed.success) return fail('Choose what is available.')
  const db = getAdminSupabase()
  const { data: line } = await db.from('order_request_lines').select('quantity').eq('id', lineId).eq('order_request_id', id).maybeSingle()
  if (!line) return fail('Item not found.')
  const qty = parsed.data.confirmedQty.trim() ? Number(parsed.data.confirmedQty.replace(/[,\s]/g, '')) : null
  let confirmed: number | null = null
  if (parsed.data.status === 'confirmed') confirmed = Number(line.quantity)
  if (parsed.data.status === 'short') {
    if (qty === null || !Number.isFinite(qty) || qty <= 0 || qty >= Number(line.quantity)) return fail('Enter the quantity that is available (less than asked for).')
    confirmed = qty
  }
  const { error } = await db.from('order_request_lines').update({ status: parsed.data.status, confirmed_qty: confirmed }).eq('id', lineId).eq('order_request_id', id)
  if (error) return dbError(error, 'Could not save the item.')
  await audit('supply.order_request.line', { type: 'order_request', id, label: r.reference }, { line: lineId, status: parsed.data.status, confirmed_qty: confirmed })
  refresh(id)
  return ok({ message: 'Saved.' })
}

const holdSchema = z.object({
  orgId: z.uuid({ error: 'Choose the partner' }),
  qty: z.string().max(20),
  heldUntil: z.string().max(30),
  status: z.enum(['held', 'asked']),
  partnerReference: z.string().trim().max(120),
  note: z.string().trim().max(500),
})

/** A partner's hold for one item (or "asked", waiting for their answer). Only partners that supply this product. */
export async function addHoldAction(id: string, lineId: string, input: z.input<typeof holdSchema>): Promise<Msg> {
  await assertAdmin(AREA)
  const r = await loadRequest(id)
  if (!r || !z.uuid().safeParse(lineId).success) return fail('Order request not found.')
  if (!EDITABLE.includes(r.status)) return fail('Holds can only be recorded before the reservation.')
  const parsed = holdSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the hold.')
  const d = parsed.data
  const qty = Number(d.qty.replace(/[,\s]/g, ''))
  if (!Number.isFinite(qty) || qty <= 0) return fail('Enter the quantity the partner holds.')
  // The form sends Addis Ababa local time ("2026-10-31T14:30").
  let heldUntil: string | null = null
  if (d.status === 'held') {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(d.heldUntil)) return fail('Enter until when the partner holds it.')
    const at = new Date(`${d.heldUntil}:00+03:00`)
    if (Number.isNaN(at.getTime()) || at.getTime() <= Date.now()) return fail('The hold must end in the future.')
    heldUntil = at.toISOString()
  }
  const db = getAdminSupabase()
  const { data: line } = await db.from('order_request_lines').select('product_id').eq('id', lineId).eq('order_request_id', id).maybeSingle()
  if (!line) return fail('Item not found.')
  const { data: source } = await db.from('product_sources').select('id').eq('product_id', line.product_id).eq('org_id', d.orgId).eq('status', 'active').maybeSingle()
  if (!source) return fail('This partner is not an active source of this product.')
  const { error } = await db.from('stock_reservations').insert({
    order_request_line_id: lineId,
    org_id: d.orgId,
    qty,
    held_until: heldUntil,
    status: d.status,
    partner_reference: d.partnerReference || null,
    note: d.note || null,
    recorded_by: (await adminActor()).slice(0, 120),
  })
  if (error) return fail(error.code === '23505' ? 'This item already has a hold. Release it first.' : 'Could not save the hold.')
  await audit('supply.order_request.hold', { type: 'order_request', id, label: r.reference }, { line: lineId, org: d.orgId, qty, status: d.status, held_until: heldUntil })
  refresh(id)
  return ok({ message: d.status === 'held' ? 'Hold recorded.' : 'Recorded as asked.' })
}

/** Release a hold (the partner no longer holds it, or another partner will). */
export async function releaseHoldAction(id: string, holdId: string): Promise<Msg> {
  await assertAdmin(AREA)
  const r = await loadRequest(id)
  if (!r || !z.uuid().safeParse(holdId).success) return fail('Order request not found.')
  if (!EDITABLE.includes(r.status)) return fail('Holds can only change before the reservation.')
  const { data: hold } = await getAdminSupabase().from('stock_reservations').select('id, line:order_request_lines!inner(order_request_id)').eq('id', holdId).maybeSingle()
  if (!hold || (hold.line as { order_request_id: string }).order_request_id !== id) return fail('Hold not found.')
  const { error } = await getAdminSupabase().from('stock_reservations').update({ status: 'released' }).eq('id', holdId).in('status', ['held', 'asked'])
  if (error) return fail('Could not release the hold.')
  await audit('supply.order_request.release', { type: 'order_request', id, label: r.reference }, { hold: holdId })
  refresh(id)
  return ok({ message: 'Hold released.' })
}

/** Part of the order is available: the customer is told (email 3) and decides; staff record the answer. */
export async function markPartlyAvailableAction(id: string): Promise<Msg> {
  await assertAdmin(AREA)
  const r = await loadRequest(id)
  if (!r) return fail('Order request not found.')
  const { data, error } = await move(id, r.status, 'partially_reserved')
  if (error) return dbError(error, 'Could not save.')
  if (!data) return fail('Someone else changed this request. Reload the page.')
  const emailed = await sendCustomerEmail(id, 'partial')
  await audit('supply.order_request.partial', { type: 'order_request', id, label: r.reference }, { emailed })
  refresh(id)
  return ok({ message: emailed ? 'Marked part available. The customer was emailed; record their answer by reserving or cancelling.' : 'Marked part available. No email address: phone the customer.' })
}

/** Nothing is available: every item is marked unavailable and the customer is told (email 4). */
export async function markUnavailableAction(id: string): Promise<Msg> {
  await assertAdmin(AREA)
  const r = await loadRequest(id)
  if (!r) return fail('Order request not found.')
  if (!['submitted', 'checking_stock'].includes(r.status)) return fail('This request can no longer be marked not available.')
  const db = getAdminSupabase()
  const { error: linesError } = await db.from('order_request_lines').update({ status: 'unavailable', confirmed_qty: null }).eq('order_request_id', id)
  if (linesError) return dbError(linesError, 'Could not save the items.')
  const { data, error } = await move(id, r.status, 'unavailable')
  if (error) return dbError(error, 'Could not save.')
  if (!data) return fail('Someone else changed this request. Reload the page.')
  const emailed = await sendCustomerEmail(id, 'unavailable')
  await audit('supply.order_request.unavailable', { type: 'order_request', id, label: r.reference }, { emailed })
  refresh(id)
  return ok({ message: emailed ? 'Marked not available. The customer was emailed.' : 'Marked not available. No email address: phone the customer.' })
}

/** A delivered order with a problem (wrong, short, damaged). The money steps that follow are the owner's. */
export async function disputeAction(id: string, reason: string): Promise<Msg> {
  await assertAdmin(AREA)
  const why = reason.trim().slice(0, 500)
  if (why.length < 3) return fail('Give a reason (a few words).')
  const r = await loadRequest(id)
  if (!r) return fail('Order request not found.')
  const { data, error } = await move(id, r.status, 'disputed', why)
  if (error) return dbError(error, 'Could not save.')
  if (!data) return fail('Someone else changed this request. Reload the page.')
  await audit('supply.order_request.dispute', { type: 'order_request', id, label: r.reference }, { reason: why })
  refresh(id)
  return ok({ message: 'Marked disputed.' })
}

/* --------------------------------------------------------------- Money (owner) --------------------------------------------------------------- */

const reserveSchema = z.object({
  hours: z.string().max(5),
  delivery: z.string().max(30),
  prices: z.record(z.uuid(), z.string().max(30)),
})

/** Owner: customer prices, delivery charge and the reservation (default 48 hours); the customer is emailed how to pay. */
export async function reserveAction(id: string, input: z.input<typeof reserveSchema>): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const r = await loadRequest(id)
  if (!r) return fail('Order request not found.')
  const parsed = reserveSchema.safeParse(input)
  if (!parsed.success) return fail('Check the prices.')
  const hours = reservationHours(parsed.data.hours)
  if (hours === null) return fail('A reservation lasts between 1 and 168 hours.')
  const delivery = parsed.data.delivery.trim() === '' || /^0+(\.0+)?$/.test(parsed.data.delivery.trim()) ? 0 : parsePriceEtb(parsed.data.delivery)
  if (delivery === null) return fail('Enter the delivery charge in birr (0 for none).')
  const prices: { line_id: string; price_cents: number }[] = []
  for (const [lineId, text] of Object.entries(parsed.data.prices)) {
    const cents = parsePriceEtb(text)
    if (cents === null) return fail('Enter a customer price for every available item, like 850 or 850.50.')
    prices.push({ line_id: lineId, price_cents: cents })
  }
  if (!(await readPaymentDetails())) return fail('Add the payment details in Settings first: the customer needs them to pay.')
  const { data: total, error } = await getAdminSupabase().rpc('order_request_reserve', { p_request: id, p_hours: hours, p_delivery_cents: delivery, p_prices: prices, p_actor: (await adminActor()).slice(0, 120) })
  if (error) return dbError(error, 'Could not reserve.')
  const emailed = await sendCustomerEmail(id, 'reserved')
  await audit('supply.order_request.reserve', { type: 'order_request', id, label: r.reference }, { hours, delivery_cents: delivery, total_cents: total, emailed })
  refresh(id)
  return ok({ message: emailed ? 'Reserved. The customer was emailed how to pay.' : 'Reserved. No email address: phone the customer with the amount and how to pay.' })
}

const paymentSchema = z.object({
  type: z.enum(['customer_payment', 'refund']),
  amount: z.string().max(30),
  date: z.iso.date({ error: 'Enter the date' }),
  method: z.enum(['bank_transfer', 'telebirr', 'cbe_birr', 'cash', 'card', 'other']),
  reference: z.string().trim().max(120),
  note: z.string().trim().max(1000),
})

/**
 * Owner: a payment from the customer, or a refund to them. A payment that covers the total before the reservation
 * ends makes the request "paid" (the database decides). A payment after the end is recorded, never accepted on its own.
 */
export async function recordPaymentAction(id: string, input: z.input<typeof paymentSchema>): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const r = await loadRequest(id)
  if (!r) return fail('Order request not found.')
  const parsed = paymentSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the payment.')
  const d = parsed.data
  const amount = parsePriceEtb(d.amount)
  if (amount === null) return fail('Enter the amount in birr, like 125000 or 125,000.50.')
  if (d.date > todayInAddis()) return fail('The date cannot be in the future.')
  const db = getAdminSupabase()
  const { error } = await db.from('order_request_payments').insert({
    order_request_id: id,
    entry_type: d.type,
    direction: d.type === 'customer_payment' ? 'in' : 'out',
    amount_cents: amount,
    occurred_on: d.date,
    method: d.method,
    reference: d.reference || null,
    note: d.note || null,
    created_by: (await adminActor()).slice(0, 120),
  })
  if (error) return dbError(error, 'Could not record the payment.')
  const { data: after } = await db.from('order_requests').select('status').eq('id', id).maybeSingle()
  const paid = r.status === 'reserved' && after?.status === 'paid'
  const emailed = paid ? await sendCustomerEmail(id, 'paid') : false
  await audit('supply.order_request.payment', { type: 'order_request', id, label: r.reference }, { entry_type: d.type, amount_cents: amount, paid, emailed })
  refresh(id)
  if (paid) return ok({ message: emailed ? 'Recorded. Paid in full: the customer was emailed.' : 'Recorded. Paid in full.' })
  if (d.type === 'customer_payment' && ['expired', 'cancelled'].includes(after?.status ?? '')) return ok({ message: 'Recorded. The reservation had ended, so the request is not paid: reopen it (check stock again) or refund.' })
  return ok({ message: 'Recorded.' })
}

/** Owner: correct a mistaken entry with an exact reversal (entries are never changed or deleted). */
export async function reversePaymentAction(id: string, entryId: string, reason: string): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const why = reason.trim().slice(0, 500)
  if (why.length < 3) return fail('Give a reason (a few words).')
  const r = await loadRequest(id)
  if (!r || !z.uuid().safeParse(entryId).success) return fail('Order request not found.')
  const db = getAdminSupabase()
  const { data: original } = await db.from('order_request_payments').select('id, direction, amount_cents, order_request_id').eq('id', entryId).maybeSingle()
  if (!original || original.order_request_id !== id) return fail('Entry not found.')
  const { error } = await db.from('order_request_payments').insert({
    order_request_id: id,
    entry_type: 'reversal',
    direction: original.direction === 'in' ? 'out' : 'in',
    amount_cents: original.amount_cents,
    occurred_on: todayInAddis(),
    reverses_entry_id: original.id,
    reason: why,
    created_by: (await adminActor()).slice(0, 120),
  })
  if (error) return dbError(error.code === '23505' ? { code: '23505', message: 'This entry was already reversed.' } : error, 'Could not reverse the entry.')
  await audit('supply.order_request.reversal', { type: 'order_request', id, label: r.reference }, { entry: entryId, reason: why })
  refresh(id)
  return ok({ message: 'Reversed.' })
}

/** Owner: cancel a request nothing was paid for (email 7, "You have not been charged"). */
export async function cancelOrderRequestAction(id: string, reason: string): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const why = reason.trim().slice(0, 500)
  if (why.length < 3) return fail('Give a reason (a few words).')
  const r = await loadRequest(id)
  if (!r) return fail('Order request not found.')
  const { data, error } = await move(id, r.status, 'cancelled', why)
  if (error) return dbError(error, 'Could not cancel.')
  if (!data) return fail('Someone else changed this request. Reload the page.')
  const emailed = await sendCustomerEmail(id, 'cancelled')
  await audit('supply.order_request.cancel', { type: 'order_request', id, label: r.reference }, { reason: why, emailed })
  refresh(id)
  return ok({ message: emailed ? 'Cancelled. The customer was emailed.' : 'Cancelled. No email address: phone the customer.' })
}

/**
 * Owner: close a request that was paid, once everything was refunded (refund entries here, and on any supplier order,
 * whose orders must be cancelled first). The customer is emailed (email 7, "We will refund …").
 */
export async function markRefundedAction(id: string, reason: string): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const why = reason.trim().slice(0, 500)
  if (why.length < 3) return fail('Give a reason (a few words).')
  const r = await loadRequest(id)
  if (!r) return fail('Order request not found.')
  const { data, error } = await move(id, r.status, 'refunded', why)
  if (error) return dbError(error, 'Could not save.')
  if (!data) return fail('Someone else changed this request. Reload the page.')
  const emailed = await sendCustomerEmail(id, 'refunded')
  await audit('supply.order_request.refunded', { type: 'order_request', id, label: r.reference }, { reason: why, emailed })
  refresh(id)
  return ok({ message: emailed ? 'Closed as refunded. The customer was emailed.' : 'Closed as refunded. No email address: phone the customer.' })
}

/** Owner: a dispute is settled and every supplier order is completed. */
export async function closeDisputeAction(id: string): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const r = await loadRequest(id)
  if (!r) return fail('Order request not found.')
  const { data, error } = await move(id, r.status, 'completed')
  if (error) return dbError(error, 'Could not save.')
  if (!data) return fail('Someone else changed this request. Reload the page.')
  await audit('supply.order_request.complete', { type: 'order_request', id, label: r.reference })
  refresh(id)
  return ok({ message: 'Completed.' })
}

/**
 * Owner: one Model A supplier order per partner from a paid request, all or nothing. The customer's money moves into
 * the supply ledger on each order, and each order is "paid" under the existing golden rule. A second tap is refused.
 */
export async function createSupplierOrdersAction(id: string): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const r = await loadRequest(id)
  if (!r) return fail('Order request not found.')
  const { data, error } = await getAdminSupabase().rpc('order_request_create_supply_orders', { p_request: id, p_actor: (await adminActor()).slice(0, 120), p_today: todayInAddis() })
  if (error) return dbError(error, 'Could not create the supplier orders.')
  const refs = ((data ?? []) as { id: string; reference: string }[]).map((o) => o.reference)
  await audit('supply.order.create', { type: 'order_request', id, label: r.reference }, { orders: refs, from: 'order_request' })
  refresh(id)
  return ok({ message: `Supplier order${refs.length === 1 ? '' : 's'} ${refs.join(', ')} created and paid from the customer's payment. Nothing was sent to the partner.` })
}
