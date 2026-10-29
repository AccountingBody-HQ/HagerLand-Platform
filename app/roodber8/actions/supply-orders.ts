'use server'

/** Admin area these actions belong to: owner and operations; owner-only steps also call assertOwner(). */
const AREA = '/roodber8/supply/orders'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, assertOwner, audit, isOwnerSession } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { STALE_EDIT } from '@/lib/concurrency'
import { parsePriceEtb } from '@/lib/supply/offers'
import { canTransition, customerTotalCents, ORDER_STATUS_LABEL, percentToBps, type MoneyModel, type OrderStatus } from '@/lib/supply/money'
import { normaliseSupplyPhone } from '@/lib/supply/phone'
import { confirmPrivateUpload, createPrivateUpload } from '@/lib/supply/private-files'
import { CLOSED_QUOTE_STATUSES } from '@/lib/supply/quote-supply-data'
import { todayInAddis } from '@/lib/supply/shortlist'
import { afterSupplyOrderChange } from '@/lib/supply/order-requests-data'

type Msg = ActionResult<{ message: string }>
/** A save that changed the order returns its new updated_at, so the page's next action is not taken for a stale edit. */
type Saved = ActionResult<{ message: string; updatedAt?: string }>
const blank = (v: unknown) => (v === null || (typeof v === 'string' && v.trim() === '') ? undefined : v)
/** Birr text to cents; 0 allowed when `zero` (free delivery). */
function birr(text: string | undefined, zero = false): number | null | undefined {
  if (text === undefined || text.trim() === '') return undefined
  if (zero && /^0+(\.0+)?$/.test(text.trim())) return 0
  return parsePriceEtb(text)
}

/** S6-2: an order comes from a quote or from an order request (exactly one, 0049); the page of either is refreshed. */
function refresh(orderId: string, quoteId?: string | null, orderRequestId?: string | null) {
  revalidatePath(`/roodber8/supply/orders/${orderId}`)
  revalidatePath('/roodber8/supply/orders')
  revalidatePath('/roodber8/supply/ledger')
  if (quoteId) revalidatePath(`/roodber8/quotes/${quoteId}`)
  if (orderRequestId) revalidatePath(`/roodber8/supply/order-requests/${orderRequestId}`)
}

async function loadOrder(orderId: string) {
  if (!z.uuid().safeParse(orderId).success) return null
  const { data } = await getAdminSupabase().from('supply_orders').select('*').eq('id', orderId).maybeSingle()
  return data
}

/* ------------------------------------------------------------- Create orders -------------------------------------------------------------- */

const groupSchema = z.array(
  z.object({
    orgId: z.uuid(),
    model: z.enum(['A', 'B', '']),
    proceedWithoutAgreement: z.boolean(),
    commission: z.string().max(10),
  }),
).min(1).max(50)
export type OrderGroupInput = z.input<typeof groupSchema>[number]

/**
 * Turns the chosen supplier lines of a quote into one draft order per supplier. Nothing is sent to anyone.
 * The money model follows the partner's active agreement; with "both" or no agreement, the owner picks it.
 */
