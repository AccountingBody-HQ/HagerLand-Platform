'use client'

import { useActionState } from 'react'
import { unsubscribeAlertAction } from '@/app/actions/saved-search-actions'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import { NoResetForm } from '@/components/forms/NoResetForm'

export function UnsubscribeForm({ token }: { token: string }) {
  const [state, action] = useActionState(unsubscribeAlertAction, null)
  if (state?.ok) return <FormAlert tone="success">{state.data.message}</FormAlert>
  return (
    <NoResetForm action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      <SubmitButton pendingText="Stopping…">Stop these emails</SubmitButton>
    </NoResetForm>
  )
}
