import 'server-only'
import { Resend } from 'resend'
import { log, maskEmail } from '@/lib/log'

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

/** Sends an email through Resend. Never throws: failures are logged and reported as false. */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  const recipients = (Array.isArray(msg.to) ? msg.to : [msg.to]).filter(Boolean)
  if (recipients.length === 0) return false
  const from =
    msg.from === 'supply'
      ? process.env.EMAIL_FROM_SUPPLY ?? process.env.EMAIL_FROM ?? 'HagerLand Supply <supply@hagerland.com>'
      : process.env.EMAIL_FROM ?? 'HagerLand <hello@hagerland.com>'
  const testMailbox = process.env.EMAIL_TEST_MAILPIT_URL
  if (testMailbox) {
    try {
      return await sendToTestMailbox(testMailbox, msg, recipients, from)
    } catch (err) {
      log.error('email', 'test mailbox send failed', err)
      return false
    }
  }
  if (!key) {
    log.warn('email', 'RESEND_API_KEY not set; email not sent', { subject: msg.subject })
    return false
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
      return false
    }
    return true
  } catch (err) {
    log.error('email', 'send threw', err, { subject: msg.subject })
    return false
  }
}
