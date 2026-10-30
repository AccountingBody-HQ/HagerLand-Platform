'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getServerSupabase } from '@/lib/supabase/server'
import { loginSchema, magicLinkSchema, signupSchema, updatePasswordSchema, BUSINESS_INTENTS } from '@/lib/validation/auth'
import { safeNextPath } from '@/lib/validation/common'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { getClientIp, hashIp } from '@/lib/security'
import { rateLimit } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { absoluteUrl } from '@/lib/site'
import { log, maskEmail } from '@/lib/log'
import { spamCheckDrop } from '@/lib/spam-check'

const GENERIC_AUTH_ERROR = 'Something went wrong. Please try again in a moment.'

async function limited(action: string, limit: number, windowSeconds: number): Promise<boolean> {
  const ip = getClientIp(await headers())
  const result = await rateLimit(`auth-${action}:${hashIp(ip)}`, limit, windowSeconds)
  return !result.allowed
}

function callbackUrl(next: string): string {
  return absoluteUrl(`/auth/callback?next=${encodeURIComponent(next)}`)
}

export async function signUpAction(_prev: ActionResult<{ email: string }> | null, formData: FormData): Promise<ActionResult<{ email: string }>> {
  if (await spamCheckDrop(formData, 'sign_up')) return ok({ email: '' })
  const parsed = signupSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  if (await limited('signup', 5, 3600)) return fail('Too many sign-up attempts. Please wait an hour and try again.')
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, getClientIp(await headers())))) {
    return fail('Please complete the security check and try again.')
  }
  const { intent, full_name, email, phone, password } = parsed.data
  // After confirming, people return to where they started (e.g. a team invitation), else to onboarding.
  const next = formData.get('next') ? safeNextPath(formData.get('next')) : '/onboarding'
  const { error } = await getServerSupabase().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl(next),
      data: { full_name, phone, signup_intent: intent, account_type: BUSINESS_INTENTS.includes(intent) ? 'business' : 'personal' },
    },
  })
  if (error) {
    log.warn('auth', 'sign-up failed', { email: maskEmail(email), code: error.code })
    if (error.code === 'weak_password') return fail('Choose a stronger password.', { password: 'Choose a stronger password' })
    if (error.code === 'over_email_send_rate_limit') return fail('Too many emails sent. Please wait a few minutes and try again.')
    return fail(GENERIC_AUTH_ERROR)
  }
  return ok({ email })
}

export async function signInAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  if (await limited('login', 10, 900)) return fail('Too many sign-in attempts. Please wait 15 minutes and try again.')
  const { data, error } = await getServerSupabase().auth.signInWithPassword(parsed.data)
  // Staff accounts are separate from customer accounts (spec 26.15): they sign in to admin only.
  if (data.user?.app_metadata?.staff === true) {
    await getServerSupabase().auth.signOut()
    return fail('This is a HagerLand staff account. Staff sign in at the admin sign-in page.')
  }
  if (error) {
    if (error.code === 'email_not_confirmed') return fail('Please confirm your email first. Check your inbox for the link we sent.')
    return fail('That email and password do not match. Try again or use an email link.')
  }
  redirect(safeNextPath(formData.get('next')))
}

export async function magicLinkAction(_prev: ActionResult<{ email: string }> | null, formData: FormData): Promise<ActionResult<{ email: string }>> {
  const parsed = magicLinkSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  if (await limited('magic', 5, 3600)) return fail('Too many requests. Please wait an hour and try again.')
  // Fix F-7: the security check, so nobody can use HagerLand to send sign-in emails to strangers.
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, getClientIp(await headers())))) return fail('Please complete the security check and try again.')
  const next = safeNextPath(formData.get('next'))
  const { error } = await getServerSupabase().auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: callbackUrl(next), shouldCreateUser: false },
  })
  if (error && error.code !== 'otp_disabled' && error.status !== 422 && error.status !== 400) {
    log.warn('auth', 'magic link failed', { code: error.code })
    return fail(GENERIC_AUTH_ERROR)
  }
  return ok({ email: parsed.data.email })
}

export async function resetPasswordAction(_prev: ActionResult<{ email: string }> | null, formData: FormData): Promise<ActionResult<{ email: string }>> {
  const parsed = magicLinkSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  if (await limited('reset', 5, 3600)) return fail('Too many requests. Please wait an hour and try again.')
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, getClientIp(await headers())))) return fail('Please complete the security check and try again.')
  await getServerSupabase().auth.resetPasswordForEmail(parsed.data.email, { redirectTo: callbackUrl('/auth/update-password') })
  return ok({ email: parsed.data.email })
}

export async function updatePasswordAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const supabase = getServerSupabase()
  const { data } = await supabase.auth.getUser()
  if (!data.user) return fail('Your reset link has expired. Request a new one.')
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return fail(error.code === 'same_password' ? 'Choose a password you have not used before.' : GENERIC_AUTH_ERROR)
  return ok(undefined, 'Your password has been updated.')
}

export async function googleSignInAction(formData: FormData): Promise<void> {
  const next = safeNextPath(formData.get('next'))
  const { data, error } = await getServerSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callbackUrl(next) },
  })
  if (error || !data.url) redirect('/login?error=google')
  redirect(data.url)
}

export async function signOutAction(): Promise<void> {
  await getServerSupabase().auth.signOut()
  redirect('/')
}
