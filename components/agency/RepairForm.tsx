'use client'

import { useActionState } from 'react'
import { reportRepairAction } from '@/app/actions/repair-actions'
import { Checkbox, Field, Input, Textarea } from '@/components/ui/Field'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import { NoResetForm } from '@/components/forms/NoResetForm'

/** "Report a repair" for a managed tenancy or a managed property (goes to Repair & Maintain, spec 26.6, 26.7). */
export function RepairForm({ source, id }: { source: 'tenancy' | 'owner'; id: string }) {
  const [state, action] = useActionState(reportRepairAction.bind(null, source, id), null)
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {}
  if (state?.ok) return <FormAlert tone="success">Thank you. Your repair request {state.data.reference} has been sent to HagerLand. We will contact you to arrange it.</FormAlert>
  const p = `rep-${id.slice(0, 8)}`
  return (
    <NoResetForm action={action} className="space-y-3" noValidate>
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      <Field label="What is the problem?" htmlFor={`${p}-t`} error={errors.title} required>
        <Input id={`${p}-t`} name="title" maxLength={160} invalid={Boolean(errors.title)} />
      </Field>
      <Field label="Details" htmlFor={`${p}-d`} error={errors.details} required>
        <Textarea id={`${p}-d`} name="details" rows={3} maxLength={2000} invalid={Boolean(errors.details)} />
      </Field>
      <Checkbox id={`${p}-e`} name="emergency" label="This is an emergency" description="For example a burst pipe, no power or an unsafe roof. If anyone is in danger, call the emergency services first." />
      <SubmitButton pendingText="Sending…">Report a repair</SubmitButton>
    </NoResetForm>
  )
}