export async function createOrdersAction(quoteId: string, groups: OrderGroupInput[]): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const parsed = groupSchema.safeParse(groups)
  if (!z.uuid().safeParse(quoteId).success || !parsed.success) return fail('Choose the money model for each supplier.')
  const db = getAdminSupabase()
  const { data: quote } = await db.from('quote_requests').select('reference, status').eq('id', quoteId).maybeSingle()
  if (!quote) return fail('Quote not found.')
  if (CLOSED_QUOTE_STATUSES.includes(quote.status)) return fail(`This quote is ${quote.status}: no orders can be made from it.`)
  const actor = (await adminActor()).slice(0, 120)
  const created: string[] = []
  for (const g of parsed.data) {
    const [{ data: partner }, { data: agreement }] = await Promise.all([
      db.from('supply_partners').select('relationship_status, org:organisations(name)').eq('org_id', g.orgId).maybeSingle(),
      db.from('supply_agreements').select('id, money_model, commission_rate_bps').eq('org_id', g.orgId).eq('status', 'active').maybeSingle(),
    ])
    const name = (partner?.org as { name: string } | null)?.name ?? 'This supplier'
    const stop = (error: string) => fail(created.length ? `${created.join(', ')} created. ${error}` : error)
    if (!partner || !['active', 'terms_agreed'].includes(partner.relationship_status)) return stop(`${name} is not an active or trial partner, so an order cannot be made.`)
    let model: MoneyModel
    if (agreement && agreement.money_model !== 'both') {
      if (g.model && g.model !== agreement.money_model) return stop(`${name}’s agreement is model ${agreement.money_model}; the order must follow it.`)
      model = agreement.money_model as MoneyModel
    } else {
      if (!g.model) return stop(`Choose model A or B for ${name}.`)
      model = g.model
    }
    if (!agreement && !g.proceedWithoutAgreement) return stop(`${name} has no signed agreement. Tick “Proceed without an agreement” to continue.`)
    let bps: number | null = null
    if (model === 'B') {
      bps = agreement?.commission_rate_bps ?? (g.commission ? percentToBps(g.commission) : null)
      if (bps === null) return stop(`Enter the commission rate for ${name}, like 5 or 2.5.`)
    }

    const { data: chosen } = await db
      .from('supply_quote_lines')
      .select('id, quote_item_id, unit, unit_price_cents, quantity, delivery_charge_cents, offer:supplier_offers(vat_included), item:quote_request_items(free_text_item, unit, removed_at, product:products(name))')
      .eq('quote_request_id', quoteId)
      .eq('org_id', g.orgId)
      .eq('status', 'chosen')
    const ids = (chosen ?? []).map((l) => l.id)
    const { data: used } = ids.length ? await db.from('supply_order_lines').select('supply_quote_line_id, order:supply_orders!inner(status)').in('supply_quote_line_id', ids).neq('order.status', 'cancelled') : { data: [] }
    const taken = new Set((used ?? []).map((u) => u.supply_quote_line_id))
    const lines = (chosen ?? []).filter((l) => !taken.has(l.id) && l.unit_price_cents !== null && l.quantity !== null)
    if (!lines.length) return stop(`No chosen lines for ${name} are left to order (they may already be in an order).`)
    const payload = lines.map((l) => {
      const item = l.item as { free_text_item: string | null; unit: string; removed_at: string | null; product: { name: string } | null } | null
      return {
        supply_quote_line_id: l.id,
        quote_item_id: l.quote_item_id,
        item_name: (item?.free_text_item ?? item?.product?.name ?? 'Item').slice(0, 300),
        quantity: Number(l.quantity),
        unit: l.unit ?? item?.unit ?? 'piece',
        supplier_unit_price_cents: l.unit_price_cents,
        vat_flag: (l.offer as { vat_included: string } | null)?.vat_included ?? 'unknown',
      }
    })
    // One delivery per supplier: the highest charge among the lines (as the basket estimates it).
    const delivery = lines.reduce<number | null>((max, l) => (l.delivery_charge_cents === null ? max : Math.max(max ?? 0, l.delivery_charge_cents)), null)
    // The generated types mark every SQL function argument as required, but these three may be NULL (no agreement,
    // no commission for model A, no delivery charge), which supply_create_order (migration 0037) accepts.
    const nullable = { p_agreement: agreement?.id ?? null, p_commission_bps: bps, p_supplier_delivery_cents: delivery } as unknown as { p_agreement: string; p_commission_bps: number; p_supplier_delivery_cents: number }
    const { data: order, error } = await db
      .rpc('supply_create_order', { p_quote: quoteId, p_org: g.orgId, p_model: model, p_proceed: !agreement, p_actor: actor, p_lines: payload, ...nullable })
      .single()
    if (error?.code === '23505') return stop(`Some of ${name}’s lines are already in an order. Reload the page.`)
    if (error || !order) return stop(`Could not create the order for ${name}.`)
    const o = order as { id: string; reference: string }
    await audit('supply.order.create', { type: 'supply_order', id: o.id, label: o.reference }, { quote: quote.reference, org: g.orgId, model, lines: payload.length, agreement: agreement?.id ?? null, proceed_without_agreement: !agreement, commission_rate_bps: bps })
    created.push(o.reference)
  }
  revalidatePath(`/roodber8/quotes/${quoteId}`)
  revalidatePath('/roodber8/supply/orders')
  return ok({ message: `${created.length === 1 ? 'Draft order' : 'Draft orders'} ${created.join(', ')} created. Nothing has been sent to anyone.` })
}

