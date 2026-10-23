import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { audit, isOwnerSession } from '@/lib/admin/guard'
import { toCsv } from '@/lib/admin/csv'
import { supplyReport } from '@/lib/supply/insights-data'
import { todayInAddis } from '@/lib/supply/shortlist'

export const dynamic = 'force-dynamic'

const etb = (cents: number) => (cents / 100).toFixed(2)

/** One table of the monthly supply report as CSV: owner only, recorded in the audit log. */
export async function GET(request: NextRequest) {
  if (!(await isAdminRequest()) || !(await isOwnerSession())) return new NextResponse('Unauthorized', { status: 401 })
  const sp = request.nextUrl.searchParams
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.get('month') ?? '') ? (sp.get('month') as string) : todayInAddis().slice(0, 7)
  const table = sp.get('table') ?? 'orders'
  const r = await supplyReport(month)
  let rows: Record<string, unknown>[]
  switch (table) {
    case 'orders':
      rows = r.orders.map((o) => ({ money_model: o.model, created: o.created, completed: o.completed, cancelled: o.cancelled, problems: o.disputed, order_value_etb: etb(o.valueCents), value_basis: o.model === 'A' ? 'customer totals' : 'supplier totals' }))
      break
    case 'money':
      rows = [{ earned_etb: etb(r.earnedCents), customer_payments_etb: etb(r.ledger.customerPaid), supplier_payments_etb: etb(r.ledger.supplierPaid), refunds_etb: etb(r.ledger.refunds), service_fees_etb: etb(r.ledger.serviceFees), commission_due_etb: etb(r.ledger.commissionDue), commission_received_etb: etb(r.ledger.commissionReceived), reconciles_with_ledger: r.reconciliation.reconciles ? 'yes' : 'no' }]
      break
    case 'ageing':
      rows = r.ageing.map((a) => ({ owed_for: a.bucket, orders: a.orders, amount_etb: etb(a.cents) }))
      break
    case 'items':
      rows = r.topItems.map((i) => ({ item: i.name, unit: i.unit, quantity: i.quantity, quotes: i.requests }))
      break
    case 'areas':
      rows = r.topAreas.map((a) => ({ area: a.area, quotes: a.requests }))
      break
    case 'partners':
      rows = r.topPartners.map((p) => ({ partner: p.name, orders: p.orders, supplier_total_etb: etb(p.supplierTotalCents) }))
      break
    default:
      return new NextResponse('Unknown table', { status: 400 })
  }
  await audit('supply.report.export', { type: 'supply_report', label: `${month} ${table}` }, { month, table, rows: rows.length })
  return new NextResponse(toCsv(rows), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="supply-report-${month}-${table}.csv"` } })
}
