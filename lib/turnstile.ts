import 'server-only'
import { IS_PRODUCTION } from '@/lib/site'
import { log } from '@/lib/log'
import { HONEYPOT_FIELD, LEGACY_HONEYPOT_FIELD } from '@/lib/honeypot'

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

const PRODUCTION_HOSTS = ['www.hagerland.com', 'hagerland.com']

/**
 * The sites a token may come from (Fix F-7). Production accepts only HagerLand's own hosts; previews and local copies
 * also accept localhost and their own deployment host. A production server never accepts a preview host.
 */
export function allowedTurnstileHosts(): string[] {
  if (IS_PRODUCTION) return PRODUCTION_HOSTS
  const own = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL].filter((h): h is string => Boolean(h)).map((h) => h.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase())
  return Array.from(new Set([...PRODUCTION_HOSTS, 'localhost', '127.0.0.1', ...own]))
}

/**
 * Verifies a Cloudflare Turnstile token, including the site it was solved on. When no secret is configured,
 * non-production environments are allowed through (so previews work) and production is refused.
 */
export async function verifyTurnstileToken(token: string | null | undefined, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return !IS_PRODUCTION
  if (!token) return false
  try {
    const body = new URLSearchParams({ secret, response: token })
    if (ip && ip !== 'unknown') body.set('remoteip', ip)
    const res = await fetch(VERIFY_URL, { method: 'POST', body, cache: 'no-store' })
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[]; hostname?: string }
    if (!data.success) {
      log.warn('turnstile', 'verification failed', { codes: data['error-codes'] })
      return false
    }
    const host = (data.hostname ?? '').toLowerCase()
    if (!allowedTurnstileHosts().includes(host)) {
      log.warn('turnstile', 'token from another site refused', { hostname: host || 'missing' })
      return false
    }
    return true
  } catch (err) {
    log.error('turnstile', 'verification request failed', err)
    return false
  }
}

export { HONEYPOT_FIELD } from '@/lib/honeypot'

/** A hidden field real users never fill in. A value means a bot (the old field name counts too). */
export function isHoneypotFilled(formData: FormData): boolean {
  return [HONEYPOT_FIELD, LEGACY_HONEYPOT_FIELD].some((name) => {
    const value = formData.get(name)
    return typeof value === 'string' && value.trim().length > 0
  })
}
