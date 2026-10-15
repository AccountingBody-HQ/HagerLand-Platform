'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyCredentials, verifyCode, createSessionToken, SESSION_COOKIE } from '@/lib/admin-auth'
import { isAdminLoginRateLimited, clearAdminLoginRateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/security'
import { audit } from '@/lib/admin/guard'

export async function login(formData: FormData) {
  const ip = getClientIp(await headers())

  if (await isAdminLoginRateLimited(ip)) {
    redirect('/roodber8-login?error=rate_limited')
  }

  const username = (formData.get('username') as string) || ''
  const password = (formData.get('password') as string) || ''
  const code = (formData.get('code') as string) || ''
  const credsOk = verifyCredentials(username, password)
  const codeOk = verifyCode(code)

  if (!credsOk || !codeOk) {
    redirect('/roodber8-login?error=1')
  }

  await clearAdminLoginRateLimit(ip)

  const session = createSessionToken()
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: session.maxAge,
  })
  await audit('admin.login', {})
  redirect('/roodber8')
}
