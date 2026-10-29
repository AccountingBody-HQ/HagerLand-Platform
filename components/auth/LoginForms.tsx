'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { magicLinkAction, signInAction } from '@/app/(account)/auth-actions'
import { Field, Input, describedBy } from '@/components/ui/Field'
import { Tabs } from '@/components/ui/Tabs'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import { NoResetForm } from '@/components/forms/NoResetForm'
import { Turnstile } from '@/components/forms/Turnstile'

function PasswordForm({ next }: { next: string }) {
  const [state, action] = useActionState(signInAction, null)
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  return (
    <NoResetForm action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      <Field label="Email" htmlFor="login-email" error={errors.email}>
        <Input id="login-email" name="email" type="email" autoComplete="email" required invalid={Boolean(errors.email)} aria-describedby={describedBy('login-email', errors.email)} />
      </Field>
      <Field label="Password" htmlFor="login-password" error={errors.password}>
        <Input id="login-password" name="password" type="password" autoComplete="current-password" required invalid={Boolean(errors.password)} aria-describedby={describedBy('login-password', errors.password)} />
      </Field>
      <div className="text-right text-small">
        <Link href="/auth/reset-password" className="font-medium text-green hover:underline">
          Forgot your password?
        </Link>
      </div>
      <SubmitButton fullWidth pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </NoResetForm>
  )
}

function MagicLinkForm({ next }: { next: string }) {
  const [state, action] = useActionState(magicLinkAction, null)
  if (state?.ok) {
    return (
      <FormAlert tone="success">
        If an account exists for <strong>{state.data.email}</strong>, we&apos;ve sent a sign-in link. It works once and expires in an hour.
      </FormAlert>
    )
  }
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  return (
    <NoResetForm action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      <Field label="Email" htmlFor="magic-email" error={errors.email} hint="We'll email you a link that signs you in. No password needed.">
        <Input id="magic-email" name="email" type="email" autoComplete="email" required invalid={Boolean(errors.email)} aria-describedby={describedBy('magic-email', errors.email, 'hint')} />
      </Field>
      <Turnstile action="magic_link" />
      <SubmitButton fullWidth pendingText="Sending…">
        Email me a sign-in link
      </SubmitButton>
    </NoResetForm>
  )
}

export function LoginForms({ next }: { next: string }) {
  return (
    <Tabs
      listClassName="[&>button]:flex-1"
      items={[
        { id: 'password', label: 'Password', content: <PasswordForm next={next} /> },
        { id: 'link', label: 'Email link', content: <MagicLinkForm next={next} /> },
      ]}
    />
  )
}
