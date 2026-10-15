import 'server-only'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { deliverEmail } from './send'

const MAX_ATTEMPTS = 5
const HOUR = 3_600_000

/** Retries emails that failed to send, backing off by an hour per attempt; gives up after 5 attempts (spec 25.4). */
export async function retryOutbox(now = Date.now()): Promise<{ sent: number; failed: number; gaveUp: number }> {
  const db = getAdminSupabase()
  const { data } = await db.from('email_outbox').select('*').eq('status', 'failed').lte('next_attempt_at', new Date(now).toISOString()).order('created_at').limit(50)
  const out = { sent: 0, failed: 0, gaveUp: 0 }
  for (const m of data ?? []) {
    const res = await deliverEmail({ to: m.to_addresses, subject: m.subject, html: m.html, text: m.text_body, replyTo: m.reply_to ?? undefined, from: m.sender === 'supply' ? 'supply' : 'default', headers: (m.headers as Record<string, string>) ?? undefined })
    const attempts = m.attempts + 1
    if (res.ok) {
      await db.from('email_outbox').update({ status: 'sent', attempts, sent_at: new Date(now).toISOString() }).eq('id', m.id)
      out.sent++
    } else if (attempts >= MAX_ATTEMPTS) {
      await db.from('email_outbox').update({ status: 'gave_up', attempts, last_error: res.error.slice(0, 500) }).eq('id', m.id)
      out.gaveUp++
    } else {
      await db.from('email_outbox').update({ attempts, last_error: res.error.slice(0, 500), next_attempt_at: new Date(now + attempts * HOUR).toISOString() }).eq('id', m.id)
      out.failed++
    }
  }
  // Sent and abandoned messages contain personal data: kept 30 days for troubleshooting, then deleted.
  await db.from('email_outbox').delete().in('status', ['sent', 'gave_up']).lt('created_at', new Date(now - 30 * 24 * HOUR).toISOString())
  return out
}
