import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** Public liveness check: no configuration details (spec 25.2n). */
export function GET() {
  return NextResponse.json({ ok: true, version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local' }, { headers: { 'Cache-Control': 'no-store' } })
}
