import 'server-only'
// Supply Phase 4 (admin): reads for orders and the ledger. Owner-only figures (customer prices, margins, commission,
// ledger, agreements) are only loaded when `owner` is true, so they never reach Operations, even in page data.
import { getAdminSupabase } from '@/lib/supabase/admin'
import { privateFileLink } from './private-files'
import { commissionDueCents, customerNetPaid, customerTotalCents, hagerlandEarned, needsAction, summariseLedger, supplierTotalCents, type LedgerSummary, type MoneyModel, type OrderStatus } from './money'

export interface OrderListRow {
  id: string
  reference: string
  quoteId: string
  quoteReference: string
  supplier: string
  orgId: string
  model: MoneyModel
  status: OrderStatus
  createdAt: string
  updatedAt: string
  needsAction: string | null
}

export async function listOrders(f: { status?: string; model?: string; orgId?: string; action?: boolean; quoteId?: string }): Promise<OrderListRow[]> {
  const db = getAdminSupabase()
  let q = db
    .from('supply_orders')
    .select('id, reference, quote_request_id, org_id, money_model, status, status_changed_at, created_at, updated_at, quote:quote_requests(reference), org:organisations(name)')
    .order('created_at', { ascending: false })
    .limit(1000)
  if (f.status) q = q.eq('status', f.status)
  if (f.model) q = q.eq('money_model', f.model)
  if (f.orgId) q = q.eq('org_id', f.orgId)
  if (f.quoteId) q = q.eq('quote_request_id', f.quoteId)
  const { data } = await q
  const ids = (data ?? []).map((o) => o.id)
  const { data: proofs } = ids.length ? await db.from('supply_delivery_proofs').select('order_id').in('order_id', ids).is('removed_at', null) : { data: [] }
  const withProof = new Set((proofs ?? []).map((p) => p.order_id))
  const rows = (data ?? []).map((o) => ({
    id: o.id,
    reference: o.reference,
    quoteId: o.quote_request_id,
    quoteReference: (o.quote as { reference: string } | null)?.reference ?? '',
    supplier: (o.org as { name: string } | null)?.name ?? '',
    orgId: o.org_id,
    model: o.money_model as MoneyModel,
    status: o.status as OrderStatus,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    needsAction: needsAction({ status: o.status as OrderStatus, statusChangedAt: o.status_changed_at, hasProof: withProof.has(o.id) }),
  }))
  return f.action ? rows.filter((r) => r.needsAction) : rows
}

export interface OrderLineView {
  id: string
  itemName: string
  quantity: number
  unit: string
  supplierUnitPriceCents: number
  vatFlag: string
  /** Owner only. */
  customerUnitPriceCents?: number | null
}

export interface OrderEventView {
  id: string
  type: string
  fromStatus: string | null
  toStatus: string | null
  reason: string | null
  actor: string | null
  createdAt: string
  detail: Record<string, unknown> | null
}

export interface OrderDetail {
  id: string
  reference: string
  quoteId: string
  quoteReference: string
  orgId: string
  supplier: string
  partnerStatus: string | null
  model: MoneyModel
  status: OrderStatus
  statusReason: string | null
  promisedOn: string | null
  proceedWithoutAgreement: boolean
  supplierDeliveryCents: number | null
  supplierTotalCents: number
  updatedAt: string
  createdAt: string
  lines: OrderLineView[]
  proofs: { id: string; url: string | null; type: string; takenAt: string | null; receivedBy: string | null; phone: string | null; note: string | null; uploadedBy: string | null; createdAt: string; removedAt: string | null; removedReason: string | null }[]
  events: OrderEventView[]
  contact: { name: string; phone: string | null; whatsapp: string | null } | null
  /** Owner only: money. */
  money?: {
    agreement: { id: string; model: string; commissionBps: number | null } | null
    commissionBps: number | null
    customerDeliveryCents: number | null
    customerTotalCents: number | null
    commissionDueCents: number | null
    ledger: LedgerSummary
    paidCents: number
    earnedCents: number
    entries: { id: string; type: string; direction: string; amountCents: number; occurredOn: string; method: string | null; reference: string | null; currency: string | null; originalAmountMinor: number | null; fxRate: number | null; reason: string | null; reversesEntryId: string | null; reversed: boolean }[]
  }
}

