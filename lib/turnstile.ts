import 'server-only'
import { IS_PRODUCTION } from '@/lib/site'
import { log } from '@/lib/log'

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Verifies a Cloudflare Turnstile token. When no secret is configured, non-production
 * environments are allowed through (so previews work) and production is refused.
 */
export async function verifyTurnstileToken(token: string | null | undefined, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return !IS_PRODUCTION
  if (!token) return false
  try {
    const body = new URLSearchParams({ secret, response: token })
    if (ip && ip !== 'unknown') body.set('remoteip', ip)
    const res = await fetch(VERIFY_URL, { method: 'POST', body, cache: 'no-store' })
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] }
    if (!data.success) log.warn('turnstile', 'verification failed', { codes: data['error-codes'] })
    return data.success === true
  } catch (err) {
    log.error('turnstile', 'verification request failed', err)
    return false
  }
}

export const HONEYPOT_FIELD = 'hl_extra_field'

/** A hidden field real users never fill in. A value means a bot. */
export function isHoneypotFilled(formData: FormData): boolean {
  const value = formData.get(HONEYPOT_FIELD)
  return typeof value === 'string' && value.trim().length > 0
}
