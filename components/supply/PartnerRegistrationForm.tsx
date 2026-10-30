'use client'

import { useActionState } from 'react'
import { CircleCheck } from 'lucide-react'
import { submitPartnerRegistrationAction } from '@/app/actions/partner-registration-actions'
import { Checkbox, Field, Input, Textarea, describedBy } from '@/components/ui/Field'
import { Combobox } from '@/components/ui/Combobox'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { FormAlert, Honeypot, SubmitButton, TransferConsent } from '@/components/forms/FormParts'
import { Turnstile } from '@/components/forms/Turnstile'
import { NoResetForm } from '@/components/forms/NoResetForm'
import { CONSENT_TEXT, FORM_ROLES, type PartnerRole } from '@/lib/supply/partner-rules'

/** S6-1 "Register your business with HagerLand Supply" (AB's approved labels). */
export function PartnerRegistrationForm({ categories, role }: { categories: { id: string; name: string }[]; role: PartnerRole | null }) {
  const [state, action] = useActionState(submitPartnerRegistrationAction, null)
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {}

  if (state?.ok) {
    return (
      <div className="rounded-lg bg-green-tint p-5 text-center" role="status">
        <CircleCheck className="mx-auto size-10 text-green" aria-hidden />
        <p className="mt-3">
          Thank you. Your registration <strong className="text-ink">{state.data.reference}</strong> is with our team. We will contact you to talk about terms.
        </p>
      </div>
    )
  }

  return (
    <NoResetForm action={action} className="space-y-5" noValidate>
      <Honeypot />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      <Field label="Business name" htmlFor="pr-business" error={errors.business_name} required>
        <Input id="pr-business" name="business_name" autoComplete="organization" invalid={Boolean(errors.business_name)} aria-describedby={describedBy('pr-business', errors.business_name)} />
      </Field>
      <Field label="Other names" htmlFor="pr-other" error={errors.other_names} optional>
        <Input id="pr-other" name="other_names" invalid={Boolean(errors.other_names)} />
      </Field>
      <fieldset>
        <legend className="mb-1.5 font-semibold text-ink">
          What do you do? (choose all that apply)<span className="text-error" aria-hidden> *</span>
        </legend>
        {FORM_ROLES.map((r) => (
          <Checkbox key={r.value} id={`pr-role-${r.value}`} name="roles" value={r.value} label={r.label} defaultChecked={r.value === role} />
        ))}
        {errors.roles && <p className="mt-1 text-small text-error">{errors.roles}</p>}
      </fieldset>
      {categories.length > 0 && (
        <fieldset>
          <legend className="mb-1.5 font-semibold text-ink">Product categories</legend>
          <div className="grid gap-x-4 sm:grid-cols-2">
            {categories.map((c) => (
              <Checkbox key={c.id} id={`pr-cat-${c.id}`} name="category_ids" value={c.id} label={c.name} />
            ))}
          </div>
        </fieldset>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City" htmlFor="pr-city" error={errors.city_id} required>
          <Combobox id="pr-city" name="city_id" endpoint="/api/locations" invalid={Boolean(errors.city_id)} describedById={describedBy('pr-city', errors.city_id)} />
        </Field>
        <Field label="Sub-city" htmlFor="pr-subcity" error={errors.subcity_id} optional>
          <Combobox id="pr-subcity" name="subcity_id" endpoint="/api/locations" invalid={Boolean(errors.subcity_id)} />
        </Field>
        <Field label="Woreda" htmlFor="pr-woreda" error={errors.woreda_id} optional>
          <Combobox id="pr-woreda" name="woreda_id" endpoint="/api/locations" invalid={Boolean(errors.woreda_id)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact name" htmlFor="pr-contact" error={errors.contact_name} required>
          <Input id="pr-contact" name="contact_name" autoComplete="name" invalid={Boolean(errors.contact_name)} aria-describedby={describedBy('pr-contact', errors.contact_name)} />
        </Field>
        <Field label="Phone" htmlFor="pr-phone" error={errors.phone} required>
          <PhoneInput id="pr-phone" name="phone" invalid={Boolean(errors.phone)} describedById={describedBy('pr-phone', errors.phone)} />
        </Field>
        <Field label="Email" htmlFor="pr-email" error={errors.email} optional>
          <Input id="pr-email" name="email" type="email" autoComplete="email" invalid={Boolean(errors.email)} aria-describedby={describedBy('pr-email', errors.email)} />
        </Field>
        <Field label="TIN" htmlFor="pr-tin" error={errors.tin} optional>
          <Input id="pr-tin" name="tin" inputMode="numeric" invalid={Boolean(errors.tin)} />
        </Field>
      </div>
      <Field label="Anything else we should know?" htmlFor="pr-message" error={errors.message} optional>
        <Textarea id="pr-message" name="message" rows={4} maxLength={2000} invalid={Boolean(errors.message)} />
      </Field>
      <div>
        <Checkbox id="pr-consent" name="consent" label={CONSENT_TEXT} aria-invalid={Boolean(errors.consent)} />
        {errors.consent && <p className="mt-1 text-small text-error">{errors.consent}</p>}
      </div>
      <TransferConsent error={errors.transfer_consent} />
      <Turnstile action="partner_registration" />
      <SubmitButton fullWidth size="lg" pendingText="Sending…">
        Send registration
      </SubmitButton>
    </NoResetForm>
  )
}
