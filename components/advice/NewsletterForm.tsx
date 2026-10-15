'use client'

import { useActionState } from 'react'
import { subscribeNewsletterAction } from '@/app/actions/newsletter-actions'
import { Field, Input } from '@/components/ui/Field'
import { FormAlert, Honeypot, SubmitButton } from '@/components/forms/FormParts'
import { Turnstile } from '@/components/forms/Turnstile'
import { NoResetForm } from '@/components/forms/NoResetForm'

/** Newsletter sign-up with its own consent box (spec 26.10). */
export function NewsletterForm({ source, consentText }: { source: string; consentText: string }) {
  const [state, action] = useActionState(subscribeNewsletterAction, null)
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {}
  if (state?.ok) return <FormAlert tone="success">{state.data.message}</FormAlert>
  return (
    <NoResetForm action={action} className="space-y-3" noValidate>
      <Honeypot />
      <input type="hidden" name="source" value={source} />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Email" htmlFor="nl-email" error={errors.email} required>
          <Input id="nl-email" name="email" type="email" autoComplete="email" invalid={Boolean(errors.email)} />
        </Field>
        <Field label="Name" htmlFor="nl-name" optional>
          <Input id="nl-name" name="name" autoComplete="name" maxLength={120} />
        </Field>
      </div>
      <label className="flex min-h-11 items-start gap-3 text-small">
        <input type="checkbox" name="consent" value="true" className="mt-0.5 size-5 accent-green" />
        <span>{consentText}</span>
      </label>
      {errors.consent && <p className="text-small text-error">{errors.consent}</p>}
      <Turnstile action="newsletter" />
      <SubmitButton pendingText="Signing up…">Sign up</SubmitButton>
    </NoResetForm>
  )
}
