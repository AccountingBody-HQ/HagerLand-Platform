// S6-3 settlements and the reconciliation report (migration 0050): pure rules shared by admin, the CSVs and the tests.
// Money is owner only. Amounts are whole cents in ETB (payments in another currency are recorded in birr in the ledger),
// so the report never adds currencies together.
import { formatETBCents } from '@/lib/format'
import { addisDay } from '@/lib/jobs-privacy'

export const SETTLEMENT_STATUSES = ['draft', 'approved', 'paid', 'void'] as const
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number]
export const SETTLEMENT_STATUS_LABEL: Record<SettlementStatus, string> = { draft: 'Draft', approved: 'Approved (to pay)', paid: 'Paid', void: 'Void' }
export const SETTLEMENT_MOVES: Record<SettlementStatus, SettlementStatus[]> = { draft: ['approved', 'void'], approved: ['paid', 'void'], paid: [], void: [] }

export const METHOD_LABEL: Record<string, string> = { bank_transfer: 'bank transfer', telebirr: 'telebirr', cbe_birr: 'CBE Birr', cash: 'cash', card: 'card', other: 'other' }

/** ETB without the currency word ("1,250.50"), for the statement's "Amount due (ETB)" column. */
export function etbNumber(cents: number): string {
  return formatETBCents(cents).replace(/^ETB\s*/, '')
}

// ---------------------------------------------------------------------------------------------------------------
// The partner statement (AB's approved text, verbatim; section 3 of the S6-3 brief)
// ---------------------------------------------------------------------------------------------------------------
export interface StatementInput {
  reference: string
  business: string
  from: string
  to: string
  rows: { order: string; deliveredOn: string; item: string; quantity: string; amountCents: number }[]
  adjustments: { reason: string; amountCents: number }[]
  totalCents: number
  paid: { on: string; method: string; reference: string } | null
}

export interface Statement {
  title: string
  lines: string[]
  headings: string[]
  rows: string[][]
  footer: string
}

export function buildStatement(s: StatementInput): Statement {
  return {
    title: `HagerLand Supply — statement ${s.reference}`,
    lines: [`Partner: ${s.business}`, `Period: ${s.from} to ${s.to}`],
    headings: ['Order', 'Delivered on', 'Item', 'Quantity', 'Amount due (ETB)'],
    rows: [
      ...s.rows.map((r) => [r.order, r.deliveredOn, r.item, r.quantity, etbNumber(r.amountCents)]),
      ...s.adjustments.map((a) => [`Adjustment: ${a.reason}`, '', '', '', etbNumber(a.amountCents)]),
      [`Total due: ETB ${etbNumber(s.totalCents)}`, '', '', '', ''],
      ...(s.paid ? [[`Paid on ${s.paid.on} (${METHOD_LABEL[s.paid.method] ?? s.paid.method}, reference ${s.paid.reference})`, '', '', '', '']] : []),
    ],
    footer: 'Questions? Contact HagerLand Supply.',
  }
}

const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** A plain, printable page (no site chrome): only the statement. */
export function statementHtml(st: Statement): string {
  const body = st.rows.map((r) => (r[1] === '' && r[2] === '' ? `<tr><td colspan="4"><strong>${esc(r[0])}</strong></td><td class="n">${esc(r[4])}</td></tr>` : `<tr>${r.map((c, i) => `<td${i === 4 ? ' class="n"' : ''}>${esc(c)}</td>`).join('')}</tr>`)).join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(st.title)}</title>
