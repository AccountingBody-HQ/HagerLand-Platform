import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export type TypedClient = SupabaseClient<Database>

/**
 * Supabase client acting as the signed-in visitor (cookie session; RLS applies).
 * Using it makes the page dynamic, so use it only for account pages and actions.
 */
export function getServerSupabase(): TypedClient {
  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '', {
    cookies: {
      getAll: async () => (await cookies()).getAll(),
      setAll: async (list) => {
        const store = await cookies()
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options))
        } catch {
          // Called from a Server Component: the middleware refreshes the session instead.
        }
      },
    },
  })
}
