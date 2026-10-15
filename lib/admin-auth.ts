import 'server-only'
import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { parseSessionPayload, roleCanAccess, type StaffRole } from '@/lib/admin/roles'
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

export function createSessionToken(staff?: { id: string; role: StaffRole }): { value: string; maxAge: number } {
  const expires = Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  const payload = staff ? `${expires}~${staff.id}~${staff.role}` : `${expires}`
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

  const parsed = parseSessionPayload(payload)
  if (!parsed || Date.now() > parsed.expires) return false

  return true
}

export type AdminSession = { kind: 'master' } | { kind: 'staff'; id: string; role: StaffRole; email: string; name: string }

/**
 * The signed-in admin: the master login (AB's break-glass access) or an active staff member (spec 26.15). A staff
 * session stops working as soon as the staff member is disabled or their role changes.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) return null
  const parsed = parseSessionPayload((token as string).split('.')[0])
  if (!parsed) return null
  if (!parsed.staffId || !parsed.role) return { kind: 'master' }
  const { data } = await getAdminSupabase().from('staff_users').select('id, role, status, email, name').eq('id', parsed.staffId).maybeSingle()
  if (!data || data.status !== 'active' || data.role !== parsed.role) return null
  return { kind: 'staff', id: data.id, role: parsed.role, email: data.email, name: data.name }
})

export const SESSION_COOKIE = SESSION_COOKIE_NAME


/**
 * True when the current request carries a valid admin session that may use the admin area being requested
 * (the middleware passes the admin path it checked; requests outside the admin area need any valid session).
 */
export async function isAdminRequest(): Promise<boolean> {
  const session = await getAdminSession()
  if (!session) return false
  if (session.kind === 'master') return true
  const path = (await headers()).get(ADMIN_PATH_HEADER)
  return !path || roleCanAccess(session.role, path)
}

/** Request header set only by the middleware (any value a visitor sends is removed) with the admin path requested. */
export const ADMIN_PATH_HEADER = 'x-hl-admin-path'
