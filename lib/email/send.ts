import 'server-only'
import { Resend } from 'resend'
import { log, maskEmail } from '@/lib/log'
import { getAdminSupabase } from '@/lib/supabase/admin'

export interface EmailMessage {
  to: string | string[]
  subject: string
  html: string
  text: string
  replyTo?: string
  from?: 'default' | 'supply'
  headers?: Record<string, string>
}

let resend: Resend | null = null

function parseFrom(from: string): { Email: string; Name: string } {
  const m = /^(.*)<([^>]+)>$/.exec(from.trim())
  return m ? { Name: m[1].trim(), Email: m[2].trim() } : { Name: '', Email: from.trim() }
}

/**
 * Local test copy only: delivers to the Mailpit mail catcher so tests can read every email.
 * Refuses any address that is not localhost, so it can never send real email.
 */
async function sendToTestMailbox(base: string, msg: EmailMessage, recipients: string[], from: string): Promise<boolean> {
  if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base)) {
    log.error('email', 'EMAIL_TEST_MAILPIT_URL must point at localhost; email not sent')
    return false
  }
  const replyTo = msg.replyTo ?? process.env.EMAIL_REPLY_TO
  const res = await fetch(`${base}/api/v1/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ From: parseFrom(from), To: recipients.map((Email) => ({ Email })), Subject: msg.subject, HTML: msg.html, Text: msg.text, ...(replyTo ? { ReplyTo: [{ Email: replyTo }] } : {}), ...(msg.headers ? { Headers: msg.headers } : {}) }),
  })
  return res.ok
}

type Delivery = { ok: true } | { ok: false; error: string; configured: boolean }

/** One attempt to deliver through Resend (or the local test mailbox). Never throws. */
export async function deliverEmail(msg: EmailMessage): Promise<Delivery> {
  const key = process.env.RESEND_API_KEY
  const recipients = (Array.isArray(msg.to) ? msg.to : [msg.to]).filter(Boolean)
  if (recipients.length === 0) return { ok: false, error: 'no recipients', configured: false }
  const from =
    msg.from === 'supply'
      ? process.env.EMAIL_FROM_SUPPLY ?? process.env.EMAIL_FROM ?? 'HagerLand Supply <supply@hagerland.com>'
      : process.env.EMAIL_FROM ?? 'HagerLand <hello@hagerland.com>'
  const testMailbox = process.env.EMAIL_TEST_MAILPIT_URL
  if (testMailbox) {
    try {
      return (await sendToTestMailbox(testMailbox, msg, recipients, from)) ? { ok: true } : { ok: false, error: 'test mailbox refused the message', configured: true }
    } catch (err) {
      log.error('email', 'test mailbox send failed', err)
      return { ok: false, error: 'test mailbox unreachable', configured: true }
    }
  }
  if (!key) {
    log.warn('email', 'RESEND_API_KEY not set; email not sent', { subject: msg.subject })
    return { ok: false, error: 'email is not configured', configured: false }
  }
  if (!resend) resend = new Resend(key)
  try {
    const { error } = await resend.emails.send({
      from,
      to: recipients,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      replyTo: msg.replyTo ?? process.env.EMAIL_REPLY_TO ?? undefined,
      ...(msg.headers ? { headers: msg.headers } : {}),
    })
    if (error) {
      log.error('email', 'send failed', error, { subject: msg.subject, to: recipients.map(maskEmail) })
      return { ok: false, error: error.message?.slice(0, 500) ?? 'send failed', configured: true }
    }
    return { ok: true }
  } catch (err) {
    log.error('email', 'send threw', err, { subject: msg.subject })
    return { ok: false, error: err instanceof Error ? err.message.slice(0, 500) : 'send threw', configured: true }
  }
}

/**
 * Sends an email. Never throws and never blocks the caller (spec 25.4): if delivery fails, the message is
 * kept in the email outbox, shown to HagerLand in admin and retried by the daily job.
 */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const result = await deliverEmail(msg)
  if (result.ok) return true
  if (result.configured) {
    const to = (Array.isArray(msg.to) ? msg.to : [msg.to]).filter(Boolean)
    try {
      await getAdminSupabase().from('email_outbox').insert({ to_addresses: to, subject: msg.subject.slice(0, 300), html: msg.html, text_body: msg.text, reply_to: msg.replyTo ?? null, sender: msg.from ?? 'default', headers: msg.headers ?? {}, last_error: result.error.slice(0, 500) })
    } catch (err) {
      log.error('email', 'could not queue a failed email', err, { subject: msg.subject })
    }
  }
  return false
}
