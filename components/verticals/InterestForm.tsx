'use client'

import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { submitInterestAction } from '@/app/actions/interest-actions'
import { Checkbox, Field, Input, Select, Textarea, describedBy } from '@/components/ui/Field'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { FormAlert, Honeypot, SubmitButton } from '@/components/forms/FormParts'
import { Turnstile } from '@/components/forms/Turnstile'
import { readUtm } from '@/components/enquiry/UtmCapture'
import { COUNTRIES, OTHER_COUNTRY } from '@/lib/countries'
import type { Option } from '@/lib/content/verticals'
import type { VerticalKey } from '@/lib/verticals'
import { track } from '@/lib/analytics'
import { NoResetForm } from '@/components/forms/NoResetForm'

/** "Register your interest" for a vertical (spec 24.2). */
export function InterestForm({
  verticalKey,
  verticalName,
  categories,
  categoryLabel = 'What are you interested in?',
  audiences,
  defaultCategory,
  defaultAudience,
  idPrefix = 'int',
  submitLabel = 'Register my interest',
}: {
  verticalKey: VerticalKey
  verticalName: string
  categories?: Option[]
  categoryLabel?: string
  audiences?: Option[]
  defaultCategory?: string
  defaultAudience?: string
  idPrefix?: string
  submitLabel?: string
}) {
  const [state, action] = useActionState(submitInterestAction, null)
  const [utm, setUtm] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  const id = (n: string) => `${idPrefix}-${n}`

  useEffect(() => {
    setUtm(readUtm())
    setSourceUrl(window.location.href.slice(0, 500))
  }, [])
  useEffect(() => {
    if (state?.ok) track('register_interest_submitted', { target_type: verticalKey, intent: 'register_interest' })
  }, [state, verticalKey])

  if (state?.ok) {
    return (
      <div className="rounded-lg bg-green-tint p-5 text-center" role="status">
        <CircleCheck className="mx-auto size-10 text-green" aria-hidden />
        <h3 className="hl-h3 mt-3">Thanks, your interest is registered</h3>
        <p className="mt-2 text-muted">
          We&apos;ll email you about {verticalName}. Your reference is <strong className="text-ink">{state.data.reference}</strong>.
        </p>
      </div>
    )
  }

  return (
    <NoResetForm action={action} className="space-y-4" noValidate>
      <input type="hidden" name="vertical_key" value={verticalKey} />
      <input type="hidden" name="utm" value={utm} />
      <input type="hidden" name="source_url" value={sourceUrl} />
      <Honeypot />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}

      {audiences && audiences.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-small font-semibold text-ink">I am</legend>
          <div className="flex flex-wrap gap-2">
            {audiences.map((a, i) => (
              <label key={a.value} className="cursor-pointer">
                <input type="radio" name="audience" value={a.value} defaultChecked={defaultAudience ? a.value === defaultAudience : i === 0} className="peer sr-only" />
                <span className="inline-flex min-h-11 items-center rounded-full border border-border-strong px-4 text-small font-medium peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-green">
                  {a.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {categories && categories.length > 0 && (
        <Field label={categoryLabel} htmlFor={id('category')} error={errors.category} optional>
          <Select id={id('category')} name="category" defaultValue={defaultCategory ?? ''} invalid={Boolean(errors.category)}>
            <option value="">Any or not sure</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Your name" htmlFor={id('name')} error={errors.name} required>
        <Input id={id('name')} name="name" autoComplete="name" invalid={Boolean(errors.name)} aria-describedby={describedBy(id('name'), errors.name)} />
      </Field>
      <Field label="Email" htmlFor={id('email')} error={errors.email} required>
        <Input id={id('email')} name="email" type="email" autoComplete="email" invalid={Boolean(errors.email)} aria-describedby={describedBy(id('email'), errors.email)} />
      </Field>
      <Field label="Phone" htmlFor={id('phone')} error={errors.phone} optional>
        <PhoneInput id={id('phone')} name="phone" invalid={Boolean(errors.phone)} describedById={describedBy(id('phone'), errors.phone)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Country you live in" htmlFor={id('country')} error={errors.country_code} required>
          <Select id={id('country')} name="country_code" defaultValue="ET" invalid={Boolean(errors.country_code)}>
            {[...COUNTRIES, OTHER_COUNTRY].map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="City" htmlFor={id('city')} error={errors.city} optional>
          <Input id={id('city')} name="city" autoComplete="address-level2" invalid={Boolean(errors.city)} />
        </Field>
      </div>
      <Field label="Anything you'd like us to know" htmlFor={id('message')} error={errors.message} optional>
        <Textarea id={id('message')} name="message" rows={3} maxLength={2000} invalid={Boolean(errors.message)} />
      </Field>
      <Checkbox id={id('consent')} name="marketing_consent" label="Also send me occasional HagerLand news" description="Optional. You can unsubscribe at any time." />
      <Turnstile action="interest" />
      <SubmitButton fullWidth size="lg" pendingText="Sending…">
        {submitLabel}
      </SubmitButton>
      <p className="text-caption text-muted">
        We&apos;ll use your details to tell you about {verticalName}. See our{' '}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </NoResetForm>
  )
}
