import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { log } from '@/lib/log'

// Uses the existing rate_limits table (key, count, reset_at) with a fixed window per key.
let client: SupabaseClient | null = null
function db(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return null
  if (!client) client = createClient(url, key, { auth: { persistSession: false }, global: { fetch: (i, init) => fetch(i, { ...init, cache: 'no-store' }) } })
  return client
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
}

export type RateLimitDecision =
  | { action: 'reset'; result: RateLimitResult; resetAt: Date }
  | { action: 'increment'; result: RateLimitResult; count: number }
  | { action: 'block'; result: RateLimitResult }

/** Pure fixed-window decision: start a new window, count this hit, or block. */
export function decideRateLimit(row: { count: number; reset_at: string } | null, now: Date, limit: number, windowSeconds: number): RateLimitDecision {
  if (!row || new Date(row.reset_at) < now) {
    return { action: 'reset', result: { allowed: true, remaining: limit - 1 }, resetAt: new Date(now.getTime() + windowSeconds * 1000) }
  }
  if (row.count >= limit) return { action: 'block', result: { allowed: false, remaining: 0 } }
  return { action: 'increment', result: { allowed: true, remaining: limit - row.count - 1 }, count: row.count + 1 }
}

/**
 * Counts one hit against `key` (namespace it, e.g. "enquiry:ip:<hash>") and reports whether
 * the caller is still under `limit` hits per `windowSeconds`. Fails open if the store is unavailable.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const supabase = db()
  if (!supabase) return { allowed: true, remaining: limit }
  const now = new Date()
  try {
    const { data } = await supabase.from('rate_limits').select('count, reset_at').eq('key', key).maybeSingle<{ count: number; reset_at: string }>()
    const decision = decideRateLimit(data, now, limit, windowSeconds)
    if (decision.action === 'reset') await supabase.from('rate_limits').upsert({ key, count: 1, reset_at: decision.resetAt.toISOString() })
    else if (decision.action === 'increment') await supabase.from('rate_limits').update({ count: decision.count }).eq('key', key)
    return decision.result
  } catch (err) {
    log.error('rate-limit', 'rate limit check failed', err, { key: key.split(':')[0] })
    return { allowed: true, remaining: limit }
  }
}

export async function clearRateLimit(key: string): Promise<void> {
  const supabase = db()
  if (!supabase) return
  await supabase.from('rate_limits').delete().eq('key', key)
}

export async function isAdminLoginRateLimited(ip: string): Promise<boolean> {
  const result = await rateLimit(`admin-login:${ip}`, 5, 15 * 60)
  return !result.allowed
}

export async function clearAdminLoginRateLimit(ip: string): Promise<void> {
  await clearRateLimit(`admin-login:${ip}`)
}

/** Deletes expired rate-limit rows (daily cron). */
export async function purgeExpiredRateLimits(olderThanDays = 7): Promise<void> {
  const supabase = db()
  if (!supabase) return
  await supabase.from('rate_limits').delete().lt('reset_at', new Date(Date.now() - olderThanDays * 86_400_000).toISOString())
}
