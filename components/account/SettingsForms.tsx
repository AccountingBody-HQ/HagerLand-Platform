'use client'

import { useFormState } from 'react-dom'
import { changeEmailAction, requestDeletionAction, updateProfileAction } from '@/app/(account)/account/settings/actions'
import { Field, Input, Select, describedBy } from '@/components/ui/Field'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'

export function ProfileForm({ defaults }: { defaults: { full_name: string; phone: string | null; preferred_contact: string | null; marketing_opt_in: boolean } }) {
  const [state, action] = useFormState(updateProfileAction, null)
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  return (
    <form action={action} className="space-y-4" noValidate>
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      {state?.ok && <FormAlert tone="success">{state.message}</FormAlert>}
      <Field label="Full name" htmlFor="pf-name" error={errors.full_name} required>
        <Input id="pf-name" name="full_name" defaultValue={defaults.full_name} invalid={Boolean(errors.full_name)} aria-describedby={describedBy('pf-name', errors.full_name)} />
      </Field>
      <Field label="Phone" htmlFor="pf-phone" error={errors.phone}>
        <PhoneInput id="pf-phone" name="phone" defaultValue={defaults.phone} invalid={Boolean(errors.phone)} />
      </Field>
      <Field label="How do you prefer to be contacted?" htmlFor="pf-pref">
        <Select id="pf-pref" name="preferred_contact" defaultValue={defaults.preferred_contact ?? ''}>
          <option value="">No preference</option>
          <option value="phone">Phone call</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="telegram">Telegram</option>
          <option value="email">Email</option>
        </Select>
      </Field>
      <div className="flex min-h-11 items-start gap-3">
        <input id="pf-marketing" name="marketing_opt_in" type="checkbox" value="true" defaultChecked={defaults.marketing_opt_in} className="mt-1 size-5 accent-green" />
        <label htmlFor="pf-marketing">Send me occasional news about new developments, supplies offers and tips. You can unsubscribe at any time.</label>
      </div>
      <SubmitButton pendingText="Saving…">Save details</SubmitButton>
    </form>
  )
}

export function EmailForm({ current }: { current: string }) {
  const [state, action] = useFormState(changeEmailAction, null)
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  return (
    <form action={action} className="space-y-4" noValidate>
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      {state?.ok && <FormAlert tone="success">{state.message}</FormAlert>}
      <p className="text-small text-muted">Current email: <strong className="break-all text-ink">{current}</strong></p>
      <Field label="New email" htmlFor="em-new" error={errors.email}>
        <Input id="em-new" name="email" type="email" autoComplete="email" invalid={Boolean(errors.email)} aria-describedby={describedBy('em-new', errors.email)} />
      </Field>
      <SubmitButton variant="secondary" pendingText="Sending…">
        Change email
      </SubmitButton>
    </form>
  )
}

export function DeleteAccountForm() {
  const [state, action] = useFormState(requestDeletionAction, null)
  if (state?.ok) return <FormAlert tone="success">{state.message}</FormAlert>
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  return (
    <form action={action} className="space-y-4" noValidate>
      {state && !state.ok && !errors.confirm && <FormAlert>{state.error}</FormAlert>}
      <p className="text-small text-muted">
        We will remove your account, listings and personal details. Enquiries you sent stay with the businesses you contacted. This cannot be undone.
      </p>
      <Field label="Type DELETE to confirm" htmlFor="del-confirm" error={errors.confirm}>
        <Input id="del-confirm" name="confirm" autoComplete="off" invalid={Boolean(errors.confirm)} />
      </Field>
      <SubmitButton variant="danger" pendingText="Sending…">
        Request account deletion
      </SubmitButton>
    </form>
  )
}
