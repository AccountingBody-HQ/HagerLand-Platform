'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useFormState } from 'react-dom'
import { addCountryAction } from '@/app/roodber8/actions/taxonomy'
import { Field, Input } from '@/components/ui/Field'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'

/** Adds a diaspora country (spec 24.4). */
export function AddCountryForm() {
  const [state, action] = useFormState(addCountryAction, null)
  const router = useRouter()
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  useEffect(() => {
    if (state?.ok) router.refresh()
  }, [state, router])
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end" noValidate>
      {state && !state.ok && <FormAlert className="sm:col-span-3">{state.error}</FormAlert>}
      {state?.ok && <FormAlert tone="success" className="sm:col-span-3">{state.message}</FormAlert>}
      <Field label="Country name (English)" htmlFor="country-name" error={errors.name} required>
        <Input id="country-name" name="name" invalid={Boolean(errors.name)} />
      </Field>
      <Field label="Country code" htmlFor="country-code" error={errors.code} required hint="Two letters, e.g. FR">
        <Input id="country-code" name="code" maxLength={2} className="uppercase" invalid={Boolean(errors.code)} />
      </Field>
      <SubmitButton>Add country</SubmitButton>
    </form>
  )
}
