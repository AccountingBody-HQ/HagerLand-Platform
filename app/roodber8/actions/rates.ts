'use server'

import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { RATES_TAG } from '@/lib/data/rates'

const CODES = ['GBP', 'USD', 'EUR', 'CAD', 'AED', 'SEK', 'NOK', 'SAR', 'ILS', 'ZAR', 'KES'] as const

/** Saves "1 unit = X ETB" for each currency; an empty box removes that currency (spec 25.2f). */
export async function saveRatesAction(input: Record<string, string>): Promise<ActionResult<{ message: string }>> {
  assertAdmin()
  const rate = z.preprocess((v) => (typeof v === 'string' ? v.replace(/[,\s]/g, '') : v), z.union([z.literal(''), z.coerce.number().positive().max(1_000_000)]))
  const parsed = z.object(Object.fromEntries(CODES.map((c) => [c, rate.optional()]))).safeParse(input)
  if (!parsed.success) return fail('Enter each rate as a positive number of birr, or leave it empty.')
  const db = getAdminSupabase()
  const { data: before } = await db.from('exchange_rates').select('currency, etb_per_unit')
  const prev = new Map((before ?? []).map((r) => [r.currency, Number(r.etb_per_unit)]))
  const changes: Record<string, { from: number | null; to: number | null }> = {}
  for (const c of CODES) {
    const v = parsed.data[c]
    const next = typeof v === 'number' ? Math.round(v * 10000) / 10000 : null
    const old = prev.get(c) ?? null
    if (next === old) continue
    const { error } = next === null ? await db.from('exchange_rates').delete().eq('currency', c) : await db.from('exchange_rates').upsert({ currency: c, etb_per_unit: next })
    if (error) return fail(`Could not save ${c}.`)
    changes[c] = { from: old, to: next }
  }
  if (Object.keys(changes).length === 0) return ok({ message: 'No changes.' })
  await audit('rates.update', { type: 'exchange_rates', label: Object.keys(changes).join(', ') }, changes)
  revalidateTag(RATES_TAG)
  return ok({ message: 'Rates saved. Approximate prices use them from now on.' })
}
