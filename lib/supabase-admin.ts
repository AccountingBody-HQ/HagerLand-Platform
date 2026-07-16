import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY ?? ''

export const supabaseAdmin = supabaseUrl && supabaseSecretKey
  ? createClient(supabaseUrl, supabaseSecretKey)
  : null as unknown as ReturnType<typeof createClient>