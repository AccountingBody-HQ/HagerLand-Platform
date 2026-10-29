'use server'

/** Admin area these actions belong to (owner only: the area is not in any staff role's list). */
const AREA = '/roodber8/supply/switches'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, assertOwner, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { SUPPLY_SWITCHES_TAG } from '@/lib/supply/partner-switches'
import { readPaymentDetails } from '@/lib/supply/order-requests-data'
import { NOT_YET_USED, REGISTER_PATH, SUPPLY_SWITCH_KEYS, type SupplySwitch } from '@/lib/supply/partner-rules'

type Msg = ActionResult<{ message: string }>

const SWITCH_NAMES: Record<SupplySwitch, string> = {
  registration: 'Partner registration',
  catalogueOrdering: 'Catalogue ordering',
  tradePricing: 'Trade price agreements',
  homeBusinessRow: 'Homepage “Sell through HagerLand” row',
}

/** Owner only: one S6-1 switch on or off. Switches nothing uses yet stay off (L10). */
export async function setSupplySwitchAction(which: string, on: boolean): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const parsed = z.object({ which: z.enum(Object.keys(SUPPLY_SWITCH_KEYS) as [SupplySwitch, ...SupplySwitch[]]), on: z.boolean() }).safeParse({ which, on })
  if (!parsed.success) return fail('Choose a switch.')
  // S6-2: customers cannot be told how to pay while the payment details are empty.
  if (parsed.data.on && parsed.data.which === 'catalogueOrdering' && !(await readPaymentDetails())) return fail('Add the payment details in Settings first.')
  if (parsed.data.on && NOT_YET_USED.includes(parsed.data.which)) return fail('This switch is used from a later release and cannot be switched on yet.')
  const key = SUPPLY_SWITCH_KEYS[parsed.data.which]
  const db = getAdminSupabase()
  const { data: before } = await db.from('site_settings').select('value').eq('key', key).maybeSingle()
  const { error } = await db.from('site_settings').upsert({ key, value: parsed.data.on, updated_at: new Date().toISOString() })
  if (error) return fail('Could not save the setting.')
  await audit('supply.switch', { type: 'setting', label: key }, { from: before?.value ?? false, to: parsed.data.on })
  // The homepage row, the registration page and the privacy lines read these switches.
  revalidateTag(SUPPLY_SWITCHES_TAG)
  revalidatePath('/')
  revalidatePath(REGISTER_PATH)
  revalidatePath('/privacy')
  revalidatePath('/terms')
  revalidatePath('/roodber8/supply/switches')
  return ok({ message: `${SWITCH_NAMES[parsed.data.which]} is now ${parsed.data.on ? 'on' : 'off'}.` })
}
