'use server'

import crypto from 'node:crypto'
import { headers } from 'next/headers'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { getClientIp, hashIp } from '@/lib/security'
import { rateLimit } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { checkbox, emailSchema, optionalText } from '@/lib/validation/common'
import { hashRequestToken, isWellFormedToken } from '@/lib/service-requests/token'
import { sendEmail } from '@/lib/email/send'
import { renderEmail } from '@/lib/email/layout'
import { canonicalUrl } from '@/lib/site'
import { log } from '@/lib/log'
import { NEWSLETTER_CONSENT } from '@/lib/newsletter'
import { spamCheckDrop } from '@/lib/spam-check'
import { transferConsentMissing } from '@/lib/data-transfer'
import { recordTransferConsent } from '@/lib/data-transfer-server'

export type NewsletterState = ActionResult<{ message: string }> | null

const schema = z.object({
  email: emailSchema,
  name: optionalText(120, 'Name'),
  consent: checkbox.refine((v) => v, 'Tick the box to agree to receive the newsletter'),
  source: optionalText(120),
})

/**
 * Newsletter sign-up (spec 26.10) with its own, recorded consent: separate from any form's purpose. Signing up again
 * re-subscribes. The confirmation email carries the one-click unsubscribe link (spec 25.4 marketing rules).
 */
export async function subscribeNewsletterAction(_prev: NewsletterState, formData: FormData): Promise<NewsletterState> {
  if (await spamCheckDrop(formData, 'subscribe_newsletter')) return ok({ message: 'Thank you.' })
  const noConsent = transferConsentMissing(formData)
  if (noConsent) return noConsent
  const p = schema.safeParse(Object.fromEntries(formData))
  if (!p.success) return invalid(p.error)
  const ip = getClientIp(await headers())
  const ipHash = hashIp(ip)
  if (!(await rateLimit(`newsletter:${ipHash}`, 5, 3600)).allowed) return fail('Please wait a while and try again.')
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, ip))) return fail('Please complete the security check and try again.')
  const token = crypto.randomBytes(32).toString('base64url')
  const row = { email: p.data.email, name: p.data.name ?? null, status: 'subscribed', consent_at: new Date().toISOString(), consent_text: NEWSLETTER_CONSENT, source: p.data.source ?? null, unsubscribe_token_hash: hashRequestToken(token), unsubscribed_at: null, ip_hash: ipHash }
  const db = getAdminSupabase()
  const { data: existing } = await db.from('newsletter_subscriptions').select('id').ilike('email', p.data.email.replace(/[\\%_]/g, (m) => `\\${m}`)).maybeSingle()
  const { error } = existing ? await db.from('newsletter_subscriptions').update(row).eq('id', existing.id) : await db.from('newsletter_subscriptions').insert(row)
  if (error) {
    log.error('newsletter', 'save failed', error)
    return fail('We could not sign you up. Please try again.')
  }
  const unsubscribe = canonicalUrl(`/newsletter/unsubscribe?token=${token}`)
  await sendEmail({
    to: p.data.email,
    headers: { 'List-Unsubscribe': `<${unsubscribe}>` },
    ...renderEmail({
      subject: 'You are signed up to HagerLand news',
      preheader: 'Property news and guides from HagerLand.',
      heading: 'Thanks for signing up',
      paragraphs: ['You will receive occasional emails with new guides, market insight and HagerLand news. We never share your email address.'],
      reason: 'You are receiving this because you signed up to the HagerLand newsletter.',
      footerLinks: [{ label: 'Unsubscribe', href: unsubscribe }],
    }),
  })
  await recordTransferConsent({ form: 'newsletter', subjectTable: 'newsletter_subscriptions', subjectId: null, subjectReference: null })
  return ok({ message: 'Thank you. Check your email for a confirmation.' })
}

/** One-click unsubscribe (button press, so link scanners cannot unsubscribe people). Never reveals whether an email exists. */
export async function unsubscribeNewsletterAction(token: string): Promise<ActionResult<{ message: string }>> {
  if (!isWellFormedToken(token)) return fail('This link is not valid.')
  await getAdminSupabase().from('newsletter_subscriptions').update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() }).eq('unsubscribe_token_hash', hashRequestToken(token))
  return ok({ message: 'You are unsubscribed. You will not receive the newsletter again.' })
}
