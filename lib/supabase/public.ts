import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { TypedClient } from './server'

/**
 * Anonymous client for public data (views and search functions only).
 * Requests are cached by Next.js for `revalidate` seconds and can be purged with the given tags.
 */
export function getPublicSupabase(opts: { tags?: string[]; revalidate?: number | false } = {}): TypedClient {
  const { tags = [], revalidate = 300 } = opts
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, next: { revalidate, tags: ['public-data', ...tags] } }),
    },
  })
}
