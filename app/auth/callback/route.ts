import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { getServerSupabase } from '@/lib/supabase/server'
import { safeNextPath } from '@/lib/validation/common'

/** Completes email confirmation, magic links, password resets and Google sign-in. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const next = safeNextPath(url.searchParams.get('next'), '/account')
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const supabase = getServerSupabase()

  let ok = false
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error
  }

  const dest = ok ? (type === 'recovery' ? '/auth/update-password' : next) : '/login?error=link'
  return NextResponse.redirect(new URL(dest, url.origin))
}
