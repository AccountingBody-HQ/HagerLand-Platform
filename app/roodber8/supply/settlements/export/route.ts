import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { audit, isOwnerSession } from '@/lib/admin/guard'
import { toCsv } from '@/lib/admin/csv'
import { listSettlements } from '@/lib/supply/settlements-data'
import { todayInAddis } from '@/lib/supply/shortlist'

export const dynamic = 'force-dynamic'

const etb = (cents: number) => (cents / 100).toFixed(2)

/** S6-3: every settlement as CSV (owner only, recorded in the audit log). Partner and amounts only: no customer data. */
export async function GET() {
  if (!(await isAdminRequest()) || !(await isOwnerSession())) return new NextResponse('Unauthorized', { status: 401 })
  const rows = (await listSettlements()).map((s) => ({ reference: s.reference, partner: s.partner, period_from: s.from, period_to: s.to, status: s.status, total_etb: etb(s.totalCents), paid_on: s.paidOn ?? '' }))
  await audit('supply.settlement.export', { type: 'settlements', label: `${rows.length} rows` })
  const stamp = todayInAddis()
  return new NextResponse(`﻿${toCsv(rows)}`, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="hagerland-settlements-${stamp}.csv"`, 'Cache-Control': 'no-store' },
  })
}
