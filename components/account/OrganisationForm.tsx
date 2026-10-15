'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import type { ComboOption } from '@/components/ui/Combobox'
import { Combobox } from '@/components/ui/Combobox'
import { Checkbox, Field, Input, Select, Textarea, describedBy } from '@/components/ui/Field'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { Badge } from '@/components/ui/Badge'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import { LocationMultiPicker } from '@/components/forms/LocationMultiPicker'
import { ORG_KIND_LABELS } from '@/lib/validation/organisation'
import type { OrgFormState } from '@/app/(account)/account/company/org-actions'
import { NoResetForm } from '@/components/forms/NoResetForm'

export interface OrgFormCategory {
  id: string
  name: string
  children: { id: string; name: string }[]
}

export interface OrgFormDefaults {
  /** The record's updated_at when the form opened (concurrent-edit check). */
  version?: string | null
  id?: string
  name?: string
  kind?: string
  tagline?: string | null
  description?: string | null
  location?: ComboOption | null
  areas?: ComboOption[]
  serves_diaspora?: boolean
  service_ids?: string[]
  product_category_ids?: string[]
  phone?: string | null
  whatsapp?: string | null
  telegram?: string | null
  email?: string | null
  website?: string | null
  address_line?: string | null
  year_established?: number | null
  team_size?: string | null
  licence_category?: string | null
  licence_grade?: string | null
  qualifications?: string | null
}

