import { NextResponse, type NextRequest } from 'next/server'
import { refreshSession } from '@/lib/supabase/middleware'
import { ADMIN_SESSION_COOKIE, verifyAdminSessionEdge } from '@/lib/admin-session-edge'
import { verticalForPath } from '@/lib/verticals'
import { isIndexableVertical, verticalStatusesEdge } from '@/lib/vertical-status-edge'

const isDev = process.env.NODE_ENV !== 'production'

function origin(url: string | undefined): string {
  try {
    return url ? new URL(url).origin : ''
  } catch {
    return ''
  }
}
const SUPABASE = origin(process.env.NEXT_PUBLIC_SUPABASE_URL)

const CSP = [
  "default-src 'self'",
  `img-src 'self' data: blob: https://*.supabase.co ${SUPABASE} https://maps.gstatic.com https://*.googleapis.com https://*.ggpht.com https://i.ytimg.com`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://challenges.cloudflare.com https://va.vercel-scripts.com`,
  'frame-src https://challenges.cloudflare.com https://www.google.com https://www.youtube-nocookie.com',
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${SUPABASE} https://vitals.vercel-insights.com https://challenges.cloudflare.com${isDev ? ' ws:' : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('Content-Security-Policy', CSP)
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)')
  res.headers.set('X-Frame-Options', 'DENY')
  return res
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAdminPage = pathname === '/roodber8' || pathname.startsWith('/roodber8/')
  const isAdminApi = pathname.startsWith('/api/admin/')
  if (isAdminPage || isAdminApi) {
    const ok = await verifyAdminSessionEdge(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)
    if (!ok) {
      if (isAdminApi) return withSecurityHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const url = request.nextUrl.clone()
      url.pathname = '/roodber8-login'
      url.search = ''
      return withSecurityHeaders(NextResponse.redirect(url))
    }
    const res = NextResponse.next()
    res.headers.set('X-Robots-Tag', 'noindex, nofollow')
    res.headers.set('Cache-Control', 'no-store')
    return withSecurityHeaders(res)
  }

  const response = await refreshSession(request, NextResponse.next({ request }))
  if (pathname === '/roodber8-login') response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  // Pages of a vertical that is coming soon or hidden are never indexed (spec 24.2).
  const vertical = verticalForPath(pathname)
  if (vertical) {
    const statuses = await verticalStatusesEdge()
    if (statuses && !isIndexableVertical(statuses, vertical)) response.headers.set('X-Robots-Tag', 'noindex, follow')
  }
  return withSecurityHeaders(response)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap).*)'],
}