export async function orderDetail(orderId: string, owner: boolean): Promise<OrderDetail | null> {
  const db = getAdminSupabase()
  const { data: o } = await db.from('supply_orders').select('*, quote:quote_requests(reference), org:organisations(name)').eq('id', orderId).maybeSingle()
  if (!o) return null
  const [{ data: lines }, { data: proofs }, { data: events }, { data: partner }, { data: contacts }] = await Promise.all([
    db.from('supply_order_lines').select('*').eq('order_id', orderId).order('created_at'),
    db.from('supply_delivery_proofs').select('*').eq('order_id', orderId).order('created_at'),
    db.from('supply_order_events').select('*').eq('order_id', orderId).order('created_at'),
    db.from('supply_partners').select('relationship_status').eq('org_id', o.org_id).maybeSingle(),
    db.from('supply_contacts').select('name, phone, phone_normalised, whatsapp, do_not_contact, preferred_channel').eq('org_id', o.org_id).order('created_at'),
  ])
  const moneyLines = (lines ?? []).map((l) => ({ quantity: Number(l.quantity), supplierUnitPriceCents: l.supplier_unit_price_cents, customerUnitPriceCents: l.customer_unit_price_cents }))
  const supplierTotal = supplierTotalCents(moneyLines, o.supplier_delivery_charge_cents)
  const reachable = (contacts ?? []).filter((c) => !c.do_not_contact)
  const best = reachable.find((c) => c.preferred_channel) ?? reachable[0]
  const detail: OrderDetail = {
    id: o.id,
    reference: o.reference,
    quoteId: o.quote_request_id,
    quoteReference: (o.quote as { reference: string } | null)?.reference ?? '',
    orgId: o.org_id,
    supplier: (o.org as { name: string } | null)?.name ?? '',
    partnerStatus: partner?.relationship_status ?? null,
    model: o.money_model as MoneyModel,
    status: o.status as OrderStatus,
    statusReason: o.status_reason,
    promisedOn: o.promised_delivery_on,
    proceedWithoutAgreement: o.proceed_without_agreement,
    supplierDeliveryCents: o.supplier_delivery_charge_cents,
    supplierTotalCents: supplierTotal,
    updatedAt: o.updated_at,
    createdAt: o.created_at,
    lines: (lines ?? []).map((l) => ({
      id: l.id,
      itemName: l.item_name,
      quantity: Number(l.quantity),
      unit: l.unit,
      supplierUnitPriceCents: l.supplier_unit_price_cents,
      vatFlag: l.vat_flag,
      ...(owner ? { customerUnitPriceCents: l.customer_unit_price_cents } : {}),
    })),
    proofs: await Promise.all(
      (proofs ?? []).map(async (p) => ({
        id: p.id,
        url: p.removed_at ? null : await privateFileLink(p.file_path),
        type: p.file_type,
        takenAt: p.taken_at,
        receivedBy: p.received_by_name,
        phone: p.received_by_phone,
        note: p.note,
        uploadedBy: p.uploaded_by,
        createdAt: p.created_at,
        removedAt: p.removed_at,
        removedReason: p.removed_reason,
      })),
    ),
    // Payments are money: Operations sees the timeline without them.
    events: (events ?? [])
      .filter((e) => owner || e.event_type !== 'ledger_entry')
      .map((e) => ({ id: e.id, type: e.event_type, fromStatus: e.from_status, toStatus: e.to_status, reason: e.reason, actor: e.actor, createdAt: e.created_at, detail: (e.detail as Record<string, unknown> | null) ?? null })),
    contact: best ? { name: best.name, phone: best.phone_normalised ?? best.phone, whatsapp: best.whatsapp } : null,
  }
  if (owner) {
    const [{ data: agreement }, { data: entries }] = await Promise.all([
      o.agreement_id ? db.from('supply_agreements').select('id, money_model, commission_rate_bps').eq('id', o.agreement_id).maybeSingle() : Promise.resolve({ data: null }),
      db.from('supply_ledger_entries').select('*').eq('order_id', orderId).order('created_at'),
    ])
    const rows = entries ?? []
    const ledger = summariseLedger(rows)
    const reversed = new Set(rows.map((e) => e.reverses_entry_id).filter(Boolean))
    const bps = o.commission_rate_bps
    detail.money = {
      agreement: agreement ? { id: agreement.id, model: agreement.money_model, commissionBps: agreement.commission_rate_bps } : null,
      commissionBps: bps,
      customerDeliveryCents: o.customer_delivery_charge_cents,
      customerTotalCents: o.money_model === 'A' ? customerTotalCents(moneyLines, o.customer_delivery_charge_cents) : null,
      commissionDueCents: o.money_model === 'B' && bps !== null ? commissionDueCents(supplierTotal, bps) : null,
      ledger,
      paidCents: customerNetPaid(ledger),
      earnedCents: hagerlandEarned(o.money_model as MoneyModel, ledger),
      entries: rows.map((e) => ({ id: e.id, type: e.entry_type, direction: e.direction, amountCents: e.amount_cents, occurredOn: e.occurred_on, method: e.method, reference: e.reference, currency: e.original_currency, originalAmountMinor: e.original_amount_minor, fxRate: e.fx_rate === null ? null : Number(e.fx_rate), reason: e.reason, reversesEntryId: e.reverses_entry_id, reversed: reversed.has(e.id) })),
    }
  }
  return detail
}

