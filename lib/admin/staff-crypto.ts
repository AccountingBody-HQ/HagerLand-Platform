import 'server-only'
import crypto from 'node:crypto'

/**
 * Staff authenticator secrets are stored encrypted (AES-256-GCM). The key is derived from ADMIN_TOTP_SECRET, which
 * AB keeps at cutover (only the admin password and session secret are rotated), so no new setting is needed.
 */
function key(): Buffer {
  const base = process.env.ADMIN_TOTP_SECRET
  if (!base) throw new Error('ADMIN_TOTP_SECRET is not set')
  return crypto.createHmac('sha256', base).update('hagerland-staff-totp-v1').digest()
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.')
}

export function decryptSecret(blob: string): string | null {
  try {
    const [iv, tag, enc] = blob.split('.').map((x) => Buffer.from(x, 'base64url'))
    const d = crypto.createDecipheriv('aes-256-gcm', key(), iv)
    d.setAuthTag(tag)
    return Buffer.concat([d.update(enc), d.final()]).toString('utf8')
  } catch {
    return null
  }
}

export function newInviteToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('base64url')
  return { token, hash: hashInviteToken(token) }
}

export function hashInviteToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
