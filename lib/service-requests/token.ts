import 'server-only'
import crypto from 'crypto'
import { GUEST_LINK_DAYS } from './labels'

/** A new secret for a guest's request link: the raw token goes in the email, only its hash is stored. */
export function newRequestToken(now = Date.now()): { token: string; hash: string; expiresAt: string } {
  const token = crypto.randomBytes(32).toString('base64url')
  return { token, hash: hashRequestToken(token), expiresAt: new Date(now + GUEST_LINK_DAYS * 86_400_000).toISOString() }
}

/** Whole days a link works, read from its real expiry (for the email: never a separately typed number, never 0). */
export function linkDaysLeft(expiresAt: string, now = Date.now()): number {
  return Math.max(1, Math.round((new Date(expiresAt).getTime() - now) / 86_400_000))
}

export function hashRequestToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function isWellFormedToken(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token)
}
