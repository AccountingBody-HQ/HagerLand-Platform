'use server'

/** Admin area these actions belong to (owner only: the area is not in any staff role's list). */
const AREA = '/roodber8/supply/switches'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, assertOwner, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { SUPPLY_SWITCHES_TAG, readUnlockFacts } from '@/lib/supply/partner-switches'
import { REGISTER_PATH, SUPPLY_SWITCH_KEYS, unlockLine, unlockMissing, type SupplySwitch } from '@/lib/supply/partner-rules'
import { markLegalSwitchChange } from '@/lib/content/legal'

type Msg = ActionResult<{ message: string }>

const SWITCH_NAMES: Record<SupplySwitch, string> = {
  registration: 'Partner registration',
  catalogueOrdering: 'Catalogue ordering',
  tradePricing: 'Trade price agreements',
  homeBusinessRow: 'Homepage “Sell through HagerLand” row',
}

/** Owner only: one S6-1 switch on or off. Catalogue ordering and trade price agreements need their unlock (QC-2). */
export async function setSupplySwitchAction(which: string, on: boolean): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const parsed = z.object({ which: z.enum(Object.keys(SUPPLY_SWITCH_KEYS) as [SupplySwitch, ...SupplySwitch[]]), on: z.boolean() }).safeParse({ which, on })
  if (!parsed.success) return fail('Choose a switch.')
  // QC-2: checked here, at the moment of switching (not only on the page): an active payment method and the company
  // name in Settings; trade price agreements also need catalogue ordering on (S6-4).
  if (parsed.data.on) {
    const missing = unlockMissing(parsed.data.which, await readUnlockFacts())
    if (missing.length) return fail(unlockLine(missing))
  }
  const key = SUPPLY_SWITCH_KEYS[parsed.data.which]
  const db = getAdminSupabase()
  const { data: before } = await db.from('site_settings').select('value').eq('key', key).maybeSingle()
  // QC-1a: a switch that shows or hides /privacy or /terms text moves that page's "Last updated" date, first.
  let legal: Awaited<ReturnType<typeof markLegalSwitchChange>>
  try {
    legal = await markLegalSwitchChange(key, before?.value ?? false, parsed.data.on)
  } catch {
    return fail('Could not save the setting.')
  }
  const { error } = await db.from('site_settings').upsert({ key, value: parsed.data.on, updated_at: new Date().toISOString() })
  if (error) return fail('Could not save the setting.')
  await audit('supply.switch', { type: 'setting', label: key }, { from: before?.value ?? false, to: parsed.data.on, ...(legal ? { legal_dates: legal } : {}) })
  // The homepage row, the registration page and the privacy lines read these switches.
  revalidateTag(SUPPLY_SWITCHES_TAG)
  revalidatePath('/')
  revalidatePath(REGISTER_PATH)
  revalidatePath('/privacy')
  revalidatePath('/terms')
  revalidatePath('/roodber8/supply/switches')
  return ok({ message: `${SWITCH_NAMES[parsed.data.which]} is now ${parsed.data.on ? 'on' : 'off'}.` })
}
