import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { audit, isOwnerSession } from '@/lib/admin/guard'
import { toCsv } from '@/lib/admin/csv'
import { reconciliationData } from '@/lib/supply/settlements-data'
import { FIGURE_LABEL, reconcilesText, type RecFigures } from '@/lib/supply/settlements'
import { todayInAddis } from '@/lib/supply/shortlist'

export const dynamic = 'force-dynamic'

const etb = (cents: number) => (cents / 100).toFixed(2)
const KEYS = Object.keys(FIGURE_LABEL) as (keyof RecFigures)[]

/** S6-3: the Supply settlements report as CSV (owner only, recorded in the audit log). One row per month and to date. */
export async function GET() {
  if (!(await isAdminRequest()) || !(await isOwnerSession())) return new NextResponse('Unauthorized', { status: 401 })
  const r = await reconciliationData()
  const row = (period: string, f: RecFigures) => ({ period, currency: 'ETB', ...Object.fromEntries(KEYS.map((k) => [k, etb(f[k])])), reconciles_with_ledger: reconcilesText(r) })
  const rows = [row('to date', r.toDate), ...r.months.map((m) => row(m.month, m.figures))]
  await audit('supply.settlement.report_export', { type: 'supply-settlements', label: `${rows.length} rows` })
  const stamp = todayInAddis()
  return new NextResponse(`﻿${toCsv(rows)}`, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="hagerland-supply-settlements-${stamp}.csv"`, 'Cache-Control': 'no-store' },
  })
}