export function OrganisationForm({
  action,
  kinds,
  services,
  productCategories,
  defaults = {},
  submitLabel,
  pendingNote,
}: {
  action: (prev: OrgFormState | null, formData: FormData) => Promise<OrgFormState>
  kinds: string[]
  services: OrgFormCategory[]
  productCategories: OrgFormCategory[]
  defaults?: OrgFormDefaults
  submitLabel: string
  pendingNote?: string
}) {
  const [state, formAction] = useActionState(action, null)
  const [kind, setKind] = useState(defaults.kind ?? kinds[0])
  const [confirmNew, setConfirmNew] = useState(false)
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  const duplicates = state && !state.ok && 'duplicates' in state ? state.duplicates : []
  const showServices = ['contractor', 'professional_firm', 'sole_trader', 'developer'].includes(kind)
  const showProducts = ['supplier', 'manufacturer'].includes(kind)
  const showLicence = ['contractor', 'professional_firm', 'sole_trader', 'agency'].includes(kind)

  return (
    <NoResetForm action={formAction} className="space-y-8" noValidate>
      {defaults.id && <input type="hidden" name="existing_id" value={defaults.id} />}
      {defaults.id && defaults.version && <input type="hidden" name="expected_updated_at" value={defaults.version} />}
      <input type="hidden" name="confirm_new" value={confirmNew ? '1' : '0'} />
      {state && !state.ok && duplicates.length === 0 && <FormAlert>{state.error}</FormAlert>}
      {state?.ok && state.message && <FormAlert tone="success">{state.message}</FormAlert>}

      {duplicates.length > 0 && !confirmNew && (
        <div className="rounded-lg border border-gold/40 bg-gold-soft p-5">
          <h2 className="font-display text-h3 font-bold">Is this your business?</h2>
          <p className="mt-1 text-small text-muted">We found businesses with a similar name. If one is yours, claim it instead of creating a duplicate.</p>
          <ul className="mt-4 space-y-2">
            {duplicates.map((d) => (
              <li key={d.id} className="flex flex-col gap-2 rounded-md bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{d.name}</p>
                  {d.location_display && <p className="text-small text-muted">{d.location_display}</p>}
                </div>
                {d.has_members ? (
                  <Badge tone="neutral">Already managed</Badge>
                ) : (
                  <Link href={`/company/${d.slug}/claim`} className="inline-flex h-11 items-center justify-center rounded-md bg-green px-4 text-small font-semibold text-white">
                    Yes, claim it
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={(e) => {
              // Submit before re-rendering: hiding this panel first would remove the button and the browser
              // would drop the submission. The hidden field must also be set now, not via state.
              const form = e.currentTarget.form
              const field = form?.elements.namedItem('confirm_new')
              if (field instanceof HTMLInputElement) field.value = '1'
              form?.requestSubmit()
              setConfirmNew(true)
            }}
            className="mt-4 min-h-11 text-small font-semibold text-green underline">
            No, none of these. Create my business.
          </button>
        </div>
      )}

      <fieldset className="space-y-5">
        <legend className="hl-h3 mb-4">Your business</legend>
        <Field label="Business name" htmlFor="org-name" error={errors.name} required>
          <Input id="org-name" name="name" defaultValue={defaults.name} invalid={Boolean(errors.name)} aria-describedby={describedBy('org-name', errors.name)} />
        </Field>
        {kinds.length > 1 ? (
          <Field label="Type of business" htmlFor="org-kind" error={errors.kind} required>
            <Select id="org-kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)} disabled={Boolean(defaults.id)}>
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {ORG_KIND_LABELS[k]}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <input type="hidden" name="kind" value={kind} />
        )}
        {defaults.id && kinds.length > 1 && <input type="hidden" name="kind" value={kind} />}
        <Field label="Short tagline" htmlFor="org-tagline" optional hint="One line, e.g. “Residential design and build in Addis Ababa”." error={errors.tagline}>
          <Input id="org-tagline" name="tagline" defaultValue={defaults.tagline ?? ''} maxLength={160} />
        </Field>
        <Field label="About your business" htmlFor="org-description" optional error={errors.description} hint="What you do, your experience and the kind of projects you take on.">
          <Textarea id="org-description" name="description" defaultValue={defaults.description ?? ''} rows={6} maxLength={5000} />
        </Field>
      </fieldset>

      {showServices && services.length > 0 && (
        <fieldset>
          <legend className="hl-h3">Services you offer</legend>
          <p className="mt-1 text-small text-muted">Choose all that apply. Customers find you by these.</p>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            {services.map((g) => (
              <div key={g.id}>
                <p className="mb-2 text-small font-semibold text-ink">{g.name}</p>
                <ul className="space-y-1">
                  {g.children.map((s) => (
                    <li key={s.id} className="flex min-h-9 items-center gap-2.5">
                      <input id={`svc-${s.id}`} type="checkbox" name="service_ids" value={s.id} defaultChecked={defaults.service_ids?.includes(s.id)} className="size-5 accent-green" />
                      <label htmlFor={`svc-${s.id}`} className="text-body">
                        {s.name}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </fieldset>
      )}

      {showProducts && productCategories.length > 0 && (
        <fieldset>
          <legend className="hl-h3">What you supply</legend>
          <ul className="mt-4 grid gap-1 sm:grid-cols-2">
            {productCategories.map((c) => (
              <li key={c.id} className="flex min-h-9 items-center gap-2.5">
                <input id={`pc-${c.id}`} type="checkbox" name="product_category_ids" value={c.id} defaultChecked={defaults.product_category_ids?.includes(c.id)} className="size-5 accent-green" />
                <label htmlFor={`pc-${c.id}`}>{c.name}</label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <fieldset className="space-y-5">
        <legend className="hl-h3 mb-4">Where you work</legend>
        <Field label="Where you are based" htmlFor="org-location" error={errors.location_id} required hint="Start typing a city, sub-city or area.">
          <Combobox id="org-location" name="location_id" endpoint="/api/locations?scope=all" defaultValue={defaults.location} invalid={Boolean(errors.location_id)} describedById={describedBy('org-location', errors.location_id, 'hint')} />
        </Field>
        <Field label="Areas you serve" htmlFor="org-areas" optional hint="Add every city or sub-city you cover.">
          <LocationMultiPicker id="org-areas" name="areas_served" defaultValue={defaults.areas} />
        </Field>
        <Checkbox
          id="org-diaspora"
          name="serves_diaspora"
          defaultChecked={Boolean(defaults.serves_diaspora)}
          label="We serve the Ethiopian community abroad"
          description="Tick this if you are based outside Ethiopia and work with Ethiopian customers, or if you help Ethiopians abroad with property at home. It helps people find you in Diaspora Services."
        />
        <Field label="Address" htmlFor="org-address" optional error={errors.address_line}>
          <Input id="org-address" name="address_line" defaultValue={defaults.address_line ?? ''} maxLength={200} />
        </Field>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="hl-h3 mb-4">How customers contact you</legend>
        <p className="-mt-2 text-small text-muted">Your phone and WhatsApp are shown only when a visitor taps to reveal them.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Phone" htmlFor="org-phone" error={errors.phone} required>
            <PhoneInput id="org-phone" name="phone" defaultValue={defaults.phone} invalid={Boolean(errors.phone)} describedById={describedBy('org-phone', errors.phone)} />
          </Field>
          <Field label="WhatsApp" htmlFor="org-whatsapp" optional error={errors.whatsapp}>
            <PhoneInput id="org-whatsapp" name="whatsapp" defaultValue={defaults.whatsapp} invalid={Boolean(errors.whatsapp)} />
          </Field>
          <Field label="Telegram username" htmlFor="org-telegram" optional error={errors.telegram}>
            <Input id="org-telegram" name="telegram" defaultValue={defaults.telegram ?? ''} placeholder="@yourbusiness" />
          </Field>
          <Field label="Email" htmlFor="org-email" optional error={errors.email}>
            <Input id="org-email" name="email" type="email" defaultValue={defaults.email ?? ''} />
          </Field>
          <Field label="Website" htmlFor="org-website" optional error={errors.website} className="sm:col-span-2">
            <Input id="org-website" name="website" type="url" defaultValue={defaults.website ?? ''} placeholder="https://" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="hl-h3 mb-4">More details</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Year established" htmlFor="org-year" optional error={errors.year_established}>
            <Input id="org-year" name="year_established" inputMode="numeric" defaultValue={defaults.year_established ?? ''} />
          </Field>
          <Field label="Team size" htmlFor="org-team" optional>
            <Select id="org-team" name="team_size" defaultValue={defaults.team_size ?? ''}>
              <option value="">Choose</option>
              {['1', '2-5', '6-20', '21-50', '51-200', '200+'].map((t) => (
                <option key={t} value={t}>
                  {t} {t === '1' ? 'person' : 'people'}
                </option>
              ))}
            </Select>
          </Field>
          {showLicence && (
            <>
              <Field label="Licence category" htmlFor="org-lcat" optional hint="e.g. General contractor, Building contractor" error={errors.licence_category}>
                <Input id="org-lcat" name="licence_category" defaultValue={defaults.licence_category ?? ''} />
              </Field>
              <Field label="Licence grade" htmlFor="org-lgrade" optional hint="e.g. GC-3, BC-5" error={errors.licence_grade}>
                <Input id="org-lgrade" name="licence_grade" defaultValue={defaults.licence_grade ?? ''} />
              </Field>
            </>
          )}
          <Field label="Qualifications and memberships" htmlFor="org-qual" optional className="sm:col-span-2" hint="Degrees, professional registrations and memberships, e.g. “BSc Civil Engineering, Addis Ababa University; registered with the Ethiopian Engineers Association”." error={errors.qualifications}>
            <Textarea id="org-qual" name="qualifications" rows={3} maxLength={2000} defaultValue={defaults.qualifications ?? ''} />
          </Field>
        </div>
      </fieldset>

      {pendingNote && <p className="text-small text-muted">{pendingNote}</p>}
      <SubmitButton size="lg" className="w-full sm:w-auto" pendingText="Saving…">
        {submitLabel}
      </SubmitButton>
    </NoResetForm>
  )
}
