import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { audit, isOwnerSession } from '@/lib/admin/guard'
import { toCsv } from '@/lib/admin/csv'
import { ledgerEntries, ledgerFilters } from '@/lib/supply/orders-data'
import { todayInAddis } from '@/lib/supply/shortlist'

export const dynamic = 'force-dynamic'

/** The supply ledger as CSV: owner only, recorded in the audit log. */
export async function GET(request: NextRequest) {
  if (!(await isAdminRequest()) || !(await isOwnerSession())) return new NextResponse('Unauthorized', { status: 401 })
  const f = ledgerFilters(Object.fromEntries(request.nextUrl.searchParams))
  const rows = await ledgerEntries(f)
  await audit('supply.ledger.export', { type: 'supply_ledger', label: 'CSV' }, { rows: rows.length, filters: { ...f } })
  const csv = toCsv(
    rows.map((e) => ({ date: e.occurredOn, kind: e.type, direction: e.direction, amount_etb: (e.amountCents / 100).toFixed(2), currency: e.currency ?? '', original_amount: e.originalAmountMinor === null ? '' : (e.originalAmountMinor / 100).toFixed(2), fx_rate: e.fxRate ?? '', order: e.orderReference ?? '', supplier: e.supplier ?? '', method: e.method ?? '', reference: e.reference ?? '', reason: e.reason ?? '', reverses: e.reversesEntryId ?? '', recorded_by: e.createdBy ?? '', recorded_at: e.createdAt })),
    ['date', 'kind', 'direction', 'amount_etb', 'currency', 'original_amount', 'fx_rate', 'order', 'supplier', 'method', 'reference', 'reason', 'reverses', 'recorded_by', 'recorded_at'],
  )
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="supply-ledger-${todayInAddis()}.csv"` } })
}