/* ---------------------------------------------------------------- Draft edits ----------------------------------------------------------------- */

const draftSchema = z.object({
  lines: z.array(z.object({ id: z.uuid(), customerPrice: z.string().max(30) })).max(200),
  customerDelivery: z.string().max(30),
  supplierDelivery: z.string().max(30),
  commission: z.string().max(10),
  expectedUpdatedAt: z.string().max(40),
})
export type DraftInput = z.input<typeof draftSchema>

/** Customer prices (model A), delivery charges and the commission rate (model B), while the order is a draft. */
export async function saveDraftOrderAction(orderId: string, input: DraftInput): Promise<Saved> {
  await assertAdmin(AREA)
  await assertOwner()
  const order = await loadOrder(orderId)
  if (!order) return fail('Order not found.')
  if (order.status !== 'draft') return fail('Only a draft order can be changed.')
  const parsed = draftSchema.safeParse(input)
  if (!parsed.success) return fail('Check the prices.')
  const d = parsed.data
  if (d.expectedUpdatedAt && new Date(order.updated_at).getTime() !== new Date(d.expectedUpdatedAt).getTime()) return fail(STALE_EDIT)
  const supplierDelivery = birr(d.supplierDelivery, true)
  if (supplierDelivery === null) return fail('Enter the supplier delivery charge in birr, like 1000 (or 0 if free).')
  const changes: { customer_delivery_charge_cents?: number | null; supplier_delivery_charge_cents: number | null; commission_rate_bps?: number | null; updated_by: string } = { supplier_delivery_charge_cents: supplierDelivery ?? null, updated_by: (await adminActor()).slice(0, 120) }
  const db = getAdminSupabase()
  if (order.money_model === 'A') {
    const customerDelivery = birr(d.customerDelivery, true)
    if (customerDelivery === null) return fail('Enter the customer delivery charge in birr, like 1000 (or 0 if free).')
    changes.customer_delivery_charge_cents = customerDelivery ?? null
    for (const l of d.lines) {
      const price = birr(l.customerPrice)
      if (price === null) return fail('Enter each customer price in birr, like 1300 or 1,300.50.')
      const { error } = await db.from('supply_order_lines').update({ customer_unit_price_cents: price ?? null }).eq('id', l.id).eq('order_id', orderId)
      if (error) return fail('Could not save the prices.')
    }
  } else if (!order.agreement_id) {
    const bps = percentToBps(d.commission)
    if (bps === null) return fail('Enter the commission rate as a percentage, like 5 or 2.5.')
    changes.commission_rate_bps = bps
  }
  const { data: saved, error } = await db.from('supply_orders').update(changes).eq('id', orderId).select('updated_at').single()
  if (error || !saved) return fail(error?.code === '23514' ? error.message : 'Could not save the order.')
  await audit('supply.order.draft_edit', { type: 'supply_order', id: orderId, label: order.reference }, { lines: d.lines.length, model: order.money_model })
  refresh(orderId, order.quote_request_id, order.order_request_id)
  return ok({ message: 'Order saved.', updatedAt: saved.updated_at })
}

/* ---------------------------------------------------------------- Status steps ---------------------------------------------------------------- */

/** Steps Operations may take; every other step is the owner's. */
const OPERATIONS_STEPS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  placed: ['confirmed'],
  confirmed: ['out_for_delivery'],
  out_for_delivery: ['delivered', 'disputed'],
  delivered: ['disputed'],
}

