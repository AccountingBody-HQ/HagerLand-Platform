'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { authenticator } from 'otplib'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { createSessionToken, SESSION_COOKIE } from '@/lib/admin-auth'
import { decryptSecret, encryptSecret, hashInviteToken } from '@/lib/admin/staff-crypto'
import { isAdminLoginRateLimited, clearAdminLoginRateLimit } from '@/lib/rate-limit'
import { getClientIp, hashIp } from '@/lib/security'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { passwordSchema } from '@/lib/validation/common'
import { brand } from '@/lib/brand'
import { isStaffRole } from '@/lib/admin/roles'
import { log } from '@/lib/log'

async function invited(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null
  const { data } = await getAdminSupabase().from('staff_users').select('id, email, name, role, status, user_id, invite_expires_at, totp_secret_enc').eq('invite_token_hash', hashInviteToken(token)).maybeSingle()
  if (!data || data.status !== 'invited' || !data.invite_expires_at || data.invite_expires_at < new Date().toISOString()) return null
  return data
}

export type SetupState = ActionResult<{ secret: string; otpauth: string }> | null

/**
 * Step 1 of a staff invitation: choose a password; a staff sign-in (separate from customer accounts) is created and
 * an authenticator secret is issued. Step 2 confirms a code before the account works (spec 26.15).
 */
export async function startStaffSetupAction(token: string, _prev: SetupState, formData: FormData): Promise<SetupState> {
  const s = await invited(token)
  if (!s) return fail('This invitation has expired or was already used. Ask the owner to send a new one.')
  const p = z.object({ password: passwordSchema, confirm: z.string() }).refine((d) => d.password === d.confirm, { message: 'The passwords do not match', path: ['confirm'] }).safeParse(Object.fromEntries(formData))
  if (!p.success) return invalid(p.error)
  const db = getAdminSupabase()
  let userId = s.user_id
  if (userId) {
    const { error } = await db.auth.admin.updateUserById(userId, { password: p.data.password })
    if (error) return fail('Could not save the password. Please try again.')
  } else {
    const { data, error } = await db.auth.admin.createUser({ email: s.email, password: p.data.password, email_confirm: true, app_metadata: { staff: true }, user_metadata: { full_name: s.name } })
    if (error || !data.user) {
      log.error('staff', 'create user failed', error)
      return fail(/registered|exists/i.test(error?.message ?? '') ? 'This email is already used by a HagerLand customer account. Staff accounts are separate: ask the owner to invite a different (work) email.' : 'Could not create your account. Please try again.')
    }
    userId = data.user.id
  }
  const secret = authenticator.generateSecret()
  await db.from('staff_users').update({ user_id: userId, totp_secret_enc: encryptSecret(secret) }).eq('id', s.id)
  return ok({ secret, otpauth: authenticator.keyuri(s.email, `${brand.name} admin`, secret) })
}

export type ConfirmState = ActionResult<{ message: string }> | null

export async function confirmStaffSetupAction(token: string, _prev: ConfirmState, formData: FormData): Promise<ConfirmState> {
  const s = await invited(token)
  if (!s || !s.totp_secret_enc || !s.user_id) return fail('Start again from the invitation link.')
  const secret = decryptSecret(s.totp_secret_enc)
  const code = String(formData.get('code') ?? '').replace(/\s/g, '')
  if (!secret || !authenticator.check(code, secret)) return fail('That code did not match. Check your authenticator app and try again.', { code: 'Enter the current 6-digit code' })
  await getAdminSupabase().from('staff_users').update({ status: 'active', totp_enrolled_at: new Date().toISOString(), invite_token_hash: null, invite_expires_at: null }).eq('id', s.id)
  await getAdminSupabase().from('audit_log').insert({ actor: `staff:${s.email}`.slice(0, 80), action: 'staff.enrolled', entity_type: 'staff', entity_id: s.id, entity_label: s.email })
  redirect('/roodber8-login?enrolled=1')
}

/** Staff sign-in: email, password and authenticator code (spec 26.15). */
export async function staffLoginAction(formData: FormData) {
  const ip = getClientIp(await headers())
  if (await isAdminLoginRateLimited(ip)) redirect('/roodber8-login?error=rate_limited&staff=1')
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const code = String(formData.get('code') ?? '').replace(/\s/g, '')
  const db = getAdminSupabase()
  const { data: s } = email ? await db.from('staff_users').select('id, email, role, status, user_id, totp_secret_enc').ilike('email', email.replace(/[\\%_]/g, (m) => `\\${m}`)).maybeSingle() : { data: null }
  let okLogin = false
  if (s && s.status === 'active' && s.user_id && s.totp_secret_enc) {
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '', { auth: { persistSession: false, autoRefreshToken: false } })
    const { data } = await anon.auth.signInWithPassword({ email: s.email, password })
    const secret = decryptSecret(s.totp_secret_enc)
    okLogin = data.user?.id === s.user_id && Boolean(secret) && authenticator.check(code, secret as string)
    if (data.session) await anon.auth.signOut()
  }
  if (!s || !okLogin || !isStaffRole(s.role)) redirect('/roodber8-login?error=1&staff=1')
  await clearAdminLoginRateLimit(ip)
  const session = createSessionToken({ id: s.id, role: s.role })
  ;(await cookies()).set(SESSION_COOKIE, session.value, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: session.maxAge })
  await db.from('staff_users').update({ last_login_at: new Date().toISOString() }).eq('id', s.id)
  await db.from('audit_log').insert({ actor: `staff:${s.email}`.slice(0, 80), action: 'staff.login', entity_type: 'staff', entity_id: s.id, entity_label: s.email, ip_hash: hashIp(ip) })
  redirect('/roodber8')
}
