import { NextResponse } from 'next/server'
import { PUBLIC_HEALTH_SCOPE } from '@/lib/health'

export const dynamic = 'force-dynamic'

/**
 * Public liveness check (spec 25.2n): "ok" means only that the website answered, on this version. No configuration
 * details; the database, migrations, storage and email are checked by /api/health/full (protected). The answer says so.
 */
export function GET() {
  return NextResponse.json({ ok: true, version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local', ...PUBLIC_HEALTH_SCOPE }, { headers: { 'Cache-Control': 'no-store' } })
}
