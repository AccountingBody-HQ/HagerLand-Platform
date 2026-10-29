import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { audit, isOwnerSession } from '@/lib/admin/guard'
import { toCsv } from '@/lib/admin/csv'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { readAll, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import { loadAgreements } from '@/lib/supply/trade-prices-data'

export const dynamic = 'force-dynamic'

const etb = (cents: number | null) => (cents === null ? '' : (cents / 100).toFixed(2))

/**
 * S6-4: every trade price agreement as CSV (owner only, recorded in the audit log). The trade account's reference and
 * business name only: no phone, TIN, partner, cost or terms.
 */
export async function GET() {
  if (!(await isAdminRequest()) || !(await isOwnerSession())) return new NextResponse('Unauthorized', { status: 401 })
  const [agreements, { data: accounts }] = await Promise.all([
    loadAgreements(),
    readAll(() => getAdminSupabase().from('trade_accounts').select('id, reference, business_name'), { maxRows: REPORT_MAX_ROWS }),
  ])
  const byId = new Map(accounts.map((a) => [a.id, a]))
  const rows = agreements.map((a) => ({
    trade_account: byId.get(a.tradeAccountId)?.reference ?? '',
    business: byId.get(a.tradeAccountId)?.business_name ?? '',
    product: a.productName ?? '',
    category: a.categoryName ?? '',
    price_etb: etb(a.priceCents),
    discount_percent: a.discountBps === null ? '' : (a.discountBps / 100).toString(),
    valid_from: a.validFrom,
    valid_until: a.validUntil ?? '',
    status: a.status,
    end_reason: a.endReason ?? '',
    note: a.note ?? '',
  }))
  await audit('trade_price.export', { type: 'trade_price_agreements', label: `${rows.length} rows` })
  const stamp = new Date().toISOString().slice(0, 10)
  return new NextResponse(`﻿${toCsv(rows)}`, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="hagerland-trade-prices-${stamp}.csv"`, 'Cache-Control': 'no-store' },
  })
}
