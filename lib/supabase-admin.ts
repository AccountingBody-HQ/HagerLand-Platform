import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error('Supabase admin env vars not set')
  }
  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export const supabaseAdmin = {
  from: (table: string) => getSupabaseAdmin().from(table),
  rpc: (fn: string, params?: Record<string, unknown>) => getSupabaseAdmin().rpc(fn, params),
}
