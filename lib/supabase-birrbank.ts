import { createClient } from '@supabase/supabase-js'

const BIRRBANK_SCHEMA = 'birrbank'

const birrbankUrl = process.env.NEXT_PUBLIC_BIRRBANK_SUPABASE_URL ?? ''
const birrbankServiceKey = process.env.BIRRBANK_SUPABASE_SERVICE_KEY ?? ''

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
