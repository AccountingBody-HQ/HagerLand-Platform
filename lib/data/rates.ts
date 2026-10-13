import 'server-only'
import { cache } from 'react'
import { getPublicSupabase } from '@/lib/supabase/public'
import { safeQuery, unwrap } from './safe'

export interface ExchangeRate {
  currency: string
  etbPerUnit: number
  updatedAt: string
}

export const RATES_TAG = 'rates'

/** Admin-set exchange rates for approximate prices (spec 25.2f). Empty until AB enters rates. */
export const getExchangeRates = cache(async (): Promise<ExchangeRate[]> =>
  safeQuery('exchange rates', [], async () => {
    const rows = unwrap(await getPublicSupabase({ tags: [RATES_TAG], revalidate: 600 }).from('exchange_rates_public').select('currency, etb_per_unit, updated_at').order('currency'), 'rates')
    return (rows ?? [])
      .filter((r) => r.currency && Number(r.etb_per_unit) > 0)
      .map((r) => ({ currency: r.currency as string, etbPerUnit: Number(r.etb_per_unit), updatedAt: r.updated_at as string }))
  }),
)
