'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getUser } from '@/lib/auth'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { textSchema } from '@/lib/validation/common'
import { accountConsentRefusal } from '@/lib/data-transfer-server'

type Msg = ActionResult<{ message: string }>
const FREQ = z.enum(['instant', 'daily', 'weekly', 'off'])
const MAX_SEARCHES = 20

const schema = z.object({
  name: textSchema(120, { min: 2, label: 'Name' }),
  alert_frequency: FREQ,
  purpose: z.enum(['sale', 'rent']),
  location: z.preprocess((v) => (v === '' ? undefined : v), z.string().regex(/^[a-z0-9/-]{1,200}$/).optional()),
  query: z.string().max(1000).refine((q) => !/[<>"]/.test(q), 'Invalid search'),
})

/** "Save this search" with email alerts (spec 25.2a). */
export async function saveSearchAction(_prev: Msg | null, formData: FormData): Promise<Msg> {
  const user = await getUser()
  if (!user) return fail('Sign in to save searches.')
  // QC-2: signed-in forms rely on the account's data-transfer notice (confirmed at the top of the account pages).
  const consentRefusal = await accountConsentRefusal(user.id)
  if (consentRefusal) return fail(consentRefusal)
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  const supabase = getServerSupabase()
  const { count } = await supabase.from('saved_searches').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
  if ((count ?? 0) >= MAX_SEARCHES) return fail(`You can save up to ${MAX_SEARCHES} searches. Delete one in Search alerts first.`)
  const query = new URLSearchParams(d.query)
  query.delete('page')
  const { error } = await supabase.from('saved_searches').insert({ user_id: user.id, name: d.name, alert_frequency: d.alert_frequency, params: { purpose: d.purpose, location: d.location ?? null, query: query.toString() } })
  if (error) return fail('Could not save the search. Please try again.')
  revalidatePath('/account/alerts')
  return ok({ message: d.alert_frequency === 'off' ? 'Search saved.' : 'Search saved. We will email you when new properties match.' })
}

export async function updateSearchAction(id: string, frequency: string): Promise<Msg> {
  const parsed = z.object({ id: z.uuid(), frequency: FREQ }).safeParse({ id, frequency })
  if (!parsed.success) return fail('Invalid choice.')
  const { data, error } = await getServerSupabase().from('saved_searches').update({ alert_frequency: parsed.data.frequency }).eq('id', id).select('id').maybeSingle()
  if (error || !data) return fail('Could not update the search.')
  revalidatePath('/account/alerts')
  return ok({ message: 'Updated.' })
}

export async function deleteSearchAction(id: string): Promise<Msg> {
  if (!z.uuid().safeParse(id).success) return fail('Invalid.')
  const { error } = await getServerSupabase().from('saved_searches').delete().eq('id', id)
  if (error) return fail('Could not delete the search.')
  revalidatePath('/account/alerts')
  return ok({ message: 'Deleted.' })
}

/** One-click unsubscribe from an alert email (works without signing in). */
export async function unsubscribeAlertAction(_prev: Msg | null, formData: FormData): Promise<Msg> {
  const token = String(formData.get('token') ?? '')
  if (!/^[0-9a-f]{48}$/.test(token)) return fail('This link is not valid.')
  const { data } = await getAdminSupabase().from('saved_searches').update({ alert_frequency: 'off' }).eq('unsubscribe_token', token).select('name').maybeSingle()
  if (!data) return fail('This link is not valid, or the search was deleted.')
  return ok({ message: `You will no longer get emails for “${data.name}”.` })
}
