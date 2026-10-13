import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { TypedClient } from './server'

let client: TypedClient | null = null

/** Service-role client: bypasses RLS. Use only after checking the caller is allowed to do the action. */
export function getAdminSupabase(): TypedClient {
  if (client) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('Supabase service role is not configured (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY)')
  client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  })
  return client
}

/**
 * Same service-role client without table types, for the few admin operations where the table is
 * chosen at runtime from a fixed list (e.g. moderation across properties/developments/organisations).
 */
export function getAdminSupabaseDynamic(): import('@supabase/supabase-js').SupabaseClient {
  return getAdminSupabase() as unknown as import('@supabase/supabase-js').SupabaseClient
}
