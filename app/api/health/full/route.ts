import { NextResponse, type NextRequest } from 'next/server'
import { healthReport } from '@/lib/health'
import { safeEqual } from '@/lib/security'

export const dynamic = 'force-dynamic'

/** Go-live readiness, true/false only. Requires "Bearer <CRON_SECRET>", compared in constant time (spec 25.2n). */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const header = request.headers.get('authorization')
  if (!secret || !header || !safeEqual(header, `Bearer ${secret}`)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  return NextResponse.json(await healthReport(), { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })
}
