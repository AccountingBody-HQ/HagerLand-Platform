import 'server-only'
import { getAdminSupabase } from '@/lib/supabase/admin'

/** Groups similar messages: ids, numbers and quoted values are replaced so repeats count as one row. */
export function normaliseErrorMessage(message: string): string {
  return message
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>')
    .replace(/"[^"]{0,200}"|'[^']{0,200}'/g, '<value>')
    .replace(/\d+/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300)
}

/**
 * Records a server error in the errors table (one row per route + message, with a count), for the
 * admin digest. Best effort: never throws and never logs (to avoid loops).
 */
export async function recordError(route: string, message: string): Promise<void> {
  if (!process.env.SUPABASE_SECRET_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return
  try {
    const db = getAdminSupabase()
    const key = { route: route.slice(0, 120), message: normaliseErrorMessage(message) || 'unknown' }
    const now = new Date().toISOString()
    const { data } = await db.from('errors').select('id, count').eq('route', key.route).eq('message', key.message).maybeSingle()
    if (data) await db.from('errors').update({ count: data.count + 1, last_seen_at: now }).eq('id', data.id)
    else await db.from('errors').insert({ ...key, first_seen_at: now, last_seen_at: now })
  } catch {
    // monitoring must never break a request
  }
}
