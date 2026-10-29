import { NextResponse, type NextRequest } from 'next/server'
import { runHourly } from '@/lib/cron/hourly'
import { safeEqual } from '@/lib/security'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/** Hourly maintenance (Vercel Cron, every hour; vercel.json). Requires "Bearer <CRON_SECRET>", compared in constant time. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const header = request.headers.get('authorization')
  if (!secret || !header || !safeEqual(header, `Bearer ${secret}`)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const summary = await runHourly(Date.now())
  return NextResponse.json({ ok: true, ...summary })
}
