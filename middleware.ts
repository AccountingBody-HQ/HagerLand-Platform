import { NextResponse, type NextRequest } from 'next/server'
import { refreshSession } from '@/lib/supabase/middleware'
import { ADMIN_SESSION_COOKIE, verifyAdminSessionEdge } from '@/lib/admin-session-edge'
import { roleCanAccess } from '@/lib/admin/roles'

// Same value as ADMIN_PATH_HEADER in lib/admin-auth.ts (server-only, so not imported here).
const ADMIN_PATH_HEADER = 'x-hl-admin-path'
import { verticalForPath } from '@/lib/verticals'
import { mapTileOrigin } from '@/lib/map-config'
import { isIndexableVertical, pillarStatusesEdge, verticalStatusesEdge } from '@/lib/vertical-status-edge'
import { isPillarKey } from '@/lib/pillars'
import { AM_PREFIX, LOCALE_HEADER, isAmharicPath, isPrefixable, stripLocale } from '@/lib/i18n/config'
import { amharicEnabledEdge } from '@/lib/i18n/edge'
import { canonicalUrl } from '@/lib/site'
import { isLegacyApi } from '@/lib/legacy-api'

const isDev = process.env.NODE_ENV !== 'production'

function origin(url: string | undefined): string {
  try {
    return url ? new URL(url).origin : ''
  } catch {
    return ''
  }
}
const SUPABASE = origin(process.env.NEXT_PUBLIC_SUPABASE_URL)
// Map tiles (spec 25.2b): allowed only for the configured tile server.
const MAP_TILES = mapTileOrigin()

const CSP = [
  "default-src 'self'",
  `img-src 'self' data: blob: https://*.supabase.co ${SUPABASE} https://maps.gstatic.com https://*.googleapis.com https://*.ggpht.com https://i.ytimg.com${MAP_TILES ? ` ${MAP_TILES}` : ''}`,
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
  if (isLegacyApi(pathname)) return withSecurityHeaders(NextResponse.json({ error: 'This address is no longer available.' }, { status: 410 }))

  const isAdminPage = pathname === '/roodber8' || pathname.startsWith('/roodber8/')
  const isAdminApi = pathname.startsWith('/api/admin/')
  if (isAdminPage || isAdminApi) {
    const session = await verifyAdminSessionEdge(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)
    if (!session) {
      if (isAdminApi) return withSecurityHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const url = request.nextUrl.clone()
      url.pathname = '/roodber8-login'
      url.search = ''
      return withSecurityHeaders(NextResponse.redirect(url))
    }
    // Staff roles reach only their own areas (spec 26.15); the server checks again on every page and action.
    if (session.role && !roleCanAccess(session.role, isAdminApi ? '/api/admin' : pathname)) {
      if (isAdminApi) return withSecurityHeaders(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
      const url = request.nextUrl.clone()
      url.pathname = '/roodber8'
      url.search = '?denied=1'
      return withSecurityHeaders(NextResponse.redirect(url))
    }
    const adminHeaders = new Headers(request.headers)
    adminHeaders.set(ADMIN_PATH_HEADER, isAdminApi ? '/api/admin' : pathname)
    const res = NextResponse.next({ request: { headers: adminHeaders } })
    res.headers.set('X-Robots-Tag', 'noindex, nofollow')
    res.headers.set('Cache-Control', 'no-store')
    return withSecurityHeaders(res)
  }

  // Language (spec 25.2m): "/am/…" serves the same page in Amharic, only while Amharic is switched on.
  // The language header can only come from here: anything a visitor sends is replaced.
  const amharic = isAmharicPath(pathname)
  const amharicOn = await amharicEnabledEdge()
  const page = amharic ? stripLocale(pathname) : pathname
  if (amharic && (!amharicOn || !isPrefixable(page) || page === '/roodber8-login')) {
    return withSecurityHeaders(NextResponse.rewrite(new URL('/__language-not-available', request.url)))
  }
  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete(LOCALE_HEADER)
  requestHeaders.delete(ADMIN_PATH_HEADER)
  if (amharic) requestHeaders.set(LOCALE_HEADER, 'am')
  const make = () => {
    if (!amharic) return NextResponse.next({ request: { headers: requestHeaders } })
    const url = request.nextUrl.clone()
    url.pathname = page
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
  }
  const response = await refreshSession(request, make)
  if (amharic) response.headers.set('Content-Language', 'am')
  // hreflang alternates for public pages while both languages exist.
  if (amharicOn && isPrefixable(page) && !page.startsWith('/account') && request.method === 'GET') {
    const en = canonicalUrl(page)
    const am = canonicalUrl(page === '/' ? AM_PREFIX : `${AM_PREFIX}${page}`)
    response.headers.set('Link', `<${en}>; rel="alternate"; hreflang="en", <${am}>; rel="alternate"; hreflang="am", <${en}>; rel="alternate"; hreflang="x-default"`)
  }
  if (pathname === '/roodber8-login') response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  // Pages of a vertical that is coming soon or hidden are never indexed (spec 24.2).
  const vertical = verticalForPath(page)
  if (vertical) {
    const statuses = await verticalStatusesEdge()
    if (statuses && !isIndexableVertical(statuses, vertical)) response.headers.set('X-Robots-Tag', 'noindex, follow')
  }
  // Pillar hubs (and pages under them) of a pillar that is not live are never indexed (spec 26.16).
  const hub = page.split('/')[1] ?? ''
  if (isPillarKey(hub)) {
    const statuses = await pillarStatusesEdge()
    if (statuses && statuses.get(hub) !== 'live') response.headers.set('X-Robots-Tag', 'noindex, follow')
  }
  return withSecurityHeaders(response)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap).*)'],
}
