'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { submitOrderRequestAction } from '@/app/actions/order-request-actions'
import { Field, Input, Textarea, describedBy } from '@/components/ui/Field'
import { Combobox } from '@/components/ui/Combobox'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { FormAlert, Honeypot, SubmitButton } from '@/components/forms/FormParts'
import { Turnstile } from '@/components/forms/Turnstile'
import { NoResetForm } from '@/components/forms/NoResetForm'
import { CUSTOMER_TEXT } from '@/lib/supply/order-requests'

/** S6-2 order request form (AB's approved labels). On success the customer lands on their private order request page. */
export function OrderRequestForm({ productId, unit, minOrder }: { productId: string; unit: string; minOrder: number }) {
  const [state, action] = useActionState(submitOrderRequestAction, null)
  const router = useRouter()
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {}
  useEffect(() => {
    if (state?.ok) router.push(`${state.data.path}?sent=1`)
  }, [state, router])
  return (
    <NoResetForm action={action} className="space-y-5" noValidate>
      <input type="hidden" name="product_id" value={productId} />
      <Honeypot />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      <Field label="Quantity" htmlFor="or-qty" error={errors.quantity} required>
        <div className="flex items-center gap-3">
          <Input id="or-qty" name="quantity" inputMode="decimal" defaultValue={String(minOrder)} className="max-w-40" invalid={Boolean(errors.quantity)} aria-describedby={describedBy('or-qty', errors.quantity)} />
          <span className="text-muted">{unit}</span>
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="or-name" error={errors.name} required>
          <Input id="or-name" name="name" autoComplete="name" invalid={Boolean(errors.name)} aria-describedby={describedBy('or-name', errors.name)} />
        </Field>
        <Field label="Phone" htmlFor="or-phone" error={errors.phone} required>
          <PhoneInput id="or-phone" name="phone" invalid={Boolean(errors.phone)} describedById={describedBy('or-phone', errors.phone)} />
        </Field>
      </div>
      <Field label="Email" htmlFor="or-email" error={errors.email} optional hint={CUSTOMER_TEXT.emailHint}>
        <Input id="or-email" name="email" type="email" autoComplete="email" invalid={Boolean(errors.email)} aria-describedby={describedBy('or-email', errors.email, true)} />
      </Field>
      <Field label="Delivery area" htmlFor="or-area" error={errors.delivery_location_id} required>
        <Combobox id="or-area" name="delivery_location_id" endpoint="/api/locations" invalid={Boolean(errors.delivery_location_id)} describedById={describedBy('or-area', errors.delivery_location_id)} />
      </Field>
      <Field label="Delivery address" htmlFor="or-address" error={errors.delivery_address} required>
        <Input id="or-address" name="delivery_address" autoComplete="street-address" invalid={Boolean(errors.delivery_address)} aria-describedby={describedBy('or-address', errors.delivery_address)} />
      </Field>
      <Field label="Needed by" htmlFor="or-needed" error={errors.needed_by} optional>
        <Input id="or-needed" name="needed_by" type="date" className="max-w-56" invalid={Boolean(errors.needed_by)} />
      </Field>
      <Field label="Anything else we should know?" htmlFor="or-note" error={errors.note} optional>
        <Textarea id="or-note" name="note" rows={3} maxLength={2000} invalid={Boolean(errors.note)} />
      </Field>
      <Turnstile action="order_request" />
      <SubmitButton fullWidth size="lg" pendingText="Sending…">
        {CUSTOMER_TEXT.submit}
      </SubmitButton>
    </NoResetForm>
  )
}
