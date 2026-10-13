'use client'

import { useFormState } from 'react-dom'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { savePortfolioAction, submitPortfolioAction } from '@/app/(account)/account/company/portfolio/actions'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Combobox, type ComboOption } from '@/components/ui/Combobox'
import { Button } from '@/components/ui/Button'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import { useToast } from '@/components/ui/Toast'

export function PortfolioForm({ defaults, status }: { defaults: { id?: string; title?: string; description?: string | null; location?: ComboOption | null; year?: number | null; project_value_band?: string | null }; status?: string }) {
  const [state, action] = useFormState(savePortfolioAction, null)
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  return (
    <form action={action} className="space-y-5" noValidate>
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      {state?.ok && state.message && <FormAlert tone="success">{state.message}</FormAlert>}
      <Field label="Project name" htmlFor="pp-title" error={errors.title} required>
        <Input id="pp-title" name="title" defaultValue={defaults.title} maxLength={160} invalid={Boolean(errors.title)} />
      </Field>
      <Field label="What did you do?" htmlFor="pp-desc" optional error={errors.description}>
        <Textarea id="pp-desc" name="description" defaultValue={defaults.description ?? ''} rows={5} maxLength={4000} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Location" htmlFor="pp-loc" optional>
          <Combobox id="pp-loc" name="location_id" endpoint="/api/locations?scope=all" defaultValue={defaults.location} />
        </Field>
        <Field label="Year completed" htmlFor="pp-year" optional error={errors.year}>
          <Input id="pp-year" name="year" inputMode="numeric" defaultValue={defaults.year ?? ''} />
        </Field>
        <Field label="Project value" htmlFor="pp-val" optional>
          <Select id="pp-val" name="project_value_band" defaultValue={defaults.project_value_band ?? ''}>
            <option value="">Prefer not to say</option>
            {['Under ETB 1M', 'ETB 1M – 5M', 'ETB 5M – 20M', 'ETB 20M – 100M', 'Over ETB 100M'].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <SubmitButton pendingText="Saving…">{defaults.id ? 'Save' : 'Create project'}</SubmitButton>
        {defaults.id && (status === 'draft' || status === 'rejected') && (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await submitPortfolioAction(defaults.id as string)
                toast(res.ok ? res.message ?? 'Sent for review.' : res.error, res.ok ? 'success' : 'error')
                router.refresh()
              })
            }
          >
            Submit for review
          </Button>
        )}
      </div>
    </form>
  )
}
