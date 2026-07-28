import { NextResponse } from 'next/server'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const TARGET_CURRENCIES = ['USD','EUR','GBP','AED','SAR','CHF','CNY','JPY','CAD','AUD','KES','INR','DJF','DKK','NOK','SEK','KWD','ZAR']

export async function GET(req: Request) {
  // Verify this is called by Vercel Cron
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]

  try {
    const res = await fetch(`https://api.nbe.gov.et/api/filter-exchange-rates?date=${today}`, {
      headers: { 'User-Agent': 'BirrBank-Scraper/1.0' },
      next: { revalidate: 0 }
    })
    const data = await res.json()

    if (!data.success) {
      return NextResponse.json({ error: 'NBE API failure', data }, { status: 500 })
    }

    const supabase = createBirrBankAdminClient()
    const rates = data.data ?? []
    let saved = 0
    const errors: string[] = []

    for (const rate of rates) {
      const code = rate.currency?.code
      if (!TARGET_CURRENCIES.includes(code)) continue

      const { error } = await supabase
        .schema('birrbank')
        .from('exchange_rates')
        .upsert({
          institution_slug: 'nbe',
          currency_code: code,
          buying_rate: parseFloat(rate.buying),
          selling_rate: parseFloat(rate.selling),
          weighted_average: parseFloat(rate.weighted_average),
          rate_date: today,
          rate_type: 'transactional',
          source: 'nbe_official',
          country_code: 'ET',
        }, { onConflict: 'institution_slug,currency_code,rate_type,rate_date' })

      if (error) {
        errors.push(`${code}: ${error.message}`)
      } else {
        saved++
      }
    }

    return NextResponse.json({
      ok: true,
      date: today,
      saved,
      total: rates.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
