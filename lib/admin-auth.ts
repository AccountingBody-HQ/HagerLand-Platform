import { cookies } from 'next/headers'
import { authenticator } from 'otplib'
import crypto from 'crypto'

const SESSION_COOKIE_NAME = 'hl_admin_session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8 // 8 hours

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not set')
  return secret
}

export function verifyCredentials(username: string, password: string): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME
  const expectedPassword = process.env.ADMIN_PASSWORD
  if (!expectedUsername || !expectedPassword) return false

  // constant-time comparison to avoid timing attacks
  const userMatch = crypto.timingSafeEqual(
    Buffer.from(username.padEnd(64)),
    Buffer.from(expectedUsername.padEnd(64))
  )
  const passMatch = crypto.timingSafeEqual(
    Buffer.from(password.padEnd(128)),
    Buffer.from(expectedPassword.padEnd(128))
  )
  return userMatch && passMatch
}

export function verifyCode(code: string): boolean {
  const secret = process.env.ADMIN_TOTP_SECRET
  if (!secret) return false
  try {
    return authenticator.check(code, secret)
  } catch {
    return false
  }
}

export function createSessionToken(): { value: string; maxAge: number } {
  const expires = Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  const payload = `${expires}`
  const hmac = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('hex')
  return { value: `${payload}.${hmac}`, maxAge: SESSION_MAX_AGE_SECONDS }
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false
  const [payload, hmac] = token.split('.')
  if (!payload || !hmac) return false

  const expectedHmac = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('hex')
  const hmacBuffer = Buffer.from(hmac)
  const expectedBuffer = Buffer.from(expectedHmac)
  if (hmacBuffer.length !== expectedBuffer.length) return false
  if (!crypto.timingSafeEqual(hmacBuffer, expectedBuffer)) return false

  const expires = parseInt(payload, 10)
  if (isNaN(expires) || Date.now() > expires) return false

  return true
}

export const SESSION_COOKIE = SESSION_COOKIE_NAME

export function requireAdminSession(): void {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) {
    throw new Error('Unauthorized')
  }
}
