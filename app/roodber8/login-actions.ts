'use server'

import { cookies } from 'next/headers'
import { verifyCredentials, verifyCode, createSessionToken, SESSION_COOKIE } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const username = (formData.get('username') as string) || ''
  const password = (formData.get('password') as string) || ''
  const code = (formData.get('code') as string) || ''

  const credsOk = verifyCredentials(username, password)
  const codeOk = verifyCode(code)

  if (!credsOk || !codeOk) {
    redirect('/roodber8-login?error=1')
  }

  const session = createSessionToken()
  cookies().set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: session.maxAge,
  })

  redirect('/roodber8')
}

export async function logout() {
  cookies().delete(SESSION_COOKIE)
  redirect('/roodber8')
}