export async function setOrderStatusAction(orderId: string, to: string, reason: string, expectedUpdatedAt: string): Promise<Saved> {
  await assertAdmin(AREA)
  const order = await loadOrder(orderId)
  if (!order) return fail('Order not found.')
  const target = z.enum(['draft', 'awaiting_payment', 'paid', 'placed', 'confirmed', 'out_for_delivery', 'delivered', 'completed', 'cancelled', 'disputed']).safeParse(to)
  if (!target.success) return fail('Invalid status.')
  const from = order.status as OrderStatus
  const model = order.money_model as MoneyModel
  if (!(OPERATIONS_STEPS[from] ?? []).includes(target.data)) await assertOwner()
  if (expectedUpdatedAt && new Date(order.updated_at).getTime() !== new Date(expectedUpdatedAt).getTime()) return fail(STALE_EDIT)
  if (!canTransition(model, from, target.data)) return fail(`An order that is “${ORDER_STATUS_LABEL[from]}” cannot become “${ORDER_STATUS_LABEL[target.data]}”.`)
  const why = reason.trim().slice(0, 500)
  if (['cancelled', 'disputed'].includes(target.data) && why.length < 3) return fail('Give a reason (a few words).')
  const db = getAdminSupabase()
  if (model === 'A' && target.data === 'awaiting_payment') {
    const { data: lines } = await db.from('supply_order_lines').select('quantity, supplier_unit_price_cents, customer_unit_price_cents').eq('order_id', orderId)
    const total = customerTotalCents((lines ?? []).map((l) => ({ quantity: Number(l.quantity), supplierUnitPriceCents: l.supplier_unit_price_cents, customerUnitPriceCents: l.customer_unit_price_cents })), order.customer_delivery_charge_cents)
    if (!total) return fail('Enter the customer price for every line first.')
  }
  const { data: saved, error } = await db
    .from('supply_orders')
    .update({ status: target.data, status_reason: ['cancelled', 'disputed'].includes(target.data) ? why : null, updated_by: (await adminActor()).slice(0, 120) })
    .eq('id', orderId)
    .eq('status', from)
    .select('updated_at')
    .maybeSingle()
  // The database refuses what the rules forbid (golden rule, proof before completion) with a plain message.
  if (error) return fail(error.code === '23514' ? error.message : 'Could not change the order.')
  // Nothing updated: the status changed in between (another person or tab).
  if (!saved) return fail(STALE_EDIT)
  await audit('supply.order.status', { type: 'supply_order', id: orderId, label: order.reference }, { from, to: target.data, reason: why || null })
  // S6-2: an order from an order request moves the request on (in the database); its customer is told once delivered.
  await afterSupplyOrderChange(order.order_request_id)
  refresh(orderId, order.quote_request_id, order.order_request_id)
  return ok({ message: `Order is now “${ORDER_STATUS_LABEL[target.data]}”.`, updatedAt: saved.updated_at })
}

/* ------------------------------------------------------------------ Payments ------------------------------------------------------------------ */

const ENTRY_DIRECTION: Record<string, 'in' | 'out' | 'receivable'> = {
  customer_payment: 'in',
  supplier_payment: 'out',
  refund: 'out',
  service_fee: 'in',
  commission_due: 'receivable',
  commission_received: 'in',
}
const MODEL_ENTRIES: Record<MoneyModel, string[]> = { A: ['customer_payment', 'supplier_payment', 'refund', 'service_fee'], B: ['commission_due', 'commission_received', 'service_fee'] }

