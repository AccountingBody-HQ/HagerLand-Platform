'use client'

import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { requestPropertyCareAction } from '@/app/actions/property-care-actions'
import { Checkbox, Field, Input, Select, Textarea, describedBy } from '@/components/ui/Field'
import { Combobox } from '@/components/ui/Combobox'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { FormAlert, Honeypot, SubmitButton, TransferConsent } from '@/components/forms/FormParts'
import { Turnstile } from '@/components/forms/Turnstile'
import { readUtm } from '@/components/enquiry/UtmCapture'
import { COUNTRIES, OTHER_COUNTRY, countryByCode } from '@/lib/countries'
import { CARE_OCCUPANCY, CARE_PROPERTY_TYPES, CARE_SERVICES } from '@/lib/property-care'
import { track } from '@/lib/analytics'
import { NoResetForm } from '@/components/forms/NoResetForm'

/** "Request a consultation" for HagerLand Property Care (spec 24.6). */
export function PropertyCareForm() {
  const [state, action] = useActionState(requestPropertyCareAction, null)
  const [country, setCountry] = useState('GB')
  const [tz, setTz] = useState('')
  const [utm, setUtm] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}

  useEffect(() => {
    setUtm(readUtm())
    setSourceUrl(window.location.href.slice(0, 500))
    try {
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone)
    } catch {
      setTz('')
    }
  }, [])
  useEffect(() => {
    if (state?.ok) track('property_care_requested')
  }, [state])

  if (state?.ok)
    return (
      <div className="rounded-lg bg-green-tint p-6 text-center" role="status">
        <CircleCheck className="mx-auto size-10 text-green" aria-hidden />
        <h3 className="hl-h3 mt-3">Thank you, we will be in touch</h3>
        <p className="mt-2 text-muted">
          We will contact you to arrange a consultation. Your reference is <strong className="text-ink">{state.data.reference}</strong>.
        </p>
      </div>
    )

  return (
    <NoResetForm action={action} className="space-y-6" noValidate>
      <input type="hidden" name="utm" value={utm} />
      <input type="hidden" name="source_url" value={sourceUrl} />
      <Honeypot />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}

      <fieldset className="space-y-4">
        <legend className="hl-h3 mb-2">About you</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" htmlFor="pc-name" error={errors.name} required>
            <Input id="pc-name" name="name" autoComplete="name" invalid={Boolean(errors.name)} />
          </Field>
          <Field label="Email" htmlFor="pc-email" error={errors.email} required>
            <Input id="pc-email" name="email" type="email" autoComplete="email" invalid={Boolean(errors.email)} />
          </Field>
          <Field label="Phone or WhatsApp" htmlFor="pc-phone" error={errors.phone} required>
            <PhoneInput id="pc-phone" name="phone" invalid={Boolean(errors.phone)} describedById={describedBy('pc-phone', errors.phone)} />
          </Field>
          <Field label="Country you live in" htmlFor="pc-country" error={errors.country_code} required>
            <Select id="pc-country" name="country_code" value={country} onChange={(e) => setCountry(e.target.value)}>
              {[...COUNTRIES.filter((c) => c.code !== 'ET'), OTHER_COUNTRY, COUNTRIES[0]].map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="City" htmlFor="pc-city" optional>
            <Input id="pc-city" name="city" autoComplete="address-level2" />
          </Field>
          <Field label="Your time zone" htmlFor="pc-tz" optional hint="So we call at a sensible time for you.">
            <Input id="pc-tz" name="time_zone" value={tz || countryByCode(country)?.timeZone || ''} onChange={(e) => setTz(e.target.value)} />
          </Field>
          <Field label="Best time to contact you" htmlFor="pc-time" optional>
            <Input id="pc-time" name="contact_time" placeholder="e.g. weekday evenings" />
          </Field>
          <Field label="Preferred way to contact you" htmlFor="pc-pref">
            <Select id="pc-pref" name="preferred_contact" defaultValue="">
              <option value="">No preference</option>
              <option value="phone">Phone call</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
              <option value="email">Email</option>
            </Select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="hl-h3 mb-2">About the property</legend>
        <Field label="Where in Ethiopia is it?" htmlFor="pc-loc" error={errors.property_location_id} required hint="City, sub-city or area.">
          <Combobox id="pc-loc" name="property_location_id" endpoint="/api/locations" invalid={Boolean(errors.property_location_id)} describedById={describedBy('pc-loc', errors.property_location_id, 'hint')} />
        </Field>
        <Field label="Can't find it? Type the place" htmlFor="pc-loc-text" optional>
          <Input id="pc-loc-text" name="property_location_text" maxLength={200} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type of property" htmlFor="pc-type" error={errors.property_type} required>
            <Select id="pc-type" name="property_type" defaultValue="">
              <option value="" disabled>
                Choose
              </option>
              {CARE_PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Who uses it now?" htmlFor="pc-occ" error={errors.occupancy} required>
            <Select id="pc-occ" name="occupancy" defaultValue="">
              <option value="" disabled>
                Choose
              </option>
              {CARE_OCCUPANCY.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend className="hl-h3 mb-2">What would you like help with?</legend>
        {errors.services && (
          <p role="alert" className="mb-2 text-small text-error">
            {errors.services}
          </p>
        )}
        <div className="grid gap-1 sm:grid-cols-2">
          {CARE_SERVICES.map((s) => (
            <Checkbox key={s.value} id={`pc-svc-${s.value}`} name="services" value={s.value} label={s.label} />
          ))}
        </div>
      </fieldset>

      <Field label="Anything else we should know" htmlFor="pc-msg" optional>
        <Textarea id="pc-msg" name="message" rows={4} maxLength={2000} />
      </Field>
      <Checkbox id="pc-consent" name="marketing_consent" label="Also send me occasional HagerLand news" description="Optional. You can unsubscribe at any time." />
      <TransferConsent error={errors.transfer_consent} />
      <Turnstile action="property_care" />
      <SubmitButton fullWidth size="lg" pendingText="Sending…">
        Request a consultation
      </SubmitButton>
      <p className="text-caption text-muted">
        No obligation. We use your details to arrange the consultation. See our{' '}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </NoResetForm>
  )
}
