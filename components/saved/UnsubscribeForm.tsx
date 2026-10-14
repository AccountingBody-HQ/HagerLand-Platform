'use client'

import { useFormState } from 'react-dom'
import { unsubscribeAlertAction } from '@/app/actions/saved-search-actions'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'

export function UnsubscribeForm({ token }: { token: string }) {
  const [state, action] = useFormState(unsubscribeAlertAction, null)
  if (state?.ok) return <FormAlert tone="success">{state.data.message}</FormAlert>
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      <SubmitButton pendingText="Stopping…">Stop these emails</SubmitButton>
    </form>
  )
}