const entrySchema = z.object({
  type: z.enum(['customer_payment', 'supplier_payment', 'refund', 'service_fee', 'commission_due', 'commission_received']),
  amount: z.string().max(30),
  date: z.iso.date({ error: 'Enter the date' }),
  method: z.preprocess(blank, z.enum(['bank_transfer', 'telebirr', 'cbe_birr', 'cash', 'card', 'other']).optional()),
  reference: z.preprocess(blank, z.string().trim().max(120).optional()),
  currency: z.preprocess(blank, z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code, like GBP').optional()),
  originalAmount: z.preprocess(blank, z.string().max(30).optional()),
  rate: z.preprocess(blank, z.string().max(30).optional()),
  note: z.preprocess(blank, z.string().trim().max(1000).optional()),
})
export type EntryInput = z.input<typeof entrySchema>

/** Records money for an order in the ledger (append-only; mistakes are corrected by reversing on the ledger page). */
export async function recordOrderEntryAction(orderId: string, input: EntryInput): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const order = await loadOrder(orderId)
  if (!order) return fail('Order not found.')
  const parsed = entrySchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the payment.')
  const d = parsed.data
  if (!MODEL_ENTRIES[order.money_model as MoneyModel].includes(d.type)) return fail('That kind of entry does not apply to this order’s money model.')
  if (order.status === 'draft') return fail('Record money once the order has left draft.')
  const amount = parsePriceEtb(d.amount)
  if (amount === null) return fail('Enter the amount in birr, like 125000 or 125,000.50.')
  if (d.date > todayInAddis()) return fail('The date cannot be in the future.')
  let fx: { original_currency: string; original_amount_minor: number; fx_rate: number } | null = null
  if (d.currency && d.currency !== 'ETB') {
    const original = d.originalAmount ? parsePriceEtb(d.originalAmount) : null
    const rate = d.rate ? Number(d.rate.replace(/,/g, '')) : Number.NaN
    if (original === null || !Number.isFinite(rate) || rate <= 0) return fail('For a foreign-currency payment, enter the amount in that currency and the rate used.')
    fx = { original_currency: d.currency, original_amount_minor: original, fx_rate: rate }
  }
  const { data, error } = await getAdminSupabase()
    .from('supply_ledger_entries')
    .insert({ entry_type: d.type, direction: ENTRY_DIRECTION[d.type], amount_cents: amount, occurred_on: d.date, method: d.method ?? null, reference: d.reference ?? null, ...(fx ?? {}), order_id: orderId, org_id: order.org_id, quote_request_id: order.quote_request_id, note: d.note ?? null, created_by: (await adminActor()).slice(0, 120) })
    .select('id')
    .single()
  if (error || !data) return fail('Could not record the entry.')
  await audit('supply.ledger.entry', { type: 'supply_order', id: orderId, label: order.reference }, { entry: data.id, entry_type: d.type, amount_cents: amount, currency: fx?.original_currency ?? 'ETB' })
  refresh(orderId, order.quote_request_id, order.order_request_id)
  return ok({ message: 'Recorded in the ledger.' })
}

/* --------------------------------------------------------------- Delivery proof --------------------------------------------------------------- */

/** A one-time link to upload a delivery photo or signed delivery note (owner and operations). */
export async function proofUploadAction(orderId: string, contentType: string, size: number): Promise<ActionResult<{ path: string; signedUrl: string }>> {
  await assertAdmin(AREA)
  const order = await loadOrder(orderId)
  if (!order) return fail('Order not found.')
  if (['draft', 'cancelled'].includes(order.status)) return fail('Delivery proof can be added once the order is under way.')
  const upload = await createPrivateUpload('proofs', orderId, contentType, size)
  if (!upload.ok) return fail(upload.error)
  await audit('supply.order.proof_upload_link', { type: 'supply_order', id: orderId, label: order.reference }, { path: upload.path })
  return ok({ path: upload.path, signedUrl: upload.signedUrl })
}

const proofSchema = z.object({
  path: z.string().max(300),
  takenAt: z.preprocess(blank, z.string().max(30).optional()),
  receivedBy: z.preprocess(blank, z.string().trim().max(120).optional()),
  phone: z.preprocess(blank, z.string().trim().max(32).optional()),
  note: z.preprocess(blank, z.string().trim().max(1000).optional()),
})
export type ProofInput = z.input<typeof proofSchema>

export async function addProofAction(orderId: string, input: ProofInput): Promise<Msg> {
  await assertAdmin(AREA)
  const order = await loadOrder(orderId)
  if (!order) return fail('Order not found.')
  if (['draft', 'cancelled'].includes(order.status)) return fail('Delivery proof can be added once the order is under way.')
  const parsed = proofSchema.safeParse(input)
  if (!parsed.success) return fail('Check the delivery details.')
  const d = parsed.data
  const file = await confirmPrivateUpload('proofs', orderId, d.path)
  if (!file.ok) return fail(file.error)
  const phone = d.phone ? normaliseSupplyPhone(d.phone) : null
  if (d.phone && !phone) return fail('Enter the receiver’s phone like 0911 23 45 67 or +251…')
  const takenAt = d.takenAt ? new Date(`${d.takenAt}${d.takenAt.length <= 16 ? ':00+03:00' : ''}`) : null
  if (takenAt && (Number.isNaN(takenAt.getTime()) || takenAt.getTime() > Date.now() + 5 * 60_000)) return fail('Check the date and time the photo was taken.')
  const { data, error } = await getAdminSupabase()
    .from('supply_delivery_proofs')
    .insert({ order_id: orderId, file_path: d.path, file_type: file.contentType, file_size_bytes: file.size, taken_at: takenAt?.toISOString() ?? null, received_by_name: d.receivedBy ?? null, received_by_phone: phone, note: d.note ?? null, uploaded_by: (await adminActor()).slice(0, 120) })
    .select('id')
    .single()
  if (error || !data) return fail('Could not save the delivery proof.')
  await audit('supply.order.proof_add', { type: 'supply_order', id: orderId, label: order.reference }, { proof: data.id, type: file.contentType, size: file.size })
  refresh(orderId, order.quote_request_id, order.order_request_id)
  return ok({ message: 'Delivery proof added.' })
}

