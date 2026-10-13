// Edge-runtime (Web Crypto) check of the admin session cookie, used by middleware.
// Mirrors verifySessionToken() in lib/admin-auth.ts: token = "<expiresMs>.<hex HMAC-SHA256>".

export const ADMIN_SESSION_COOKIE = 'hl_admin_session'

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function verifyAdminSessionEdge(token: string | undefined): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!token || !secret) return false
  const [payload, mac] = token.split('.')
  if (!payload || !mac) return false
  const expires = Number(payload)
  if (!Number.isFinite(expires) || Date.now() > expires) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const expected = toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)))
  return constantTimeEqual(expected, mac)
}
