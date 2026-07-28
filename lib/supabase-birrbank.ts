import { createClient } from '@supabase/supabase-js'

const BIRRBANK_SCHEMA = 'birrbank'

// Falls back to a placeholder until AB provisions the Accountingbody-Platform
// project and sets these in Vercel — matches the same guard lib/supabase.ts
// already uses, so pages render an empty state instead of throwing a 500
// when the real credentials aren't configured yet.
const birrbankUrl = process.env.NEXT_PUBLIC_BIRRBANK_SUPABASE_URL || 'https://placeholder.supabase.co'
const birrbankServiceKey = process.env.BIRRBANK_SUPABASE_SERVICE_KEY || 'placeholder'

export function createBirrBankAdminClient() {
  return createClient(birrbankUrl, birrbankServiceKey, {
    db: { schema: BIRRBANK_SCHEMA },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function createBirrBankBrowserClient() {
  return createClient(birrbankUrl, birrbankServiceKey, {
    db: { schema: BIRRBANK_SCHEMA },
  })
}
