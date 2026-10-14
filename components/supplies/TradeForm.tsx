'use client'

import { useFormState } from 'react-dom'
import { applyTradeAction } from '@/app/actions/trade-actions'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import type { ActionResult } from '@/lib/action-result'

/** Trade account application (spec 25.2e). */
export function TradeForm({ defaults }: { defaults: { business_name: string; phone: string } }) {
  const [state, action] = useFormState<ActionResult<{ reference: string }> | null, FormData>(applyTradeAction, null)
  if (state?.ok) return <FormAlert tone="success">{`${state.message ?? 'Thanks.'} Reference ${state.data.reference}.`}</FormAlert>
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  return (
    <form action={action} className="space-y-5" noValidate>
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      <Field label="Business name" htmlFor="tr-name" required error={errors.business_name}>
        <Input id="tr-name" name="business_name" defaultValue={defaults.business_name} maxLength={160} required invalid={Boolean(errors.business_name)} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Type of business" htmlFor="tr-type" required hint="e.g. Contractor, developer, builder's merchant" error={errors.trade_type}>
          <Input id="tr-type" name="trade_type" maxLength={80} required invalid={Boolean(errors.trade_type)} />
        </Field>
        <Field label="Phone" htmlFor="tr-phone" required error={errors.phone}>
          <Input id="tr-phone" name="phone" type="tel" autoComplete="tel" defaultValue={defaults.phone} required invalid={Boolean(errors.phone)} />
        </Field>
        <Field label="TIN" htmlFor="tr-tin" optional error={errors.tin}>
          <Input id="tr-tin" name="tin" maxLength={40} invalid={Boolean(errors.tin)} />
        </Field>
        <Field label="Expected monthly spend" htmlFor="tr-spend" optional error={errors.expected_monthly_spend}>
          <Input id="tr-spend" name="expected_monthly_spend" maxLength={80} placeholder="e.g. ETB 500,000" invalid={Boolean(errors.expected_monthly_spend)} />
        </Field>
      </div>
      <Field label="Anything else we should know?" htmlFor="tr-notes" optional error={errors.notes}>
        <Textarea id="tr-notes" name="notes" rows={3} maxLength={2000} invalid={Boolean(errors.notes)} />
      </Field>
      <SubmitButton pendingText="Sending…">Apply for a trade account</SubmitButton>
    </form>
  )
}
