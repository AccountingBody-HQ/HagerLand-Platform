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
}

let resend: Resend | null = null

/** Sends an email through Resend. Never throws: failures are logged and reported as false. */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  const recipients = (Array.isArray(msg.to) ? msg.to : [msg.to]).filter(Boolean)
  if (recipients.length === 0) return false
  if (!key) {
    log.warn('email', 'RESEND_API_KEY not set; email not sent', { subject: msg.subject })
    return false
  }
  if (!resend) resend = new Resend(key)
  const from =
    msg.from === 'supply'
      ? process.env.EMAIL_FROM_SUPPLY ?? process.env.EMAIL_FROM ?? 'HagerLand Supply <supply@hagerland.com>'
      : process.env.EMAIL_FROM ?? 'HagerLand <hello@hagerland.com>'
  try {
    const { error } = await resend.emails.send({
      from,
      to: recipients,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      replyTo: msg.replyTo ?? process.env.EMAIL_REPLY_TO ?? undefined,
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
