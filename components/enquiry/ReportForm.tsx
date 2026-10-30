'use client'

import { useActionState } from 'react'
import { submitReportAction } from '@/app/actions/report-actions'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { FormAlert, Honeypot, SubmitButton, TransferConsent } from '@/components/forms/FormParts'
import { Turnstile } from '@/components/forms/Turnstile'
import { NoResetForm } from '@/components/forms/NoResetForm'

const REASONS = [
  { value: 'fraud', label: 'Looks like a scam or fraud' },
  { value: 'wrong_info', label: 'Wrong or misleading information' },
  { value: 'already_sold', label: 'Already sold or let' },
  { value: 'duplicate', label: 'Duplicate listing' },
  { value: 'offensive', label: 'Offensive content' },
  { value: 'other', label: 'Something else' },
]

export function ReportForm({ target }: { target: { type: 'property' | 'organisation' | 'development' | 'product'; id: string } }) {
  const [state, action] = useActionState(submitReportAction, null)
  if (state?.ok) return <FormAlert tone="success">{state.message ?? 'Thank you. Our team will look into it.'}</FormAlert>
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  return (
    <NoResetForm action={action} className="space-y-4" noValidate>
      <input type="hidden" name="entity_type" value={target.type} />
      <input type="hidden" name="entity_id" value={target.id} />
      <Honeypot />
      {state && !state.ok && !errors.reason && <FormAlert>{state.error}</FormAlert>}
      <fieldset>
        <legend className="mb-2 text-small font-semibold">What is the problem?</legend>
        {errors.reason && <p className="mb-2 text-small text-error">{errors.reason}</p>}
        <ul className="space-y-1">
          {REASONS.map((r) => (
            <li key={r.value} className="flex min-h-10 items-center gap-2.5">
              <input id={`rep-${r.value}`} type="radio" name="reason" value={r.value} className="size-5 accent-green" />
              <label htmlFor={`rep-${r.value}`}>{r.label}</label>
            </li>
          ))}
        </ul>
      </fieldset>
      <Field label="Details" htmlFor="rep-details" optional>
        <Textarea id="rep-details" name="details" rows={3} maxLength={2000} />
      </Field>
      <Field label="Your phone or email" htmlFor="rep-contact" optional hint="Only if you're happy for us to follow up.">
        <Input id="rep-contact" name="reporter_contact" maxLength={254} />
      </Field>
      <TransferConsent error={errors.transfer_consent} />
      <Turnstile action="report" />
      <SubmitButton fullWidth pendingText="Sending…">
        Send report
      </SubmitButton>
    </NoResetForm>
  )
}