export interface LedgerFilters {
  from?: string
  to?: string
  orgId?: string
  orderReference?: string
  type?: string
}

export interface LedgerEntryRow {
  id: string
  type: string
  direction: string
  amountCents: number
  occurredOn: string
  method: string | null
  reference: string | null
  currency: string | null
  originalAmountMinor: number | null
  fxRate: number | null
  orderId: string | null
  orderReference: string | null
  supplier: string | null
  reason: string | null
  note: string | null
  reversesEntryId: string | null
  reversed: boolean
  createdBy: string | null
  createdAt: string
}

export const LEDGER_TYPES = ['customer_payment', 'supplier_payment', 'commission_due', 'commission_received', 'service_fee', 'refund', 'adjustment', 'reversal']

/** Ledger filters from the page's or CSV link's search parameters (shared so the CSV matches the page). */
export function ledgerFilters(sp: Record<string, string | undefined>): LedgerFilters {
  const date = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined)
  return {
    from: date(sp.from),
    to: date(sp.to),
    orgId: sp.supplier && /^[0-9a-f-]{36}$/.test(sp.supplier) ? sp.supplier : undefined,
    orderReference: sp.order && /^HLO-\d{4}-\d{6}$/i.test(sp.order) ? sp.order.toUpperCase() : undefined,
    type: LEDGER_TYPES.includes(sp.type ?? '') ? sp.type : undefined,
  }
}

