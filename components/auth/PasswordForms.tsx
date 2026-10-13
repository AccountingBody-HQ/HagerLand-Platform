'use client'

import { useFormState } from 'react-dom'
import { resetPasswordAction, updatePasswordAction } from '@/app/(account)/auth-actions'
import { Field, Input, describedBy } from '@/components/ui/Field'
import { ButtonLink } from '@/components/ui/Button'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'

export function ResetPasswordForm() {
  const [state, action] = useFormState(resetPasswordAction, null)
  if (state?.ok) {
    return (
      <FormAlert tone="success">
        If an account exists for <strong>{state.data.email}</strong>, we&apos;ve sent a link to set a new password.
      </FormAlert>
    )
  }
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  return (
    <form action={action} className="space-y-4" noValidate>
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      <Field label="Email" htmlFor="rp-email" error={errors.email}>
        <Input id="rp-email" name="email" type="email" autoComplete="email" invalid={Boolean(errors.email)} aria-describedby={describedBy('rp-email', errors.email)} />
      </Field>
      <SubmitButton fullWidth pendingText="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  )
}

export function UpdatePasswordForm() {
  const [state, action] = useFormState(updatePasswordAction, null)
  if (state?.ok) {
    return (
      <div className="space-y-4">
        <FormAlert tone="success">{state.message}</FormAlert>
        <ButtonLink href="/account" fullWidth>
          Go to my account
        </ButtonLink>
      </div>
    )
  }
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  return (
    <form action={action} className="space-y-4" noValidate>
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      <Field label="New password" htmlFor="up-password" error={errors.password} hint="At least 10 characters.">
        <Input id="up-password" name="password" type="password" autoComplete="new-password" invalid={Boolean(errors.password)} aria-describedby={describedBy('up-password', errors.password, 'hint')} />
      </Field>
      <Field label="Confirm new password" htmlFor="up-confirm" error={errors.confirm}>
        <Input id="up-confirm" name="confirm" type="password" autoComplete="new-password" invalid={Boolean(errors.confirm)} aria-describedby={describedBy('up-confirm', errors.confirm)} />
      </Field>
      <SubmitButton fullWidth pendingText="Saving…">
        Save new password
      </SubmitButton>
    </form>
  )
}
