import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'

/**
 * Refreshes the Supabase auth session cookie. Skipped for visitors who have no session at all.
 * `make` builds the response (pass-through or language rewrite); it is rebuilt when cookies change
 * so the refreshed cookies reach both the page and the browser.
 */
export async function refreshSession(request: NextRequest, make: () => NextResponse): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  let res = make()
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith('sb-'))
  if (!url || !key || !hasSession) return res

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value))
        res = make()
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      },
    },
  })
  await supabase.auth.getUser()
  return res
}
