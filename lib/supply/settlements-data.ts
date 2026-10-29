import 'server-only'
// S6-3 settlements and reconciliation: database reads (owner only: every caller checks the owner first). Complete reads
// (readAll / readAllIn, never more than 1,000 rows per request); a failed read throws (the failure rule).
import { getAdminSupabase } from '@/lib/supabase/admin'
import { must } from '@/lib/admin/must'
import { readAll, readAllIn, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import { lineTotalCents } from '@/lib/supply/money'
import { formatDate } from '@/lib/format'
import { unitLabel } from '@/lib/units'
import { reconcile, type Reconciliation, type StatementInput } from '@/lib/supply/settlements'

const opts = { maxRows: REPORT_MAX_ROWS }

interface OrderRow {
  id: string
  reference: string
  org_id: string
  status: string
  delivered_at: string | null
  order_request_id: string | null
  supplier_delivery_charge_cents: number | null
  hagerland_delivery_income_cents: number | null
}

async function payables(orderIds: string[]): Promise<Map<string, number>> {
  const { data } = await readAllIn(orderIds, (part) => getAdminSupabase().from('supply_order_lines').select('id, order_id, quantity, supplier_unit_price_cents').in('order_id', part), opts)
  const out = new Map<string, number>()
  for (const l of data) out.set(l.order_id, (out.get(l.order_id) ?? 0) + lineTotalCents(l.supplier_unit_price_cents, Number(l.quantity)))
  return out
}

export interface DueOrder {
  id: string
  reference: string
  status: string
  deliveredAt: string | null
  payableCents: number
  /** Delivered with live proof: can be settled. */
  eligible: boolean
  /** Up-front terms: can be settled before delivery, with the owner's reason. */
  upfront: boolean
}
export interface DuePartner {
  orgId: string
  name: string
  orders: DueOrder[]
  dueCents: number
  pending: { id: string; amountCents: number; reason: string; order: string | null; createdAt: string }[]
}

/** "Due to partners": order-request supplier orders not yet in a live settlement, and adjustments waiting. */
export async function dueToPartners(): Promise<DuePartner[]> {
  const db = getAdminSupabase()
  const { data: orders } = await readAll(
    () => db.from('supply_orders').select('id, reference, org_id, status, delivered_at, order_request_id, supplier_delivery_charge_cents, hagerland_delivery_income_cents').not('order_request_id', 'is', null).eq('money_model', 'A').neq('status', 'cancelled'),
    opts,
  )
  const ids = orders.map((o) => o.id)
  const [{ data: settled }, { data: proofs }, { data: pending }] = await Promise.all([
    readAllIn(ids, (part) => db.from('partner_settlement_items').select('id, supply_order_id').in('supply_order_id', part).eq('kind', 'payable').eq('settlement_void', false), opts),
    readAllIn(ids, (part) => db.from('supply_delivery_proofs').select('id, order_id').in('order_id', part).is('removed_at', null), opts),
    readAll(() => db.from('partner_settlement_items').select('id, org_id, amount_cents, reason, supply_order_id, created_at').is('settlement_id', null).eq('kind', 'adjustment'), opts),
  ])
  const settledIds = new Set(settled.map((s) => s.supply_order_id))
  const open = (orders as OrderRow[]).filter((o) => !settledIds.has(o.id))
  const withProof = new Set(proofs.map((p) => p.order_id))
  const owed = await payables(open.map((o) => o.id))
  const upfront = new Map<string, boolean>()
  for (const o of open.filter((x) => !(['delivered', 'completed'].includes(x.status) && withProof.has(x.id)))) {
    const { data } = await db.rpc('supply_order_upfront', { p_order: o.id })
    upfront.set(o.id, Boolean(data))
  }
  const orgIds = Array.from(new Set([...open.map((o) => o.org_id), ...pending.map((p) => p.org_id)]))
  const { data: orgs } = await readAllIn(orgIds, (part) => db.from('organisations').select('id, name').in('id', part), opts)
  const refOf = new Map((orders as OrderRow[]).map((o) => [o.id, o.reference]))
  return orgIds
    .map((orgId) => {
      const mine = open.filter((o) => o.org_id === orgId).map((o): DueOrder => {
        const eligible = ['delivered', 'completed'].includes(o.status) && withProof.has(o.id)
        return { id: o.id, reference: o.reference, status: o.status, deliveredAt: o.delivered_at, payableCents: (owed.get(o.id) ?? 0) + (o.supplier_delivery_charge_cents ?? 0), eligible, upfront: !eligible && Boolean(upfront.get(o.id)) }
      })
      return {
        orgId,
        name: orgs.find((x) => x.id === orgId)?.name ?? '',
        orders: mine,
        dueCents: mine.filter((o) => o.eligible).reduce((sum, o) => sum + o.payableCents, 0),
        pending: pending.filter((p) => p.org_id === orgId).map((p) => ({ id: p.id, amountCents: p.amount_cents, reason: p.reason ?? '', order: p.supply_order_id ? refOf.get(p.supply_order_id) ?? null : null, createdAt: p.created_at })),
      }
    })
    .filter((p) => p.orders.length || p.pending.length)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export interface SettlementRow {
  id: string
  reference: string
  partner: string
  orgId: string
  from: string
  to: string
  status: string
  totalCents: number
  paidOn: string | null
  createdAt: string
}

export async function listSettlements(): Promise<SettlementRow[]> {
  const { data } = await readAll(() => getAdminSupabase().from('partner_settlements').select('id, reference, org_id, period_from, period_to, status, total_cents, paid_on, created_at, org:organisations(name)'), opts)
  return data
    .map((s) => ({ id: s.id, reference: s.reference, orgId: s.org_id, partner: (s.org as { name: string } | null)?.name ?? '', from: s.period_from, to: s.period_to, status: s.status, totalCents: s.total_cents, paidOn: s.paid_on, createdAt: s.created_at }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export interface SettlementDetail extends SettlementRow {
  approvedAt: string | null
  approvedBy: string | null
  method: string | null
  transferReference: string | null
  voidReason: string | null
  updatedAt: string
  items: { id: string; kind: string; orderId: string | null; order: string | null; amountCents: number; reason: string | null; upfrontReason: string | null }[]
}

export async function settlementDetail(id: string): Promise<SettlementDetail | null> {
  const db = getAdminSupabase()
  const { data: s } = must(await db.from('partner_settlements').select('*, org:organisations(name)').eq('id', id).maybeSingle())
  if (!s) return null
  const { data: items } = must(await db.from('partner_settlement_items').select('id, kind, supply_order_id, amount_cents, reason, upfront_reason, created_at').eq('settlement_id', id).order('created_at'))
  const orderIds = (items ?? []).map((i) => i.supply_order_id).filter((x): x is string => Boolean(x))
  const { data: orders } = await readAllIn(orderIds, (part) => db.from('supply_orders').select('id, reference').in('id', part), opts)
  return {
    id: s.id,
    reference: s.reference,
    orgId: s.org_id,
    partner: (s.org as { name: string } | null)?.name ?? '',
    from: s.period_from,
    to: s.period_to,
    status: s.status,
    totalCents: s.total_cents,
    paidOn: s.paid_on,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    approvedAt: s.approved_at,
    approvedBy: s.approved_by,
    method: s.method,
    transferReference: s.transfer_reference,
    voidReason: s.void_reason,
    items: (items ?? []).map((i) => ({ id: i.id, kind: i.kind, orderId: i.supply_order_id, order: orders.find((o) => o.id === i.supply_order_id)?.reference ?? null, amountCents: i.amount_cents, reason: i.reason, upfrontReason: i.upfront_reason })),
  }
}

/**
 * The partner statement's data: the HagerLand supply order reference, delivery date, item, quantity and what HagerLand
 * pays the partner. Never the customer, the customer price, the margin, delivery income or other partners.
 */
export async function statementData(id: string): Promise<StatementInput | null> {
  const d = await settlementDetail(id)
  if (!d) return null
  const db = getAdminSupabase()
  const payables = d.items.filter((i) => i.kind === 'payable' && i.orderId)
  const orderIds = payables.map((i) => i.orderId as string)
  const [{ data: orders }, { data: lines }] = await Promise.all([
    readAllIn(orderIds, (part) => db.from('supply_orders').select('id, reference, delivered_at').in('id', part), opts),
    readAllIn(orderIds, (part) => db.from('supply_order_lines').select('id, order_id, item_name, quantity, unit, supplier_unit_price_cents, created_at').in('order_id', part), opts),
  ])
  const rows = payables.flatMap((i) => {
    const o = orders.find((x) => x.id === i.orderId)
    return lines
      .filter((l) => l.order_id === i.orderId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((l) => ({ order: o?.reference ?? '', deliveredOn: o?.delivered_at ? formatDate(o.delivered_at) : '', item: l.item_name, quantity: `${Number(l.quantity)} ${unitLabel(l.unit, Number(l.quantity))}`, amountCents: lineTotalCents(l.supplier_unit_price_cents, Number(l.quantity)) }))
  })
  return {
    reference: d.reference,
    business: d.partner,
    from: formatDate(d.from),
    to: formatDate(d.to),
    rows,
    adjustments: d.items.filter((i) => i.kind === 'adjustment').map((i) => ({ reason: i.reason ?? '', amountCents: i.amountCents })),
    totalCents: d.totalCents,
    paid: d.status === 'paid' && d.paidOn ? { on: formatDate(d.paidOn), method: d.method ?? '', reference: d.transferReference ?? '' } : null,
  }
}

/** Everything the reconciliation report needs (order requests and their supply orders, the ledger, settlements). */
export async function reconciliationData(): Promise<Reconciliation> {
  const db = getAdminSupabase()
  const [{ data: payments }, { data: orders }, { data: settlements }, { data: pending }] = await Promise.all([
    readAll(() => db.from('order_request_payments').select('id, order_request_id, entry_type, amount_cents, occurred_on, reverses_entry_id'), opts),
    readAll(() => db.from('supply_orders').select('id, reference, org_id, status, delivered_at, order_request_id, supplier_delivery_charge_cents, hagerland_delivery_income_cents, request:order_requests(reference)').not('order_request_id', 'is', null), opts),
    readAll(() => db.from('partner_settlements').select('id, reference, status, total_cents'), opts),
    readAll(() => db.from('partner_settlement_items').select('id, amount_cents, created_at').is('settlement_id', null).eq('kind', 'adjustment'), opts),
  ])
  const orderIds = orders.map((o) => o.id)
  const settlementIds = settlements.map((s) => s.id)
  const [{ data: ledger }, { data: lines }, { data: items }] = await Promise.all([
    readAllIn(orderIds, (part) => db.from('supply_ledger_entries').select('id, order_id, entry_type, direction, amount_cents, occurred_on, reference, reverses_entry_id').in('order_id', part), opts),
    readAllIn(orderIds, (part) => db.from('supply_order_lines').select('id, order_id, quantity, supplier_unit_price_cents, customer_unit_price_cents, order_request_line_id').in('order_id', part), opts),
    readAllIn(settlementIds, (part) => db.from('partner_settlement_items').select('id, settlement_id, kind, supply_order_id, amount_cents, settlement_void, created_at').in('settlement_id', part), opts),
  ])
  const requestLineIds = lines.map((l) => l.order_request_line_id).filter((x): x is string => Boolean(x))
  const { data: requestLines } = await readAllIn(requestLineIds, (part) => db.from('order_request_lines').select('id, customer_unit_price_cents, partner_payable_unit_cents').in('id', part), opts)
  const paymentById = new Map(payments.map((p) => [p.id, p]))
  const ledgerById = new Map(ledger.map((e) => [e.id, e]))
  const refById = new Map(orders.map((o) => [o.id, o.reference]))
  return reconcile({
    payments: payments.map((p) => ({ requestId: p.order_request_id, type: p.entry_type, amountCents: p.amount_cents, occurredOn: p.occurred_on, reversedType: p.reverses_entry_id ? paymentById.get(p.reverses_entry_id)?.entry_type ?? null : null })),
    orders: (orders as (OrderRow & { request: unknown })[]).map((o) => ({
      id: o.id,
      reference: o.reference,
      requestId: o.order_request_id as string,
      requestReference: (o.request as { reference: string } | null)?.reference ?? '',
      orgId: o.org_id,
      status: o.status,
      deliveredAt: o.delivered_at,
      deliveryIncomeCents: o.hagerland_delivery_income_cents ?? 0,
      payableCents: lines.filter((l) => l.order_id === o.id).reduce((sum, l) => sum + lineTotalCents(l.supplier_unit_price_cents, Number(l.quantity)), 0) + (o.supplier_delivery_charge_cents ?? 0),
      lines: lines
        .filter((l) => l.order_id === o.id)
        .map((l) => {
          const rl = requestLines.find((x) => x.id === l.order_request_line_id)
          return { customerCents: lineTotalCents(l.customer_unit_price_cents ?? 0, Number(l.quantity)), payableUnitCents: rl?.partner_payable_unit_cents ?? null, customerUnitCents: rl?.customer_unit_price_cents ?? null, reference: refById.get(o.id) ?? '' }
        }),
    })),
    ledger: ledger.map((e) => {
      const original = e.reverses_entry_id ? ledgerById.get(e.reverses_entry_id) : undefined
      return { orderId: e.order_id as string, type: e.entry_type, direction: e.direction, amountCents: e.amount_cents, occurredOn: e.occurred_on, reference: e.reference, reversedType: original?.entry_type ?? null, reversedReference: original?.reference ?? null }
    }),
    settlements: settlements.map((s) => ({
      id: s.id,
      reference: s.reference,
      status: s.status,
      totalCents: s.total_cents,
      items: items.filter((i) => i.settlement_id === s.id).map((i) => ({ kind: i.kind, orderId: i.supply_order_id, amountCents: i.amount_cents, void: i.settlement_void, createdAt: i.created_at })),
    })),
    pending: pending.map((p) => ({ amountCents: p.amount_cents, createdAt: p.created_at })),
  })
}
