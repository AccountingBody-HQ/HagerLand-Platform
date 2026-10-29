import 'server-only'
// S6-2 order requests: database reads and the customer emails. Owner-only figures (prices, totals, payments, partner
// costs) are loaded only when `owner` is true, so they never reach Operations, even in page data. Customer views never
// read the partner or the cost. Logs carry ids and counts only.
import { getAdminSupabase } from '@/lib/supabase/admin'
import { must } from '@/lib/admin/must'
import { readAll, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import { sendEmail } from '@/lib/email/send'
import {
  orderRequestCancelledEmail,
  orderRequestDeliveredEmail,
  orderRequestExpiredEmail,
  orderRequestPaidEmail,
  orderRequestPartialEmail,
  orderRequestReceivedEmail,
  orderRequestReservedEmail,
  orderRequestUnavailableEmail,
} from '@/lib/email/templates'
import { formatETBCents } from '@/lib/format'
import { log } from '@/lib/log'
import { addisDateTime, itemList, type OrderRequestStatus } from '@/lib/supply/order-requests'
import { resolveTerms, type SuggestedTerms } from '@/lib/supply/terms'

export const PAYMENT_DETAILS_KEY = 'supply_payment_details'

/** The owner's payment details for customers ('' when not set or unreadable: then nothing that needs them may happen). */
export async function readPaymentDetails(): Promise<string> {
  const { data, error } = await getAdminSupabase().from('site_settings').select('value').eq('key', PAYMENT_DETAILS_KEY).maybeSingle()
  if (error) log.error('order-requests', 'payment details could not be read', error)
  return !error && typeof data?.value === 'string' ? data.value.trim() : ''
}

/** A published HagerLand Supply product with an active partner source (the only products that can be ordered). */
export async function orderableProduct(productId: string): Promise<boolean> {
  const db = getAdminSupabase()
  const [{ data: p }, { count }] = await Promise.all([
    db.from('products').select('id, status, seller:organisations(is_hagerland)').eq('id', productId).maybeSingle(),
    db.from('product_sources').select('id', { count: 'exact', head: true }).eq('product_id', productId).eq('status', 'active'),
  ])
  return Boolean(p && p.status === 'published' && (p.seller as { is_hagerland: boolean } | null)?.is_hagerland && (count ?? 0) > 0)
}

// ---------------------------------------------------------------------------------------------------------------
// Customer emails (once each, claimed in the database)
// ---------------------------------------------------------------------------------------------------------------
export type CustomerEmailKind = 'received' | 'reserved' | 'partial' | 'unavailable' | 'expired' | 'paid' | 'cancelled' | 'refunded' | 'delivered'

interface EmailRow {
  id: string
  reference: string
  email: string | null
  status: string
  reserved_at: string | null
  reserved_until: string | null
  status_changed_at: string
  customer_total_cents: number | null
}

/** The claim key: some emails can happen again after a reopen (a new reservation, a new expiry). */
function claimKey(kind: CustomerEmailKind, r: EmailRow): string {
  if (kind === 'reserved') return `reserved:${r.reserved_at}`
  if (kind === 'expired') return `expired:${r.reserved_until}`
  if (kind === 'partial') return `partial:${r.status_changed_at}`
  return kind
}

async function itemsOf(id: string, statuses: string[]): Promise<string> {
  const { data } = must(await getAdminSupabase().from('order_request_lines').select('item_name, quantity, confirmed_qty, unit, status').eq('order_request_id', id).in('status', statuses).order('created_at'))
  return itemList((data ?? []).map((l) => ({ name: l.item_name, quantity: Number(l.status === 'short' && l.confirmed_qty !== null ? l.confirmed_qty : l.quantity), unit: l.unit })))
}

/**
 * Sends one customer email if the customer gave an email address and it was not sent before. Never throws (a failed
 * send is queued in the email outbox). Returns true when an email went out (or was queued).
 */
export async function sendCustomerEmail(id: string, kind: CustomerEmailKind, extra: { link?: string } = {}): Promise<boolean> {
  try {
    const db = getAdminSupabase()
    const { data: r } = await db.from('order_requests').select('id, reference, email, status, reserved_at, reserved_until, status_changed_at, customer_total_cents').eq('id', id).maybeSingle()
    if (!r?.email) return false
    const { data: claimed } = await db.rpc('order_request_claim_email', { p_request: id, p_key: claimKey(kind, r) })
    if (!claimed) return false
    let mail
    switch (kind) {
      case 'received':
        mail = orderRequestReceivedEmail({ reference: r.reference, link: extra.link ?? '' })
        break
      case 'reserved':
        mail = orderRequestReservedEmail({ reference: r.reference, until: addisDateTime(r.reserved_until), amount: formatETBCents(r.customer_total_cents), paymentDetails: (await readPaymentDetails()).replace(/\s*\n\s*/g, ', ') })
        break
      case 'partial': {
        const [available, unavailable] = await Promise.all([itemsOf(id, ['confirmed', 'short']), unavailableItems(id)])
        mail = orderRequestPartialEmail({ reference: r.reference, available, unavailable })
        break
      }
      case 'unavailable':
        mail = orderRequestUnavailableEmail({ reference: r.reference, items: await itemsOf(id, ['unavailable']) })
        break
      case 'expired':
        mail = orderRequestExpiredEmail({ reference: r.reference })
        break
      case 'paid':
        mail = orderRequestPaidEmail({ reference: r.reference, amount: formatETBCents(await receivedCents(id)) })
        break
      case 'cancelled':
        mail = orderRequestCancelledEmail({ reference: r.reference, refundAmount: null })
        break
      case 'refunded':
        mail = orderRequestCancelledEmail({ reference: r.reference, refundAmount: formatETBCents(await receivedCents(id)) })
        break
      case 'delivered':
        mail = orderRequestDeliveredEmail({ reference: r.reference })
        break
    }
    await sendEmail({ to: r.email, from: 'supply', ...mail })
    return true
  } catch (err) {
    log.error('order-requests', `customer email failed: ${kind}`, err, { id })
    return false
  }
}

/** Unavailable items, and the part of a short item that is not available ("10 bags" of 30). */
async function unavailableItems(id: string): Promise<string> {
  const { data } = must(await getAdminSupabase().from('order_request_lines').select('item_name, quantity, confirmed_qty, unit, status').eq('order_request_id', id).in('status', ['unavailable', 'short']).order('created_at'))
  return itemList((data ?? []).map((l) => ({ name: l.item_name, quantity: l.status === 'short' ? Number(l.quantity) - Number(l.confirmed_qty ?? 0) : Number(l.quantity), unit: l.unit })))
}

export async function receivedCents(id: string): Promise<number> {
  const { data, error } = await getAdminSupabase().rpc('order_request_received_cents', { p_request: id })
  if (error) throw new Error(error.message)
  return Number(data ?? 0)
}

/**
 * Ends every reservation whose time has passed (the hourly job and page loads), then tells each customer once. Rows
 * another step is working on are skipped and caught next time (0049 order_request_expire_due).
 */
export async function expireDueOrderRequests(actor: string): Promise<number> {
  const { data, error } = await getAdminSupabase().rpc('order_request_expire_due', { p_actor: actor })
  if (error) throw new Error(error.message)
  const ids = ((data ?? []) as { id: string }[]).map((r) => r.id)
  for (const id of ids) await sendCustomerEmail(id, 'expired')
  return ids.length
}

/** After a supplier order changes: a request that became delivered tells its customer (once). */
export async function afterSupplyOrderChange(orderRequestId: string | null): Promise<void> {
  if (!orderRequestId) return
  const { data } = await getAdminSupabase().from('order_requests').select('status').eq('id', orderRequestId).maybeSingle()
  if (data && ['delivered', 'completed'].includes(data.status)) await sendCustomerEmail(orderRequestId, 'delivered')
}

/** Backstop for the hourly job: delivered requests whose customer was not told yet. */
export async function sendMissedDeliveredEmails(): Promise<number> {
  const { data } = await readAll(() => getAdminSupabase().from('order_requests').select('id, emails_sent').in('status', ['delivered', 'completed']).not('email', 'is', null), { maxRows: REPORT_MAX_ROWS })
  let sent = 0
  for (const r of data.filter((x) => !x.emails_sent.includes('delivered'))) if (await sendCustomerEmail(r.id, 'delivered')) sent++
  return sent
}

// ---------------------------------------------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------------------------------------------
export interface AdminLine {
  id: string
  productId: string
  itemName: string
  quantity: number
  unit: string
  status: string
  confirmedQty: number | null
  holds: { id: string; orgId: string; partner: string; qty: number; heldUntil: string | null; status: string; partnerReference: string | null; note: string | null }[]
  /** Partners that can supply this product (active product sources). Names only. */
  partners: { orgId: string; name: string }[]
  /** Owner only. */
  money?: {
    unitPriceCents: number | null
    costCents: number | null
    source: string | null
    /** S6-3: the terms stored at reservation, and what HagerLand pays the partner per unit. */
    termsModel: string | null
    termsBps: number | null
    payableUnitCents: number | null
    /** S6-3: the suggested price from the held partner's terms (lib/supply/terms.ts, the same as the database). */
    suggested: SuggestedTerms | null
  }
}

export interface AdminOrderRequest {
  id: string
  reference: string
  status: OrderRequestStatus
  statusReason: string | null
  createdAt: string
  name: string
  phone: string
  email: string | null
  deliveryArea: string
  deliveryAddress: string | null
  neededBy: string | null
  note: string | null
  reservedUntil: string | null
  personalDataDeletedAt: string | null
  lines: AdminLine[]
  events: { at: string; type: string; from: string | null; to: string | null; reason: string | null; actor: string | null }[]
  orders: { id: string; reference: string; status: string; supplier: string }[]
  /** Owner only. */
  money?: {
    linesTotalCents: number | null
    deliveryCents: number | null
    totalCents: number | null
    netCents: number
    receivedCents: number
    heldCents: number
    entries: { id: string; type: string; amountCents: number; occurredOn: string; method: string | null; reference: string | null; reason: string | null; note: string | null; reversed: boolean; supplyOrderId: string | null; createdBy: string | null; createdAt: string }[]
  }
}

export async function loadAdminOrderRequest(id: string, owner: boolean): Promise<AdminOrderRequest | null> {
  const db = getAdminSupabase()
  const { data: r } = must(await db.from('order_requests').select('*, location:locations(display_name)').eq('id', id).maybeSingle())
  if (!r) return null
  const [{ data: lines }, { data: events }, { data: orders }] = must(
    await Promise.all([
      db.from('order_request_lines').select('*').eq('order_request_id', id).order('created_at'),
      db.from('order_request_events').select('created_at, event_type, from_status, to_status, reason, actor').eq('order_request_id', id).order('created_at'),
      db.from('supply_orders').select('id, reference, status, org:organisations(name)').eq('order_request_id', id).order('created_at'),
    ]),
  )
  const lineIds = (lines ?? []).map((l) => l.id)
  const productIds = Array.from(new Set((lines ?? []).map((l) => l.product_id)))
  const [{ data: holds }, { data: sources }] = must(
    await Promise.all([
      lineIds.length ? db.from('stock_reservations').select('id, order_request_line_id, org_id, qty, held_until, status, partner_reference, note, org:organisations(name)').in('order_request_line_id', lineIds).order('created_at') : Promise.resolve({ data: [], error: null }),
      productIds.length ? db.from('product_sources').select('product_id, org_id, status, org:organisations(name)').in('product_id', productIds).eq('status', 'active') : Promise.resolve({ data: [], error: null }),
    ]),
  )
  const orgName = (o: unknown) => (o as { name: string } | null)?.name ?? ''
  // Owner only: each held partner's terms for its product (source first, then the active agreement).
  const heldOrgs = Array.from(new Set((holds ?? []).filter((h) => h.status === 'held').map((h) => h.org_id)))
  const [{ data: terms }, { data: agreements }] = owner && heldOrgs.length
    ? must(await Promise.all([
        db.from('product_sources').select('product_id, org_id, cost_price_cents, markup_bps, commission_bps').in('product_id', productIds).in('org_id', heldOrgs),
        db.from('supply_agreements').select('org_id, default_markup_bps, commission_rate_bps').in('org_id', heldOrgs).eq('status', 'active'),
      ]))
    : [{ data: [] as { product_id: string; org_id: string; cost_price_cents: number | null; markup_bps: number | null; commission_bps: number | null }[] }, { data: [] as { org_id: string; default_markup_bps: number | null; commission_rate_bps: number | null }[] }]
  const suggestionFor = (productId: string, lineId: string): SuggestedTerms | null => {
    const hold = (holds ?? []).find((h) => h.order_request_line_id === lineId && h.status === 'held')
    if (!hold) return null
    const src = (terms ?? []).find((t) => t.product_id === productId && t.org_id === hold.org_id)
    const ag = (agreements ?? []).find((a) => a.org_id === hold.org_id)
    return resolveTerms(src ? { costCents: src.cost_price_cents, markupBps: src.markup_bps, commissionBps: src.commission_bps } : null, ag ? { defaultMarkupBps: ag.default_markup_bps, commissionBps: ag.commission_rate_bps } : null)
  }
  const view: AdminOrderRequest = {
    id: r.id,
    reference: r.reference,
    status: r.status as OrderRequestStatus,
    statusReason: r.status_reason,
    createdAt: r.created_at,
    name: r.name,
    phone: r.phone,
    email: r.email,
    deliveryArea: (r.location as { display_name: string } | null)?.display_name ?? '',
    deliveryAddress: r.delivery_address,
    neededBy: r.needed_by,
    note: r.note,
    reservedUntil: r.reserved_until,
    personalDataDeletedAt: r.personal_data_deleted_at,
    lines: (lines ?? []).map((l) => ({
      id: l.id,
      productId: l.product_id,
      itemName: l.item_name,
      quantity: Number(l.quantity),
      unit: l.unit,
      status: l.status,
      confirmedQty: l.confirmed_qty === null ? null : Number(l.confirmed_qty),
      holds: (holds ?? [])
        .filter((h) => h.order_request_line_id === l.id)
        .map((h) => ({ id: h.id, orgId: h.org_id, partner: orgName(h.org), qty: Number(h.qty), heldUntil: h.held_until, status: h.status, partnerReference: h.partner_reference, note: h.note })),
      partners: (sources ?? []).filter((s) => s.product_id === l.product_id).map((s) => ({ orgId: s.org_id, name: orgName(s.org) })),
      ...(owner
        ? {
            money: {
              unitPriceCents: l.customer_unit_price_cents,
              costCents: l.cost_price_cents,
              source: l.source_org_id ? orgName((sources ?? []).find((s) => s.org_id === l.source_org_id)?.org) || null : null,
              termsModel: l.terms_model,
              termsBps: l.terms_bps,
              payableUnitCents: l.partner_payable_unit_cents,
              suggested: suggestionFor(l.product_id, l.id),
            },
          }
        : {}),
    })),
    events: (events ?? []).map((e) => ({ at: e.created_at, type: e.event_type, from: e.from_status, to: e.to_status, reason: e.reason, actor: e.actor })),
    orders: (orders ?? []).map((o) => ({ id: o.id, reference: o.reference, status: o.status, supplier: orgName(o.org) })),
  }
  if (owner) {
    const [{ data: entries }, net, received, held] = await Promise.all([
      db.from('order_request_payments').select('*').eq('order_request_id', id).order('created_at').then(must),
      db.rpc('order_request_net_cents', { p_request: id }).then(must),
      db.rpc('order_request_received_cents', { p_request: id }).then(must),
      db.rpc('order_request_held_cents', { p_request: id }).then(must),
    ])
    const reversed = new Set((entries ?? []).filter((e) => e.reverses_entry_id).map((e) => e.reverses_entry_id))
    view.money = {
      linesTotalCents: r.lines_total_cents,
      deliveryCents: r.delivery_charge_cents,
      totalCents: r.customer_total_cents,
      netCents: Number(net.data ?? 0),
      receivedCents: Number(received.data ?? 0),
      heldCents: Number(held.data ?? 0),
      entries: (entries ?? []).map((e) => ({ id: e.id, type: e.entry_type, amountCents: e.amount_cents, occurredOn: e.occurred_on, method: e.method, reference: e.reference, reason: e.reason, note: e.note, reversed: reversed.has(e.id), supplyOrderId: e.supply_order_id, createdBy: e.created_by, createdAt: e.created_at })),
    }
  }
  return view
}

// ---------------------------------------------------------------------------------------------------------------
// Customer view (never the partner, the cost or the history)
// ---------------------------------------------------------------------------------------------------------------
export interface CustomerOrderRequest {
  id: string
  reference: string
  status: OrderRequestStatus
  reservedUntil: string | null
  totalCents: number | null
  lines: { id: string; itemName: string; quantity: number; unit: string; status: string; confirmedQty: number | null }[]
}

export async function loadCustomerOrderRequest(id: string): Promise<CustomerOrderRequest | null> {
  const db = getAdminSupabase()
  const { data: r } = must(await db.from('order_requests').select('id, reference, status, reserved_until, customer_total_cents').eq('id', id).maybeSingle())
  if (!r) return null
  // The same columns as the customer line view (0049 order_request_lines_customer): no partner, no cost.
  const { data: lines } = must(await db.from('order_request_lines').select('id, item_name, quantity, unit, status, confirmed_qty').eq('order_request_id', id).order('created_at'))
  return {
    id: r.id,
    reference: r.reference,
    status: r.status as OrderRequestStatus,
    reservedUntil: r.reserved_until,
    totalCents: r.customer_total_cents,
    lines: (lines ?? []).map((l) => ({ id: l.id, itemName: l.item_name, quantity: Number(l.quantity), unit: l.unit, status: l.status, confirmedQty: l.confirmed_qty === null ? null : Number(l.confirmed_qty) })),
  }
}
