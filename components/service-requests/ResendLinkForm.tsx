'use client'

import { useFormState } from 'react-dom'
import { resendRequestLinkAction } from '@/app/actions/service-request-actions'
import { Field, Input } from '@/components/ui/Field'
import { FormAlert, Honeypot, SubmitButton } from '@/components/forms/FormParts'
import { Turnstile } from '@/components/forms/Turnstile'

export function ResendLinkForm() {
  const [state, action] = useFormState(resendRequestLinkAction, null)
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  if (state?.ok) return <FormAlert tone="success">{state.data.message}</FormAlert>
  return (
    <form action={action} className="space-y-4" noValidate>
      <Honeypot />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      <Field label="Email" htmlFor="rl-email" error={errors.email} required>
        <Input id="rl-email" name="email" type="email" autoComplete="email" invalid={Boolean(errors.email)} />
      </Field>
      <Field label="Reference" htmlFor="rl-ref" error={errors.reference} required hint="For example HLS-2026-000123">
        <Input id="rl-ref" name="reference" invalid={Boolean(errors.reference)} />
      </Field>
      <Turnstile action="request_link" />
      <SubmitButton fullWidth pendingText="Sending…">
        Email me a new link
      </SubmitButton>
    </form>
  )
}
