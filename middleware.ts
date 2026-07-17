import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/roodber8')) {
    const token = req.cookies.get(SESSION_COOKIE)?.value
    if (!verifySessionToken(token)) {
      return NextResponse.redirect(new URL('/roodber8-login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = { matcher: ['/roodber8/:path*', '/roodber8'] }
