'use client'

import { useActionState } from 'react'
import { sendOwnerMessageAction } from '@/app/actions/owner-actions'
import { Field, Textarea } from '@/components/ui/Field'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import { NoResetForm } from '@/components/forms/NoResetForm'

export function OwnerMessageForm({ propertyId }: { propertyId: string }) {
  const [state, action] = useActionState(sendOwnerMessageAction.bind(null, propertyId), null)
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {}
  return (
    <NoResetForm action={action} className="space-y-3" noValidate key={state?.ok ? 'sent' : 'draft'}>
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      {state?.ok && <FormAlert tone="success">{state.data.message}</FormAlert>}
      <Field label="Message to HagerLand" htmlFor="om-body" error={errors.body}>
        <Textarea id="om-body" name="body" rows={3} maxLength={4000} invalid={Boolean(errors.body)} />
      </Field>
      <SubmitButton pendingText="Sending…">Send message</SubmitButton>
    </NoResetForm>
  )
}
