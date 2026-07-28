import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { verifySessionToken } from '@/lib/admin-auth'

export async function GET(req: Request) {
  const supabase = createBirrBankAdminClient()
  const { searchParams } = new URL(req.url)
  const tab = searchParams.get('tab') ?? 'securities'

  if (tab === 'securities') {
    const { data } = await supabase
      .schema('birrbank')
      .from('listed_securities')
      .select('id, ticker, company_name, sector, security_type, listing_date, last_price_etb, price_change_pct, pe_ratio, market_cap_etb, volume_today, last_updated, institution_slug')
      .order('ticker')
    return NextResponse.json({ securities: data ?? [] })
  }

  if (tab === 'ipo') {
    const { data } = await supabase
      .schema('birrbank')
      .from('ipo_pipeline')
      .select('id, company_name, sector, offer_price_etb, shares_offered, subscription_open, subscription_close, expected_listing, status, lead_manager, prospectus_url, institution_slug')
      .order('status')
      .order('company_name')
    return NextResponse.json({ ipos: data ?? [] })
  }

  if (tab === 'debt') {
    const { data } = await supabase
      .schema('birrbank')
      .from('debt_instruments')
      .select('id, instrument_type, issuer, issue_date, maturity_date, face_value_etb, coupon_rate_pct, yield_pct, auction_date, minimum_investment')
      .order('auction_date', { ascending: false })
    return NextResponse.json({ instruments: data ?? [] })
  }

  return NextResponse.json({ error: 'Unknown tab' }, { status: 400 })
}

export async function POST(req: Request) {
  const token = cookies().get('hl_admin_session')?.value
  if (!verifySessionToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { action } = body
    const supabase = createBirrBankAdminClient()
    const today = new Date().toISOString().split('T')[0]

    // ── SECURITIES ──────────────────────────────────────────────────────────
    if (action === 'add_security') {
      const { ticker, company_name, sector, security_type, listing_date, last_price_etb, institution_slug } = body
      if (!ticker || !company_name) return NextResponse.json({ error: 'ticker and company_name required' }, { status: 400 })
      const { error } = await supabase.schema('birrbank').from('listed_securities').insert({
        ticker: ticker.toUpperCase(),
        company_name,
        sector: sector || null,
        security_type: security_type || 'equity',
        listing_date: listing_date || null,
        last_price_etb: last_price_etb ? Number(last_price_etb) : null,
        institution_slug: institution_slug || null,
        last_updated: today,
        country_code: 'ET',
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'update_price') {
      const { ticker, last_price_etb, price_change_pct, volume_today } = body
      if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 })
      const { error } = await supabase.schema('birrbank').from('listed_securities')
        .update({
          last_price_etb: Number(last_price_etb),
          price_change_pct: price_change_pct ? Number(price_change_pct) : null,
          volume_today: volume_today ? Number(volume_today) : null,
          last_updated: today,
        })
        .eq('ticker', ticker.toUpperCase())
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Append to price_history
      await supabase.schema('birrbank').from('price_history').upsert({
        ticker: ticker.toUpperCase(),
        trade_date: today,
        close_price: Number(last_price_etb),
        volume: volume_today ? Number(volume_today) : null,
        country_code: 'ET',
      }, { onConflict: 'ticker,trade_date' })

      return NextResponse.json({ ok: true })
    }

    if (action === 'import_esx_prices') {
      const { prices } = body
      if (!Array.isArray(prices)) return NextResponse.json({ error: 'prices array required' }, { status: 400 })
      let saved = 0
      for (const p of prices) {
        if (!p.ticker || !p.price) continue
        const { error } = await supabase.schema('birrbank').from('listed_securities')
          .update({ last_price_etb: Number(p.price), price_change_pct: p.change ? Number(p.change) : null, volume_today: p.volume ? Number(p.volume) : null, last_updated: today })
          .eq('ticker', p.ticker.toUpperCase())
        if (!error) {
          await supabase.schema('birrbank').from('price_history').upsert({
            ticker: p.ticker.toUpperCase(), trade_date: today, close_price: Number(p.price),
            volume: p.volume ? Number(p.volume) : null, country_code: 'ET',
          }, { onConflict: 'ticker,trade_date' })
          saved++
        }
      }
      return NextResponse.json({ ok: true, saved })
    }

    // ── IPO PIPELINE ─────────────────────────────────────────────────────────
    if (action === 'add_ipo') {
      const { company_name, sector, offer_price_etb, shares_offered, subscription_open, subscription_close, expected_listing, status, lead_manager, prospectus_url } = body
      if (!company_name) return NextResponse.json({ error: 'company_name required' }, { status: 400 })
      const { error } = await supabase.schema('birrbank').from('ipo_pipeline').insert({
        company_name, sector: sector || null,
        offer_price_etb: offer_price_etb ? Number(offer_price_etb) : null,
        shares_offered: shares_offered ? Number(shares_offered) : null,
        subscription_open: subscription_open || null,
        subscription_close: subscription_close || null,
        expected_listing: expected_listing || null,
        status: status || 'announced',
        lead_manager: lead_manager || null,
        prospectus_url: prospectus_url || null,
        country_code: 'ET',
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'update_ipo_status') {
      const { id, status } = body
      if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })
      const { error } = await supabase.schema('birrbank').from('ipo_pipeline').update({ status }).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    // ── DEBT INSTRUMENTS ─────────────────────────────────────────────────────
    if (action === 'add_debt_instrument') {
      const { instrument_type, issuer, issue_date, maturity_date, face_value_etb, coupon_rate_pct, yield_pct, auction_date, minimum_investment } = body
      const { error } = await supabase.schema('birrbank').from('debt_instruments').insert({
        instrument_type: instrument_type || 'tbill',
        issuer: issuer || 'NBE',
        issue_date: issue_date || null,
        maturity_date: maturity_date || null,
        face_value_etb: face_value_etb ? Number(face_value_etb) : null,
        coupon_rate_pct: coupon_rate_pct ? Number(coupon_rate_pct) : null,
        yield_pct: yield_pct ? Number(yield_pct) : null,
        auction_date: auction_date || today,
        minimum_investment: minimum_investment ? Number(minimum_investment) : null,
        country_code: 'ET',
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
