import 'server-only'
// QC-1a: a form whose hidden spam-check field is filled still answers the sender as usual, saves nothing and sends
// nothing; each such drop is now COUNTED, so silent drops become visible in the daily digest. Only the form's name and
// the hour are kept, in the errors table (its 90-day clean-up applies): never the message, a name, a phone number, an
// email, an internet address or a browser.
import { getAdminSupabase } from '@/lib/supabase/admin'
import { readAll, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import { isHoneypotFilled } from '@/lib/turnstile'
import { log } from '@/lib/log'

export const SPAM_DROP_ROUTE = 'spam_check_drop'

/** One counter row per form and hour: "enquiry 2026-10-30T09" (UTC hour; a bot flood stays a few rows). */
export function spamDropKey(form: string, at: Date): string {
  return `${form.replace(/[^a-z0-9_.-]/gi, '').slice(0, 60)} ${at.toISOString().slice(0, 13)}`
}

/** Adds one to the form's counter for this hour. Never throws: a failed count must not change what the sender sees. */
export async function recordSpamDrop(form: string, at = new Date()): Promise<void> {
  try {
    const db = getAdminSupabase()
    const key = { route: SPAM_DROP_ROUTE, message: spamDropKey(form, at) }
    const { data, error } = await db.from('errors').select('id, count').eq('route', key.route).eq('message', key.message).maybeSingle()
    if (error) throw new Error(error.message)
    const now = at.toISOString()
    const write = data ? await db.from('errors').update({ count: data.count + 1, last_seen_at: now }).eq('id', data.id) : await db.from('errors').insert({ ...key, first_seen_at: now, last_seen_at: now })
    if (write.error) throw new Error(write.error.message)
  } catch (err) {
    log.warn('spam-check', 'drop not counted', { form, error: err instanceof Error ? err.message : 'unknown' })
  }
}

/** True when the spam check caught this submission (and it has been counted). The caller answers as before. */
export async function spamCheckDrop(formData: FormData, form: string): Promise<boolean> {
  if (!isHoneypotFilled(formData)) return false
  await recordSpamDrop(form)
  return true
}

/** Drops counted since a moment (the digest's last 24 hours), as a head-count-like result for the failure rule. */
export async function spamDropsSince(since: string): Promise<{ count: number | null; error: { message: string } | null }> {
  try {
    const { data } = await readAll(() => getAdminSupabase().from('errors').select('id, count').eq('route', SPAM_DROP_ROUTE).gte('last_seen_at', since), { maxRows: REPORT_MAX_ROWS })
    return { count: data.reduce((sum, r) => sum + r.count, 0), error: null }
  } catch (err) {
    return { count: null, error: { message: err instanceof Error ? err.message : 'unknown' } }
  }
}
