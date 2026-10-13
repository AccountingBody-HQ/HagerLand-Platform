import { NextResponse, type NextRequest } from 'next/server'
import crypto from 'node:crypto'
import { runDaily } from '@/lib/cron/daily'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** True only for "Bearer <CRON_SECRET>", compared in constant time. */
function authorised(header: string | null): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret || !header) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const given = Buffer.from(header)
  return given.length === expected.length && crypto.timingSafeEqual(given, expected)
}

/** Daily maintenance (Vercel Cron, 06:00 UTC; vercel.json). */
export async function GET(request: NextRequest) {
  if (!authorised(request.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const summary = await runDaily()
  return NextResponse.json({ ok: true, ...summary })
}
