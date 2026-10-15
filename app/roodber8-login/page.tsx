import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'
import { login } from '@/app/roodber8/login-actions'
import { LogoMark } from '@/components/brand/Logo'
import { Field, Input } from '@/components/ui/Field'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Admin sign in', robots: { index: false, follow: false } }

export default async function AdminLoginPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams
  if (verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value)) redirect('/roodber8')
  const rateLimited = searchParams.error === 'rate_limited'
  return (
    <main className="hl-blueprint flex min-h-dvh items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-7 shadow-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark className="size-11" />
          <h1 className="mt-3 font-display text-h3 font-extrabold">HagerLand admin</h1>
          <p className="text-small text-muted">Sign in to continue</p>
        </div>
        <form action={login} className="space-y-4">
          {searchParams.error && <FormAlert>{rateLimited ? 'Too many attempts. Please wait 15 minutes and try again.' : 'Those details did not match. Please try again.'}</FormAlert>}
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
      </div>
    </main>
  )
}
