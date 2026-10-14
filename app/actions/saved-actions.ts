'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getServerSupabase } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { fail, ok, type ActionResult } from '@/lib/action-result'

const schema = z.object({ entity_type: z.enum(['property', 'product', 'organisation', 'development']), entity_id: z.uuid() })

/** Saves or un-saves an item for the signed-in user (spec 25.2a). Guests are asked to sign in. */
export async function toggleSavedAction(input: { entity_type: string; entity_id: string }): Promise<ActionResult<{ saved: boolean }>> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return fail('Something went wrong.')
  const user = await getUser()
  if (!user) return fail('Sign in to save.')
  const supabase = getServerSupabase()
  const key = { user_id: user.id, ...parsed.data }
  const { data: existing } = await supabase.from('saved_items').select('entity_id').match(key).maybeSingle()
  if (existing) {
    const { error } = await supabase.from('saved_items').delete().match(key)
    if (error) return fail('Could not update your saved list.')
    revalidatePath('/account/saved')
    return ok({ saved: false })
  }
  const { error } = await supabase.from('saved_items').insert(key)
  if (error) return fail('Could not save. Please try again.')
  revalidatePath('/account/saved')
  return ok({ saved: true })
}

/** Which of these items the signed-in user has saved (for showing the filled heart). */
export async function savedStateAction(entityType: string, ids: string[]): Promise<string[]> {
  const parsed = z.object({ t: schema.shape.entity_type, ids: z.array(z.uuid()).max(100) }).safeParse({ t: entityType, ids })
  const user = await getUser()
  if (!parsed.success || !user || ids.length === 0) return []
  const { data } = await getServerSupabase().from('saved_items').select('entity_id').eq('entity_type', parsed.data.t).in('entity_id', parsed.data.ids)
  return (data ?? []).map((r) => r.entity_id)
}
