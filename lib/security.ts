import 'server-only'
import crypto from 'crypto'

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** Escape text for safe insertion into HTML (emails, admin previews). */
export function escapeHtml(value: string | null | undefined): string {
  if (!value) return ''
  return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch])
}

/** Remove control characters and collapse runs of spaces; keeps line breaks. */
export function sanitizeText(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Escape a value for use inside a PostgREST ilike pattern (`%`, `_`, `,`, `(`, `)` and backslash). */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_,()]/g, (ch) => `\\${ch}`)
}

function ipSalt(): string {
  const salt = process.env.IP_HASH_SALT ?? process.env.ADMIN_SESSION_SECRET
  if (!salt) throw new Error('IP_HASH_SALT is not set')
  return salt
}

/** One-way hash of an IP address so we can rate-limit and spot abuse without storing the IP. */
export function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(`${ipSalt()}:${ip}`).digest('hex')
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return headers.get('x-real-ip') ?? 'unknown'
}

/** Constant-time string comparison for secrets such as CRON_SECRET. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}
