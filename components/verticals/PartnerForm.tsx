'use client'

import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { submitPartnerAction } from '@/app/actions/interest-actions'
import { Field, Input, Select, Textarea, describedBy } from '@/components/ui/Field'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { FormAlert, Honeypot, SubmitButton, TransferConsent } from '@/components/forms/FormParts'
import { Turnstile } from '@/components/forms/Turnstile'
import { COUNTRIES, OTHER_COUNTRY } from '@/lib/countries'
import { PARTNER_TYPE_LABELS, type PartnerType } from '@/lib/content/verticals'
import type { VerticalKey } from '@/lib/verticals'
import { track } from '@/lib/analytics'
import { NoResetForm } from '@/components/forms/NoResetForm'

/** "Become a partner" for banks, lenders, insurers and brokers (spec 24.2, 24.8). */
export function PartnerForm({ verticalKey, types, idPrefix = 'par' }: { verticalKey: VerticalKey; types: PartnerType[]; idPrefix?: string }) {
  const [state, action] = useActionState(submitPartnerAction, null)
  const [sourceUrl, setSourceUrl] = useState('')
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  const id = (n: string) => `${idPrefix}-${n}`
  useEffect(() => setSourceUrl(window.location.href.slice(0, 500)), [])
  useEffect(() => {
    if (state?.ok) track('partner_application_submitted', { vertical: verticalKey })
  }, [state, verticalKey])

  if (state?.ok) {
    return (
      <div className="rounded-lg bg-green-tint p-5 text-center" role="status">
        <CircleCheck className="mx-auto size-10 text-green" aria-hidden />
        <h3 className="hl-h3 mt-3">Thanks, we have your application</h3>
        <p className="mt-2 text-muted">
          We&apos;ll be in touch to discuss next steps. Your reference is <strong className="text-ink">{state.data.reference}</strong>.
        </p>
      </div>
    )
  }

  return (
    <NoResetForm action={action} className="space-y-4" noValidate>
      <input type="hidden" name="vertical_key" value={verticalKey} />
      <input type="hidden" name="source_url" value={sourceUrl} />
      <Honeypot />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Organisation" htmlFor={id('org')} error={errors.organisation_name} required>
          <Input id={id('org')} name="organisation_name" autoComplete="organization" invalid={Boolean(errors.organisation_name)} aria-describedby={describedBy(id('org'), errors.organisation_name)} />
        </Field>
        <Field label="Type of organisation" htmlFor={id('type')} error={errors.partner_type} required>
          <Select id={id('type')} name="partner_type" defaultValue={types[0]} invalid={Boolean(errors.partner_type)}>
            {types.map((t) => (
              <option key={t} value={t}>
                {PARTNER_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Your name" htmlFor={id('name')} error={errors.contact_name} required>
          <Input id={id('name')} name="contact_name" autoComplete="name" invalid={Boolean(errors.contact_name)} aria-describedby={describedBy(id('name'), errors.contact_name)} />
        </Field>
        <Field label="Work email" htmlFor={id('email')} error={errors.email} required>
          <Input id={id('email')} name="email" type="email" autoComplete="email" invalid={Boolean(errors.email)} aria-describedby={describedBy(id('email'), errors.email)} />
        </Field>
        <Field label="Phone" htmlFor={id('phone')} error={errors.phone} optional>
          <PhoneInput id={id('phone')} name="phone" invalid={Boolean(errors.phone)} describedById={describedBy(id('phone'), errors.phone)} />
        </Field>
        <Field label="Country" htmlFor={id('country')} error={errors.country_code} required>
          <Select id={id('country')} name="country_code" defaultValue="ET">
            {[...COUNTRIES, OTHER_COUNTRY].map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Website" htmlFor={id('web')} error={errors.website} optional className="sm:col-span-2">
          <Input id={id('web')} name="website" type="url" placeholder="https://" invalid={Boolean(errors.website)} aria-describedby={describedBy(id('web'), errors.website)} />
        </Field>
      </div>
      <Field label="Licence or registration" htmlFor={id('licence')} error={errors.licence_details} optional hint="For example your licence number and the authority that issued it.">
        <Input id={id('licence')} name="licence_details" invalid={Boolean(errors.licence_details)} aria-describedby={describedBy(id('licence'), errors.licence_details, true)} />
      </Field>
      <Field label="What would you like to offer?" htmlFor={id('message')} error={errors.message} optional>
        <Textarea id={id('message')} name="message" rows={3} maxLength={2000} invalid={Boolean(errors.message)} />
      </Field>
      <TransferConsent error={errors.transfer_consent} />
      <Turnstile action="partner" />
      <SubmitButton fullWidth size="lg" variant="secondary" pendingText="Sending…">
        Apply to partner
      </SubmitButton>
      <p className="text-caption text-muted">
        We use these details only to assess and discuss a partnership. See our{' '}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </NoResetForm>
  )
}
