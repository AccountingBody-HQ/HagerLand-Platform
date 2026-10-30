import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { log } from '@/lib/log'
import { SUPPLY_SWITCH_KEYS, type SupplySwitch, type UnlockFacts } from '@/lib/supply/partner-rules'

/**
 * S6-1 owner switches (site_settings, never public; migration 0048 adds them all off). If the settings cannot be read,
 * every switch counts as off (L6).
 */
export type SupplySwitches = Record<SupplySwitch, boolean>
export const SUPPLY_SWITCHES_TAG = 'supply-switches'

const ALL_OFF: SupplySwitches = { registration: false, catalogueOrdering: false, tradePricing: false, homeBusinessRow: false }

async function readFromDatabase(): Promise<SupplySwitches> {
  // A build without database settings (a clean copy) has nothing to read: everything is off, quietly.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) return ALL_OFF
  try {
    const keys = Object.values(SUPPLY_SWITCH_KEYS)
    const { data, error } = await getAdminSupabase().from('site_settings').select('key, value').in('key', keys)
    if (error) throw new Error(error.message)
    const on = (key: string) => (data ?? []).some((r) => r.key === key && r.value === true)
    return {
      registration: on(SUPPLY_SWITCH_KEYS.registration),
      catalogueOrdering: on(SUPPLY_SWITCH_KEYS.catalogueOrdering),
      tradePricing: on(SUPPLY_SWITCH_KEYS.tradePricing),
      homeBusinessRow: on(SUPPLY_SWITCH_KEYS.homeBusinessRow),
    }
  } catch (err) {
    log.error('supply', 'switches could not be read', err)
    return ALL_OFF
  }
}

/** Fresh on every call: the registration page, its action and admin (switching off takes effect on the next request). */
export const readSupplySwitches = cache(readFromDatabase)

/**
 * For cached public pages (the homepage, /privacy), so they stay cached: the owner's switch action clears this tag and
 * those paths, so a change shows at once; otherwise it is re-read within 5 minutes.
 */
export const readSupplySwitchesCached = unstable_cache(readFromDatabase, ['supply-switches'], { tags: [SUPPLY_SWITCHES_TAG], revalidate: 300 })

/**
 * QC-2: the facts behind the owner's unlock, read fresh (never cached) at the moment of switching. A read that fails
 * counts as "not in place", so a switch is never turned on by mistake.
 */
export async function readUnlockFacts(): Promise<UnlockFacts> {
  const db = getAdminSupabase()
  const [methods, legal, switches] = await Promise.all([
    db.from('supply_payment_methods').select('id', { count: 'exact', head: true }).eq('active', true),
    db.from('site_settings').select('value').eq('key', 'legal_entity').maybeSingle(),
    readFromDatabase(),
  ])
  if (methods.error) log.error('supply', 'payment methods could not be counted', methods.error)
  if (legal.error) log.error('supply', 'legal entity could not be read', legal.error)
  const value = legal.data?.value
  const name = !legal.error && value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>).name : ''
  return { activePaymentMethods: methods.error ? 0 : (methods.count ?? 0), legalName: typeof name === 'string' ? name : '', catalogueOrdering: switches.catalogueOrdering }
}
