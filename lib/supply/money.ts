// Supply Phase 4 (admin): money and order rules, pure and unit-tested. The database applies the same rules in
// migration 0037 (golden rule, allowed status changes); a unit test checks the two transition tables match.
// Money is whole ETB cents. Rounding: half up to the cent (prices × decimal quantities), as Postgres round() does
// for positive amounts.

export const ORDER_STATUSES = ['draft', 'awaiting_payment', 'paid', 'placed', 'confirmed', 'out_for_delivery', 'delivered', 'completed', 'cancelled', 'disputed'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]
export type MoneyModel = 'A' | 'B'

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  draft: 'Draft',
  awaiting_payment: 'Waiting for customer payment',
  paid: 'Paid by customer',
  placed: 'Placed with supplier',
  confirmed: 'Confirmed by supplier',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
}

export const MODEL_LABEL: Record<MoneyModel | 'both', string> = {
  A: 'A: customer pays HagerLand (margin)',
  B: 'B: customer pays the supplier (commission)',
  both: 'Both (chosen per order)',
}

export const ENTRY_LABEL: Record<string, string> = {
  customer_payment: 'Customer payment',
  supplier_payment: 'Payment to supplier',
  refund: 'Refund to customer',
  service_fee: 'Service fee',
  commission_due: 'Commission due',
  commission_received: 'Commission received',
  adjustment: 'Adjustment',
  reversal: 'Reversal',
}

const AFTER_PLACED: Partial<Record<OrderStatus, OrderStatus[]>> = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'disputed', 'cancelled'],
  delivered: ['completed', 'disputed'],
  disputed: ['delivered', 'cancelled'],
}

/** Allowed status changes (the same table as supply_order_transition_allowed in migration 0037). */
export const ORDER_TRANSITIONS: Record<MoneyModel, Partial<Record<OrderStatus, OrderStatus[]>>> = {
  A: { draft: ['awaiting_payment', 'cancelled'], awaiting_payment: ['paid', 'cancelled'], paid: ['placed', 'cancelled'], ...AFTER_PLACED },
  B: { draft: ['placed', 'cancelled'], ...AFTER_PLACED },
}

export function canTransition(model: MoneyModel, from: OrderStatus, to: OrderStatus): boolean {
  return (ORDER_TRANSITIONS[model][from] ?? []).includes(to)
}

/** Half up to the cent, for non-negative amounts. */
export function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5 + Number.EPSILON * Math.abs(value))
}

export function lineTotalCents(unitPriceCents: number, quantity: number): number {
  return roundHalfUp(unitPriceCents * quantity)
}

export interface MoneyLine {
  quantity: number
  supplierUnitPriceCents: number
  customerUnitPriceCents: number | null
}

export function supplierTotalCents(lines: MoneyLine[], supplierDeliveryCents: number | null): number {
  return lines.reduce((sum, l) => sum + lineTotalCents(l.supplierUnitPriceCents, l.quantity), 0) + (supplierDeliveryCents ?? 0)
}

/** Model A: what the customer pays. Null while any line has no customer price yet. */
export function customerTotalCents(lines: MoneyLine[], customerDeliveryCents: number | null): number | null {
  if (lines.some((l) => l.customerUnitPriceCents === null)) return null
  return lines.reduce((sum, l) => sum + lineTotalCents(l.customerUnitPriceCents as number, l.quantity), 0) + (customerDeliveryCents ?? 0)
}

/** Model B: commission on the supplier total at a rate in basis points (500 = 5%). */
export function commissionDueCents(supplierTotal: number, rateBps: number): number {
  return roundHalfUp((supplierTotal * rateBps) / 10_000)
}

/** "5" → 500, "2.5" → 250, "12.75" → 1275; null when not a percentage between 0 and 100. */
export function percentToBps(input: string): number | null {
  const text = input.trim().replace(/%$/, '').trim()
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(text)) return null
  const bps = Math.round(Number(text) * 100)
  return bps <= 10_000 ? bps : null
}

export function bpsToPercent(bps: number): string {
  return `${bps % 100 === 0 ? String(bps / 100) : (bps / 100).toFixed(2).replace(/0$/, '')}%`
}

export interface LedgerRow {
  id: string
  entry_type: string
  direction: string
  amount_cents: number
  reverses_entry_id: string | null
}

export interface LedgerSummary {
  customerPaid: number
  refunds: number
  supplierPaid: number
  commissionDue: number
  commissionReceived: number
  serviceFees: number
  adjustmentsIn: number
  adjustmentsOut: number
}

const EMPTY: LedgerSummary = { customerPaid: 0, refunds: 0, supplierPaid: 0, commissionDue: 0, commissionReceived: 0, serviceFees: 0, adjustmentsIn: 0, adjustmentsOut: 0 }

function bucket(type: string, direction: string): keyof LedgerSummary | null {
  switch (type) {
    case 'customer_payment':
      return 'customerPaid'
    case 'refund':
      return 'refunds'
    case 'supplier_payment':
      return 'supplierPaid'
    case 'commission_due':
      return 'commissionDue'
    case 'commission_received':
      return 'commissionReceived'
    case 'service_fee':
      return 'serviceFees'
    case 'adjustment':
      return direction === 'in' ? 'adjustmentsIn' : 'adjustmentsOut'
    default:
      return null
  }
}

/** Totals per kind of entry; a reversal takes its amount back out of the kind it reverses. */
export function summariseLedger(entries: LedgerRow[]): LedgerSummary {
  const byId = new Map(entries.map((e) => [e.id, e]))
  const out = { ...EMPTY }
  for (const e of entries) {
    if (e.entry_type === 'reversal') {
      const original = e.reverses_entry_id ? byId.get(e.reverses_entry_id) : undefined
      const key = original ? bucket(original.entry_type, original.direction) : null
      if (key) out[key] -= e.amount_cents
    } else {
      const key = bucket(e.entry_type, e.direction)
      if (key) out[key] += e.amount_cents
    }
  }
  return out
}

/** What the customer has paid for a model A order (payments minus refunds), as the database's golden rule counts it. */
export function customerNetPaid(s: LedgerSummary): number {
  return s.customerPaid - s.refunds
}

/** What can still be refunded to the customer on a model A order: payments minus refunds already recorded, never below 0. */
export function refundableCents(s: LedgerSummary): number {
  return Math.max(0, customerNetPaid(s))
}

/**
 * What HagerLand earned on an order. Model A: customer payments − refunds − supplier payments + service fees.
 * Model B: commission received + service fees. Adjustments add (in) or subtract (out) in both.
 */
export function hagerlandEarned(model: MoneyModel, s: LedgerSummary): number {
  const extra = s.serviceFees + s.adjustmentsIn - s.adjustmentsOut
  return model === 'A' ? s.customerPaid - s.refunds - s.supplierPaid + extra : s.commissionReceived + extra
}

export interface ActionCheck {
  status: OrderStatus
  statusChangedAt: string
  hasProof: boolean
}

const DAY = 86_400_000

/** Orders that need someone to act: waiting too long at a step, or delivered without proof. */
export function needsAction(o: ActionCheck, now = Date.now()): string | null {
  const days = (now - new Date(o.statusChangedAt).getTime()) / DAY
  if (o.status === 'awaiting_payment' && days > 3) return 'Waiting for payment for more than 3 days'
  if (o.status === 'placed' && days > 2) return 'Not confirmed by the supplier after 2 days'
  if (o.status === 'out_for_delivery' && days > 3) return 'Out for delivery for more than 3 days'
  if (o.status === 'delivered' && !o.hasProof) return 'Delivered without delivery proof'
  return null
}
