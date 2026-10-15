'use server'

import { getServerSupabase } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { quoteListSchema, type SyncedQuoteItem } from '@/lib/quote-list'
import type { Json } from '@/lib/database.types'

/** The signed-in user's saved quote list, or null for guests (their list stays in the browser only). */
export async function loadQuoteListAction(): Promise<SyncedQuoteItem[] | null> {
  const user = await getUser()
  if (!user) return null
  const { data } = await getServerSupabase().from('quote_lists').select('items').eq('user_id', user.id).maybeSingle()
  const parsed = quoteListSchema.safeParse(data?.items ?? [])
  return parsed.success ? parsed.data : []
}

export async function saveQuoteListAction(items: unknown): Promise<boolean> {
  const user = await getUser()
  if (!user) return false
  const parsed = quoteListSchema.safeParse(items)
  if (!parsed.success) return false
  const { error } = await getServerSupabase().from('quote_lists').upsert({ user_id: user.id, items: parsed.data as unknown as Json[] })
  return !error
}
