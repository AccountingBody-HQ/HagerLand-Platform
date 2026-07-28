import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { verifySessionToken } from '@/lib/admin-auth'

export async function GET() {
  const supabase = createBirrBankAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: today_prices } = await supabase
    .schema('birrbank')
    .from('commodity_prices')
    .select('id, commodity_code, commodity_name, commodity_type, grade, region_of_origin, price_etb, price_change, price_change_pct, trade_date, volume_kg')
    .eq('trade_date', today)
    .order('commodity_type')
    .order('commodity_name')

  const { data: all_prices } = await supabase
    .schema('birrbank')
    .from('commodity_prices')
    .select('id, commodity_code, commodity_name, commodity_type, grade, region_of_origin, price_etb, price_change, price_change_pct, trade_date, volume_kg')
    .order('trade_date', { ascending: false })
    .order('commodity_type')
    .limit(100)

  return NextResponse.json({
    today_prices: today_prices ?? [],
    all_prices: all_prices ?? [],
    today,
  })
}

export async function POST(req: Request) {
  const token = cookies().get('hl_admin_session')?.value
  if (!verifySessionToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { action } = body
    const supabase = createBirrBankAdminClient()
    const today = new Date().toISOString().split('T')[0]

    if (action === 'save_price') {
      const { commodity_code, commodity_name, commodity_type, grade, region_of_origin, price_etb, price_change, price_change_pct, volume_kg, trade_date } = body
      if (!commodity_code || !commodity_name || price_etb === undefined) {
        return NextResponse.json({ error: 'commodity_code, commodity_name and price_etb required' }, { status: 400 })
      }
      const date = trade_date || today
      const { error } = await supabase
        .schema('birrbank')
        .from('commodity_prices')
        .upsert({
          commodity_code: commodity_code.toUpperCase(),
          commodity_name,
          commodity_type: commodity_type || 'other',
          grade: grade || null,
          region_of_origin: region_of_origin || null,
          price_etb: Number(price_etb),
          price_change: price_change ? Number(price_change) : null,
          price_change_pct: price_change_pct ? Number(price_change_pct) : null,
          trade_date: date,
          volume_kg: volume_kg ? Number(volume_kg) : null,
          country_code: 'ET',
        }, { onConflict: 'commodity_code,trade_date' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Append to commodity_history
      await supabase.schema('birrbank').from('commodity_history').upsert({
        commodity_code: commodity_code.toUpperCase(),
        trade_date: date,
        price_etb: Number(price_etb),
        volume_kg: volume_kg ? Number(volume_kg) : null,
        country_code: 'ET',
      }, { onConflict: 'commodity_code,trade_date' })

      return NextResponse.json({ ok: true })
    }

    if (action === 'import_ecx_prices') {
      const { prices } = body
      if (!Array.isArray(prices)) return NextResponse.json({ error: 'prices array required' }, { status: 400 })
      let saved = 0
      for (const p of prices) {
        if (!p.commodity_code || !p.commodity_name || p.price_etb === undefined) continue
        const date = p.trade_date || today
        const { error } = await supabase.schema('birrbank').from('commodity_prices').upsert({
          commodity_code: p.commodity_code.toUpperCase(),
          commodity_name: p.commodity_name,
          commodity_type: p.commodity_type || 'other',
          grade: p.grade || null,
          region_of_origin: p.region_of_origin || null,
          price_etb: Number(p.price_etb),
          price_change: p.price_change ? Number(p.price_change) : null,
          price_change_pct: p.price_change_pct ? Number(p.price_change_pct) : null,
          trade_date: date,
          volume_kg: p.volume_kg ? Number(p.volume_kg) : null,
          country_code: 'ET',
        }, { onConflict: 'commodity_code,trade_date' })
        if (!error) {
          await supabase.schema('birrbank').from('commodity_history').upsert({
            commodity_code: p.commodity_code.toUpperCase(),
            trade_date: date,
            price_etb: Number(p.price_etb),
            volume_kg: p.volume_kg ? Number(p.volume_kg) : null,
            country_code: 'ET',
          }, { onConflict: 'commodity_code,trade_date' })
          saved++
        }
      }
      return NextResponse.json({ ok: true, saved })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
