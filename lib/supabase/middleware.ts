import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Refreshes the Supabase auth session cookie. Skipped for visitors who have no session at all. */
export async function refreshSession(request: NextRequest, response: NextResponse): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith('sb-'))
  if (!url || !key || !hasSession) return response

  let res = response
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value))
        const fresh = NextResponse.next({ request })
        res.headers.forEach((value, name) => fresh.headers.set(name, value))
        res = fresh
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      },
    },
  })
  await supabase.auth.getUser()
  return res
}
