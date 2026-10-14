import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Trade prices for the signed-in user's approved trade account (spec 25.2e). Everyone else gets an empty list:
 * the database function itself refuses non-trade users, so prices are never exposed publicly.
 */
export async function GET(request: NextRequest) {
  const ids = z.array(z.uuid()).max(50).safeParse((request.nextUrl.searchParams.get('ids') ?? '').split(',').filter(Boolean))
  const headers = { 'Cache-Control': 'private, no-store' }
  if (!ids.success || ids.data.length === 0 || !(await getUser())) return NextResponse.json({ prices: {} }, { headers })
  const { data } = await getServerSupabase().rpc('product_trade_prices', { p_ids: ids.data })
  const prices = Object.fromEntries((data ?? []).map((r) => [r.id, r.trade_price_etb_cents]))
  return NextResponse.json({ prices }, { headers })
}