/** A wrong proof is marked removed with a reason (kept in the history, never deleted). */
export async function removeProofAction(orderId: string, proofId: string, reason: string): Promise<Msg> {
  await assertAdmin(AREA)
  const order = await loadOrder(orderId)
  if (!order || !z.uuid().safeParse(proofId).success) return fail('Delivery proof not found.')
  const why = reason.trim().slice(0, 500)
  if (why.length < 3) return fail('Say why this proof is being removed.')
  if (order.status === 'completed' && !(await isOwnerSession())) return fail('Only the owner can remove proof from a completed order.')
  const { data, error } = await getAdminSupabase()
    .from('supply_delivery_proofs')
    .update({ removed_at: new Date().toISOString(), removed_by: (await adminActor()).slice(0, 120), removed_reason: why })
    .eq('id', proofId)
    .eq('order_id', orderId)
    .is('removed_at', null)
    .select('id')
  if (error || !data?.length) return fail('Could not remove this proof (it may already be removed).')
  await audit('supply.order.proof_remove', { type: 'supply_order', id: orderId, label: order.reference }, { proof: proofId, reason: why })
  refresh(orderId, order.quote_request_id, order.order_request_id)
  return ok({ message: 'Proof marked as removed.' })
}

/* -------------------------------------------------------------- Promised delivery -------------------------------------------------------------- */

const promisedSchema = z.object({ date: z.preprocess(blank, z.iso.date().optional()), reason: z.string().trim().max(500), expectedUpdatedAt: z.string().max(40) })

/** The delivery date the supplier promised (owner and operations). Every change goes on the order's timeline. */
export async function setPromisedDateAction(orderId: string, date: string, reason: string, expectedUpdatedAt: string): Promise<Saved> {
  await assertAdmin(AREA)
  const order = await loadOrder(orderId)
  if (!order) return fail('Order not found.')
  const parsed = promisedSchema.safeParse({ date, reason, expectedUpdatedAt })
  if (!parsed.success) return fail('Enter a date, like 2026-11-05.')
  if (['delivered', 'completed', 'cancelled'].includes(order.status)) return fail('The promised date cannot change once the order is delivered, completed or cancelled.')
  if (parsed.data.expectedUpdatedAt && new Date(order.updated_at).getTime() !== new Date(parsed.data.expectedUpdatedAt).getTime()) return fail(STALE_EDIT)
  const next = parsed.data.date ?? null
  if (next === order.promised_delivery_on) return ok({ message: 'No change.' })
  const { data: saved, error } = await getAdminSupabase()
    .from('supply_orders')
    .update({ promised_delivery_on: next, promised_change_reason: parsed.data.reason || null, updated_by: (await adminActor()).slice(0, 120) })
    .eq('id', orderId)
    .select('updated_at')
    .single()
  if (error || !saved) return fail(error?.code === '23514' ? error.message : 'Could not save the date.')
  await audit('supply.order.promised_date', { type: 'supply_order', id: orderId, label: order.reference }, { from: order.promised_delivery_on, to: next, reason: parsed.data.reason || null })
  refresh(orderId, order.quote_request_id, order.order_request_id)
  return ok({ message: next ? `Promised delivery date set to ${next}.` : 'Promised delivery date cleared.', updatedAt: saved.updated_at })
}
