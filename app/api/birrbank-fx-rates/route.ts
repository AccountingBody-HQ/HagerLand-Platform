import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { verifySessionToken } from '@/lib/admin-auth'

export async function GET() {
  const supabase = createBirrBankAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // Get most recent NBE rate date
  const { data: latestNbe } = await supabase
    .schema('birrbank')
    .from('exchange_rates')
    .select('rate_date')
    .eq('institution_slug', 'nbe')
    .order('rate_date', { ascending: false })
    .limit(1)
    .single()
  const nbeDate = latestNbe?.rate_date ?? today

  // NBE official rates for most recent date
  const { data: nbeRates } = await supabase
    .schema('birrbank')
    .from('exchange_rates')
    .select('currency_code, buying_rate, selling_rate, rate_date')
    .eq('institution_slug', 'nbe')
    .eq('rate_date', nbeDate)
    .order('currency_code')

  // All institutions that have FX rates - most recent available
  const { data: bankRates } = await supabase
    .schema('birrbank')
    .from('exchange_rates')
    .select('institution_slug, currency_code, buying_rate, selling_rate, rate_date, institutions(name)')
    .neq('institution_slug', 'nbe')
    .order('rate_date', { ascending: false })
    .order('institution_slug')

  // Institutions eligible for FX (type=bank with SWIFT)
  const { data: banks } = await supabase
    .schema('birrbank')
    .from('institutions')
    .select('slug, name, swift_code')
    .eq('type', 'bank')
    .eq('is_active', true)
    .not('swift_code', 'is', null)
    .order('name')

  return NextResponse.json({
    nbeRates: nbeRates ?? [],
    bankRates: bankRates ?? [],
    banks: banks ?? [],
    today,
  })
}

export async function POST(req: Request) {
  const token = cookies().get('hl_admin_session')?.value
  if (!verifySessionToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { action, rates, institution_slug, currency_code, buying_rate, selling_rate } = body
    const supabase = createBirrBankAdminClient()
    const today = new Date().toISOString().split('T')[0]

    if (action === 'save_nbe_rates' && Array.isArray(rates)) {
      for (const r of rates) {
        const { error } = await supabase
          .schema('birrbank')
          .from('exchange_rates')
          .upsert({
            institution_slug: 'nbe',
            currency_code: r.currency_code,
            buying_rate: Number(r.buying_rate),
            selling_rate: Number(r.selling_rate),
            rate_date: today,
            source: 'nbe_official',
            country_code: 'ET',
          }, { onConflict: 'institution_slug,currency_code,rate_date' })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true, saved: rates.length })
    }

    if (action === 'save_bank_rate') {
      const { error } = await supabase
        .schema('birrbank')
        .from('exchange_rates')
        .upsert({
          institution_slug,
          currency_code,
          buying_rate: Number(buying_rate),
          selling_rate: Number(selling_rate),
          rate_date: today,
          source: 'admin_verified',
          country_code: 'ET',
        }, { onConflict: 'institution_slug,currency_code,rate_date' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
