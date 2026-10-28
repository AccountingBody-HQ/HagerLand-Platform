import { NextResponse, type NextRequest } from 'next/server'
import { runDaily } from '@/lib/cron/daily'
import { safeEqual } from '@/lib/security'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** Daily maintenance (Vercel Cron, 06:00 UTC; vercel.json). Requires "Bearer <CRON_SECRET>", compared in constant time. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const header = request.headers.get('authorization')
  if (!secret || !header || !safeEqual(header, `Bearer ${secret}`)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Local test copy only (HL_TEST_ENV, set by scripts/with-test-env.sh, never on Vercel): force the digest fallback email.
  const failDigestForTest = process.env.HL_TEST_ENV === '1' && request.headers.get('x-test-fail-digest') === '1'
  const summary = await runDaily(Date.now(), { failDigestForTest })
  return NextResponse.json({ ok: true, ...summary })
}
