'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { publicEnv } from '@/lib/env-public'

let client: SupabaseClient<Database> | null = null

/** Browser Supabase client (anon key; RLS applies). Returns null when Supabase is not configured. */
export function getBrowserSupabase(): SupabaseClient<Database> | null {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) return null
  if (!client) client = createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey)
  return client
}