<style>body{font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#1b2430;margin:24px;max-width:900px}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border-bottom:1px solid #e4e6e3;padding:8px;text-align:left;font-size:14px}.n{text-align:right;white-space:nowrap}p{margin:4px 0}@media print{body{margin:0}}</style></head>
<body><h1>${esc(st.title)}</h1>${st.lines.map((l) => `<p>${esc(l)}</p>`).join('')}
<table><thead><tr>${st.headings.map((h, i) => `<th${i === 4 ? ' class="n"' : ''}>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>
<p style="margin-top:24px">${esc(st.footer)}</p></body></html>`
}

// ---------------------------------------------------------------------------------------------------------------
// The reconciliation report (owner only)
// ---------------------------------------------------------------------------------------------------------------
export interface RecPayment {
  requestId: string
  type: string
  amountCents: number
  occurredOn: string
  reversedType: string | null
}
export interface RecOrder {
  id: string
  reference: string
  requestId: string
  requestReference: string
  orgId: string
  status: string
  deliveredAt: string | null
  deliveryIncomeCents: number
  payableCents: number
  lines: { customerCents: number; payableUnitCents: number | null; customerUnitCents: number | null; reference: string }[]
}
export interface RecLedger {
  orderId: string
  type: string
  direction: string
  amountCents: number
  occurredOn: string
  reference: string | null
  reversedType: string | null
  reversedReference: string | null
}
export interface RecSettlement {
  id: string
  reference: string
  status: string
  totalCents: number
  items: { kind: string; orderId: string | null; amountCents: number; void: boolean; createdAt: string }[]
}
export interface RecPending {
  amountCents: number
  createdAt: string
}

export interface RecFigures {
  moneyIn: number
  refunds: number
  deliveryIncome: number
  payablesEarned: number
  adjustments: number
  paidToPartners: number
  dueToPartners: number
  margin: number
}
export interface RecCheck {
  label: string
  ok: boolean
  references: string[]
}
export interface Reconciliation {
  months: { month: string; figures: RecFigures }[]
  toDate: RecFigures
  checks: RecCheck[]
  reconciles: boolean
}

const ZERO = (): RecFigures => ({ moneyIn: 0, refunds: 0, deliveryIncome: 0, payablesEarned: 0, adjustments: 0, paidToPartners: 0, dueToPartners: 0, margin: 0 })
const monthOf = (day: string) => day.slice(0, 7)

/** Signed effect of a ledger or request entry, with reversals taking their entry back out. */
function signed(type: string, amount: number, reversedType: string | null, positive: string[]): number {
  if (positive.includes(type)) return amount
  if (type === 'reversal' && reversedType && positive.includes(reversedType)) return -amount
  return 0
}

export const CHECK_LABEL = {
  settlements: 'Every paid settlement equals its ledger entries',
  moved: 'Customer money moved from order requests equals the ledger customer payments on their supply orders',
  twice: 'No delivered order paid out twice',
  margin: 'No line sold below what the partner is paid',
  totals: 'Every settlement total equals its items',
} as const

/**
 * Figures per Addis Ababa month (and to date) and the five checks. "Reconciles with ledger" is yes only when every
 * check passes; each "no" lists the references to look at.
 */
export function reconcile(input: { payments: RecPayment[]; orders: RecOrder[]; ledger: RecLedger[]; settlements: RecSettlement[]; pending: RecPending[] }): Reconciliation {
  const byMonth = new Map<string, RecFigures>()
  const at = (day: string) => {
    const m = monthOf(day)
    if (!byMonth.has(m)) byMonth.set(m, ZERO())
    return byMonth.get(m) as RecFigures
  }
  const settlementRefs = new Set(input.settlements.map((s) => s.reference))
  for (const p of input.payments) {
    at(p.occurredOn).moneyIn += signed(p.type, p.amountCents, p.reversedType, ['customer_payment'])
    at(p.occurredOn).refunds += signed(p.type, p.amountCents, p.reversedType, ['refund'])
  }
  const delivered = new Set(input.orders.filter((o) => o.status !== 'cancelled' && o.deliveredAt).map((o) => o.id))
  for (const e of input.ledger) {
    const refund = signed(e.type, e.amountCents, e.reversedType, ['refund'])
    at(e.occurredOn).refunds += refund
    // Only a refund on something delivered (counted as sold) lowers the margin.
    if (delivered.has(e.orderId)) at(e.occurredOn).margin -= refund
    const ref = e.type === 'reversal' ? e.reversedReference : e.reference
    if (ref && settlementRefs.has(ref)) {
      const paidSign = e.type === 'supplier_payment' || (e.type === 'adjustment' && e.direction === 'out') ? 1 : e.type === 'adjustment' && e.direction === 'in' ? -1 : 0
      const reversalSign = e.type === 'reversal' ? (e.direction === 'in' ? -1 : 1) : 0
      at(e.occurredOn).paidToPartners += e.amountCents * (paidSign || reversalSign)
    }
  }
  for (const o of input.orders) {
    if (o.status === 'cancelled' || !o.deliveredAt) continue
    const f = at(addisDay(new Date(o.deliveredAt)))
    f.deliveryIncome += o.deliveryIncomeCents
    f.payablesEarned += o.payableCents
    f.margin += o.lines.reduce((sum, l) => sum + l.customerCents, 0) - o.payableCents
  }
  for (const s of input.settlements) for (const i of s.items) if (i.kind === 'adjustment' && !i.void && s.status !== 'void') at(addisDay(new Date(i.createdAt))).adjustments += i.amountCents
  for (const p of input.pending) at(addisDay(new Date(p.createdAt))).adjustments += p.amountCents
  const months = Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b))
  let running = 0
  for (const [, f] of months) {
    // A partner adjustment is negative when the partner repays HagerLand: that raises the margin.
    f.margin -= f.adjustments
    running += f.payablesEarned + f.adjustments - f.paidToPartners
    f.dueToPartners = running
  }
  const toDate = months.reduce<RecFigures>((t, [, f]) => {
    for (const k of Object.keys(t) as (keyof RecFigures)[]) if (k !== 'dueToPartners') t[k] += f[k]
    return t
  }, ZERO())
  toDate.dueToPartners = running

  // The five checks.
  const failSettlements: string[] = []
  const failTotals: string[] = []
  for (const s of input.settlements) {
    if (s.status !== 'void' && s.items.reduce((sum, i) => sum + i.amountCents, 0) !== s.totalCents) failTotals.push(s.reference)
    if (s.status !== 'paid') continue
    const payables = s.items.filter((i) => i.kind === 'payable').reduce((sum, i) => sum + i.amountCents, 0)
    const adjustments = s.items.filter((i) => i.kind === 'adjustment').reduce((sum, i) => sum + i.amountCents, 0)
    const ledgerPay = input.ledger.reduce((sum, e) => sum + (e.reference === s.reference ? signed(e.type, e.amountCents, null, ['supplier_payment']) : e.reversedReference === s.reference ? signed(e.type, e.amountCents, e.reversedType, ['supplier_payment']) : 0), 0)
    const ledgerAdj = input.ledger.filter((e) => e.type === 'adjustment' && e.reference === s.reference).reduce((sum, e) => sum + (e.direction === 'out' ? e.amountCents : -e.amountCents), 0)
    if (payables !== ledgerPay || adjustments !== ledgerAdj) failSettlements.push(s.reference)
  }
  const failMoved: string[] = []
  const moved = new Map<string, number>()
  for (const p of input.payments) if (p.type === 'moved_to_order') moved.set(p.requestId, (moved.get(p.requestId) ?? 0) + p.amountCents)
  const orderRequest = new Map(input.orders.map((o) => [o.id, o]))
  const ledgerIn = new Map<string, number>()
  for (const e of input.ledger) {
    const o = orderRequest.get(e.orderId)
    if (!o) continue
    const isMove = (e.type === 'customer_payment' && e.reference === o.requestReference) || (e.type === 'reversal' && e.reversedType === 'customer_payment' && e.reversedReference === o.requestReference)
    if (isMove) ledgerIn.set(o.requestId, (ledgerIn.get(o.requestId) ?? 0) + signed(e.type, e.amountCents, e.reversedType, ['customer_payment']))
  }
  const requestRef = new Map(input.orders.map((o) => [o.requestId, o.requestReference]))
  for (const id of Array.from(new Set([...moved.keys(), ...ledgerIn.keys()]))) if ((moved.get(id) ?? 0) !== (ledgerIn.get(id) ?? 0)) failMoved.push(requestRef.get(id) ?? id)
  const failTwice: string[] = []
  for (const o of input.orders) {
    const paid = input.ledger.filter((e) => e.orderId === o.id).reduce((sum, e) => sum + signed(e.type, e.amountCents, e.reversedType, ['supplier_payment']), 0)
    const live = input.settlements.flatMap((s) => s.items.filter((i) => i.kind === 'payable' && i.orderId === o.id && !i.void && s.status !== 'void')).length
    if (paid > o.payableCents || live > 1) failTwice.push(o.reference)
  }
  const failMargin = Array.from(new Set(input.orders.flatMap((o) => o.lines.filter((l) => l.customerUnitCents !== null && l.payableUnitCents !== null && l.customerUnitCents < l.payableUnitCents).map((l) => l.reference))))
  const checks: RecCheck[] = [
    { label: CHECK_LABEL.settlements, ok: !failSettlements.length, references: failSettlements },
    { label: CHECK_LABEL.moved, ok: !failMoved.length, references: failMoved },
    { label: CHECK_LABEL.twice, ok: !failTwice.length, references: failTwice },
    { label: CHECK_LABEL.margin, ok: !failMargin.length, references: failMargin },
    { label: CHECK_LABEL.totals, ok: !failTotals.length, references: failTotals },
  ]
  return { months: months.map(([month, figures]) => ({ month, figures })), toDate, checks, reconciles: checks.every((c) => c.ok) }
}

/** "yes", or "no (…)" with the failing checks and their references. */
export function reconcilesText(r: Reconciliation): string {
  if (r.reconciles) return 'yes'
  return `no (${r.checks.filter((c) => !c.ok).map((c) => `${c.label}: ${c.references.join(', ')}`).join('; ')})`
}

export const FIGURE_LABEL: Record<keyof RecFigures, string> = {
  moneyIn: 'Money in from customers',
  refunds: 'Refunds to customers',
  deliveryIncome: 'Delivery income (HagerLand)',
  payablesEarned: 'Partner payables earned (delivered)',
  adjustments: 'Partner adjustments',
  paidToPartners: 'Paid to partners',
  dueToPartners: 'Due to partners (unpaid)',
  margin: 'HagerLand margin',
}
