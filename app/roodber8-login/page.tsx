import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/admin-auth'
import { login } from '@/app/roodber8/login-actions'
import { staffLoginAction } from './staff-actions'
import { LogoMark } from '@/components/brand/Logo'
import { Field, Input } from '@/components/ui/Field'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin sign in', robots: { index: false, follow: false } }

export default async function AdminLoginPage(props: { searchParams: Promise<{ error?: string; staff?: string; enrolled?: string }> }) {
  const searchParams = await props.searchParams
  // A disabled or changed staff session is not valid any more, so it shows the sign-in form instead of looping.
  if (await getAdminSession()) redirect('/roodber8')
  const rateLimited = searchParams.error === 'rate_limited'
  const staffError = Boolean(searchParams.staff)
  const errorText = rateLimited ? 'Too many attempts. Please wait 15 minutes and try again.' : 'Those details did not match. Please try again.'
  return (
    <main className="hl-blueprint flex min-h-dvh items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-7 shadow-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark className="size-11" />
          <h1 className="mt-3 font-display text-h3 font-extrabold">HagerLand admin</h1>
          <p className="text-small text-muted">Sign in to continue</p>
        </div>
        <form action={login} className="space-y-4">
          {searchParams.error && !staffError && <FormAlert>{errorText}</FormAlert>}
          <Field label="Username" htmlFor="adm-user">
            <Input id="adm-user" name="username" autoComplete="username" required />
          </Field>
          <Field label="Password" htmlFor="adm-pass">
            <Input id="adm-pass" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="Authenticator code" htmlFor="adm-code">
            <Input id="adm-code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required className="text-center tracking-[0.3em]" />
          </Field>
          <SubmitButton fullWidth pendingText="Signing in…">
            Sign in
          </SubmitButton>
        </form>
        <details className="group mt-6 border-t border-border pt-4" open={staffError || Boolean(searchParams.enrolled)}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center font-semibold text-green [&::-webkit-details-marker]:hidden">Staff sign in</summary>
          <form action={staffLoginAction} className="mt-3 space-y-4">
            {searchParams.enrolled && <FormAlert tone="success">Your staff account is ready. Sign in below.</FormAlert>}
            {searchParams.error && staffError && <FormAlert>{errorText}</FormAlert>}
            <Field label="Work email" htmlFor="stf-email">
              <Input id="stf-email" name="email" type="email" autoComplete="username" required />
            </Field>
            <Field label="Password" htmlFor="stf-pass">
              <Input id="stf-pass" name="password" type="password" autoComplete="current-password" required />
            </Field>
            <Field label="Authenticator code" htmlFor="stf-code">
              <Input id="stf-code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required className="text-center tracking-[0.3em]" />
            </Field>
            <SubmitButton fullWidth variant="secondary" pendingText="Signing in…">
              Sign in as staff
            </SubmitButton>
          </form>
        </details>
      </div>
    </main>
  )
}