/** Owner only: call this from owner-only pages and routes. */
export async function ledgerEntries(f: LedgerFilters): Promise<LedgerEntryRow[]> {
  const db = getAdminSupabase()
  let q = db
    .from('supply_ledger_entries')
    .select('*, order:supply_orders(reference), org:organisations(name)')
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5000)
  if (f.from) q = q.gte('occurred_on', f.from)
  if (f.to) q = q.lte('occurred_on', f.to)
  if (f.orgId) q = q.eq('org_id', f.orgId)
  if (f.type) q = q.eq('entry_type', f.type)
  const { data } = await q
  const { data: reversals } = await db.from('supply_ledger_entries').select('reverses_entry_id').not('reverses_entry_id', 'is', null).limit(10000)
  const reversed = new Set((reversals ?? []).map((r) => r.reverses_entry_id))
  const rows = (data ?? []).map((e) => ({
    id: e.id,
    type: e.entry_type,
    direction: e.direction,
    amountCents: e.amount_cents,
    occurredOn: e.occurred_on,
    method: e.method,
    reference: e.reference,
    currency: e.original_currency,
    originalAmountMinor: e.original_amount_minor,
    fxRate: e.fx_rate === null ? null : Number(e.fx_rate),
    orderId: e.order_id,
    orderReference: (e.order as { reference: string } | null)?.reference ?? null,
    supplier: (e.org as { name: string } | null)?.name ?? null,
    reason: e.reason,
    note: e.note,
    reversesEntryId: e.reverses_entry_id,
    reversed: reversed.has(e.id),
    createdBy: e.created_by,
    createdAt: e.created_at,
  }))
  return f.orderReference ? rows.filter((r) => r.orderReference === f.orderReference) : rows
}

/** Per-order money summary for the ledger page (owner only). */
export async function orderSummaries(orderIds: string[]): Promise<{ id: string; reference: string; supplier: string; model: MoneyModel; status: string; summary: LedgerSummary; earnedCents: number }[]> {
  if (!orderIds.length) return []
  const db = getAdminSupabase()
  const [{ data: orders }, { data: entries }] = await Promise.all([
    db.from('supply_orders').select('id, reference, money_model, status, org:organisations(name)').in('id', orderIds),
    db.from('supply_ledger_entries').select('id, entry_type, direction, amount_cents, reverses_entry_id, order_id').in('order_id', orderIds),
  ])
  return (orders ?? [])
    .map((o) => {
      const summary = summariseLedger((entries ?? []).filter((e) => e.order_id === o.id))
      return { id: o.id, reference: o.reference, supplier: (o.org as { name: string } | null)?.name ?? '', model: o.money_model as MoneyModel, status: o.status, summary, earnedCents: hagerlandEarned(o.money_model as MoneyModel, summary) }
    })
    .sort((a, b) => b.reference.localeCompare(a.reference))
}

/** Owner only: chosen supplier lines of a quote not yet in a live order, grouped by supplier, with any active agreement. */
export async function orderableGroups(quoteId: string): Promise<{ orgId: string; name: string; trial: boolean; lines: number; agreement: { model: string; commissionBps: number | null } | null }[]> {
  const db = getAdminSupabase()
  const { data: chosen } = await db.from('supply_quote_lines').select('id, org_id').eq('quote_request_id', quoteId).eq('status', 'chosen')
  const ids = (chosen ?? []).map((c) => c.id)
  if (!ids.length) return []
  const { data: used } = await db.from('supply_order_lines').select('supply_quote_line_id, order:supply_orders!inner(status)').in('supply_quote_line_id', ids).neq('order.status', 'cancelled')
  const taken = new Set((used ?? []).map((u) => u.supply_quote_line_id))
  const counts = new Map<string, number>()
  for (const c of chosen ?? []) if (!taken.has(c.id)) counts.set(c.org_id, (counts.get(c.org_id) ?? 0) + 1)
  const orgIds = Array.from(counts.keys())
  if (!orgIds.length) return []
  const [{ data: partners }, { data: agreements }] = await Promise.all([
    db.from('supply_partners').select('org_id, relationship_status, org:organisations(name)').in('org_id', orgIds),
    db.from('supply_agreements').select('org_id, money_model, commission_rate_bps').in('org_id', orgIds).eq('status', 'active'),
  ])
  return orgIds
    .map((orgId) => {
      const p = (partners ?? []).find((x) => x.org_id === orgId)
      const a = (agreements ?? []).find((x) => x.org_id === orgId)
      return { orgId, name: (p?.org as { name: string } | null)?.name ?? '', trial: p?.relationship_status === 'terms_agreed', lines: counts.get(orgId) ?? 0, agreement: a ? { model: a.money_model, commissionBps: a.commission_rate_bps } : null }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}
