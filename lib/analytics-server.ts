import 'server-only'
import { track } from '@vercel/analytics/server'
import type { AnalyticsEvent } from './analytics'
import { log } from './log'

/** Server-side analytics event (only on Vercel). Never pass personal data. Never throws. */
export async function trackServer(event: AnalyticsEvent, props?: Record<string, string | number | boolean | null>): Promise<void> {
  if (!process.env.VERCEL) return
  try {
    await track(event, props)
  } catch (err) {
    log.warn('analytics', 'server track failed', { event, message: err instanceof Error ? err.message : String(err) })
  }
}
