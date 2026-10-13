'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useFormState } from 'react-dom'
import { ArrowLeft, CircleCheck } from 'lucide-react'
import { saveListingStepAction, type WizardState } from '@/app/(account)/account/listings/actions'
import { WIZARD_STEPS, MIN_PHOTOS, type WizardStep } from '@/lib/validation/property'
import { COMPLETION, FEATURES, FINISHING, FURNISHING, PROPERTY_TYPES, TENURE } from '@/lib/labels'
import { Field, Input, Select, Textarea, describedBy } from '@/components/ui/Field'
import { Combobox, type ComboOption } from '@/components/ui/Combobox'
import { PriceInput } from '@/components/ui/PriceInput'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { ButtonLink } from '@/components/ui/Button'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import { MediaManager } from '@/components/media/MediaManager'
import type { MediaItem } from '@/lib/media-actions'
import { track } from '@/lib/analytics'
import { cn } from '@/lib/cn'

export interface WizardValues {
  purpose?: string
  property_type?: string
  title?: string
  description?: string
  location?: ComboOption | null
  address_line?: string | null
  show_exact_location?: boolean
  price_on_request?: boolean
  price_etb?: number | null
  price_negotiable?: boolean
  advance_months?: number | null
  service_charge_etb?: number | null
  bedrooms?: number | null
  bathrooms?: number | null
  area_m2?: number | null
  plot_area_m2?: number | null
  floors_label?: string | null
  floor_number?: number | null
  year_built?: number | null
  finishing_status?: string | null
  furnishing?: string | null
  tenure?: string | null
  has_title_deed?: boolean | null
  completion_status?: string | null
  parking_spaces?: number | null
  features?: string[]
  video_url?: string | null
  contact_phone?: string | null
  contact_whatsapp?: string | null
  contact_telegram?: string | null
  contact_email?: string | null
  preferred_contact?: string | null
  development_id?: string | null
}

function Progress({ step, id }: { step: WizardStep; id: string | null }) {
  const index = WIZARD_STEPS.findIndex((s) => s.id === step)
  return (
    <nav aria-label="Listing steps" className="mb-8">
      <p className="mb-2 text-small font-semibold text-muted">
        Step {index + 1} of {WIZARD_STEPS.length}: {WIZARD_STEPS[index].label}
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
        <div className="h-full rounded-full bg-green transition-all" style={{ width: `${((index + 1) / WIZARD_STEPS.length) * 100}%` }} />
      </div>
      <ol className="mt-3 hidden gap-1 sm:flex">
        {WIZARD_STEPS.map((s, i) => (
          <li key={s.id} className="flex-1">
            {id && i !== index ? (
              <Link href={`/account/listings/${id}/edit?step=${s.id}`} className={cn('block text-center text-caption font-semibold', i < index ? 'text-green' : 'text-muted')}>
                {s.label}
              </Link>
            ) : (
              <span aria-current={i === index ? 'step' : undefined} className={cn('block text-center text-caption font-semibold', i === index ? 'text-ink' : 'text-muted')}>
                {s.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

function useStep(onDone: (s: Extract<WizardState, { ok: true }>) => void) {
  const [state, action] = useFormState(saveListingStepAction, null)
  useEffect(() => {
    if (state?.ok) onDone(state)
  }, [state, onDone])
  return { state, action, errors: state && !state.ok ? state.fieldErrors ?? {} : {} }
}

function NavRow({ back, submitLabel = 'Save and continue' }: { back?: string; submitLabel?: string }) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
      {back ? (
        <ButtonLink href={back} variant="ghost">
          <ArrowLeft /> Back
        </ButtonLink>
      ) : (
        <span />
      )}
      <SubmitButton size="lg" pendingText="Saving…">
        {submitLabel}
      </SubmitButton>
    </div>
  )
}

export function BasicsFields({ v, errors }: { v: WizardValues; errors: Record<string, string> }) {
  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-small font-semibold">Are you selling or letting?</legend>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'sale', label: 'For sale' },
            { value: 'rent', label: 'To rent' },
          ].map((o) => (
            <label key={o.value} className="cursor-pointer">
              <input type="radio" name="purpose" value={o.value} defaultChecked={(v.purpose ?? 'sale') === o.value} className="peer sr-only" />
              <span className="flex h-14 items-center justify-center rounded-lg border-2 border-border font-semibold peer-checked:border-green peer-checked:bg-green-tint peer-focus-visible:ring-2 peer-focus-visible:ring-green">{o.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Property type" htmlFor="w-type" error={errors.property_type} required>
        <Select id="w-type" name="property_type" defaultValue={v.property_type ?? ''} invalid={Boolean(errors.property_type)}>
          <option value="" disabled>
            Choose a type
          </option>
          {PROPERTY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Title" htmlFor="w-title" error={errors.title} required hint="Say what it is and where, e.g. “Bright 3-bed apartment near Bole Atlas”.">
        <Input id="w-title" name="title" defaultValue={v.title} maxLength={120} invalid={Boolean(errors.title)} aria-describedby={describedBy('w-title', errors.title, 'hint')} />
      </Field>
      <Field label="Description" htmlFor="w-desc" error={errors.description} required hint="At least 80 characters. Mention the condition, finishing, nearby roads and services, and anything that makes it special.">
        <Textarea id="w-desc" name="description" defaultValue={v.description} rows={8} maxLength={6000} invalid={Boolean(errors.description)} aria-describedby={describedBy('w-desc', errors.description, 'hint')} />
      </Field>
    </div>
  )
}

export function LocationFields({ v, errors, developments }: { v: WizardValues; errors: Record<string, string>; developments: { id: string; name: string }[] }) {
  const [missing, setMissing] = useState(false)
  return (
    <div className="space-y-5">
      <Field label="Location" htmlFor="w-loc" error={errors.location_id} required hint="Choose the most precise area you can: sub-city or neighbourhood.">
        <Combobox id="w-loc" name="location_id" endpoint="/api/locations" defaultValue={v.location} invalid={Boolean(errors.location_id)} describedById={describedBy('w-loc', errors.location_id, 'hint')} />
      </Field>
      <button type="button" onClick={() => setMissing(!missing)} className="min-h-11 text-small font-semibold text-green underline">
        Can&apos;t find your area?
      </button>
      {missing && (
        <Field label="Area name" htmlFor="w-req" hint="Choose the nearest sub-city above, and tell us the neighbourhood. We'll add it.">
          <Input id="w-req" name="requested_area" maxLength={80} />
        </Field>
      )}
      <Field label="Address or nearby landmark" htmlFor="w-addr" optional hint="Not shown publicly unless you choose below." error={errors.address_line}>
        <Input id="w-addr" name="address_line" defaultValue={v.address_line ?? ''} maxLength={200} />
      </Field>
      {developments.length > 0 && (
        <Field label="Part of a development?" htmlFor="w-dev" optional>
          <Select id="w-dev" name="development_id" defaultValue={v.development_id ?? ''}>
            <option value="">No</option>
            {developments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <div className="flex min-h-11 items-start gap-3">
        <input id="w-exact" name="show_exact_location" type="checkbox" defaultChecked={v.show_exact_location} className="mt-1 size-5 accent-green" />
        <label htmlFor="w-exact">Show the address publicly. Otherwise visitors only see the area.</label>
      </div>
    </div>
  )
}

export function DetailsFields({ v, errors, purpose }: { v: WizardValues; errors: Record<string, string>; purpose: string }) {
  const [onRequest, setOnRequest] = useState(Boolean(v.price_on_request))
  const num = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n))
  return (
    <div className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="hl-h3 mb-2">Price</legend>
        {!onRequest && (
          <Field label={purpose === 'rent' ? 'Monthly rent' : 'Asking price'} htmlFor="w-price" error={errors.price_etb} required>
            <PriceInput id="w-price" name="price_etb" defaultValue={v.price_etb} suffix={purpose === 'rent' ? 'per month' : undefined} invalid={Boolean(errors.price_etb)} describedById={describedBy('w-price', errors.price_etb)} />
          </Field>
        )}
        <div className="flex flex-wrap gap-x-8">
          <div className="flex min-h-11 items-center gap-3">
            <input id="w-por" name="price_on_request" type="checkbox" checked={onRequest} onChange={(e) => setOnRequest(e.target.checked)} className="size-5 accent-green" />
            <label htmlFor="w-por">Price on request</label>
          </div>
          <div className="flex min-h-11 items-center gap-3">
            <input id="w-neg" name="price_negotiable" type="checkbox" defaultChecked={v.price_negotiable} className="size-5 accent-green" />
            <label htmlFor="w-neg">Negotiable</label>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {purpose === 'rent' && (
            <Field label="Months paid in advance" htmlFor="w-adv" optional error={errors.advance_months}>
              <Input id="w-adv" name="advance_months" inputMode="numeric" defaultValue={num(v.advance_months)} />
            </Field>
          )}
          <Field label="Service charge (ETB per month)" htmlFor="w-svc" optional error={errors.service_charge_etb}>
            <Input id="w-svc" name="service_charge_etb" inputMode="numeric" defaultValue={num(v.service_charge_etb)} />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend className="hl-h3 mb-4">Size and rooms</legend>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Bedrooms" htmlFor="w-beds" error={errors.bedrooms}>
            <Input id="w-beds" name="bedrooms" inputMode="numeric" defaultValue={num(v.bedrooms)} />
          </Field>
          <Field label="Bathrooms" htmlFor="w-baths" error={errors.bathrooms}>
            <Input id="w-baths" name="bathrooms" inputMode="numeric" defaultValue={num(v.bathrooms)} />
          </Field>
          <Field label="Floor area (m²)" htmlFor="w-area" error={errors.area_m2}>
            <Input id="w-area" name="area_m2" inputMode="decimal" defaultValue={num(v.area_m2)} />
          </Field>
          <Field label="Plot area (m²)" htmlFor="w-plot" error={errors.plot_area_m2}>
            <Input id="w-plot" name="plot_area_m2" inputMode="decimal" defaultValue={num(v.plot_area_m2)} />
          </Field>
          <Field label="Building height" htmlFor="w-floors" error={errors.floors_label} hint="e.g. G+2">
            <Input id="w-floors" name="floors_label" defaultValue={v.floors_label ?? ''} placeholder="G+2" />
          </Field>
          <Field label="Floor number" htmlFor="w-floor" error={errors.floor_number} hint="0 = ground">
            <Input id="w-floor" name="floor_number" inputMode="numeric" defaultValue={num(v.floor_number)} />
          </Field>
          <Field label="Parking spaces" htmlFor="w-park" error={errors.parking_spaces}>
            <Input id="w-park" name="parking_spaces" inputMode="numeric" defaultValue={num(v.parking_spaces)} />
          </Field>
          <Field label="Year built" htmlFor="w-year" error={errors.year_built}>
            <Input id="w-year" name="year_built" inputMode="numeric" defaultValue={num(v.year_built)} />
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend className="hl-h3 mb-4">Condition and documents</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Finishing" htmlFor="w-fin">
            <Select id="w-fin" name="finishing_status" defaultValue={v.finishing_status ?? ''}>
              <option value="">Choose</option>
              {FINISHING.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Furnishing" htmlFor="w-furn">
            <Select id="w-furn" name="furnishing" defaultValue={v.furnishing ?? ''}>
              <option value="">Choose</option>
              {FURNISHING.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tenure" htmlFor="w-ten">
            <Select id="w-ten" name="tenure" defaultValue={v.tenure ?? ''}>
              <option value="">Choose</option>
              {TENURE.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Title deed (carta) available?" htmlFor="w-deed">
            <Select id="w-deed" name="has_title_deed" defaultValue={v.has_title_deed === true ? 'yes' : v.has_title_deed === false ? 'no' : ''}>
              <option value="">Prefer not to say</option>
              <option value="yes">Yes</option>
              <option value="no">Not yet</option>
            </Select>
          </Field>
          <Field label="Completion" htmlFor="w-comp">
            <Select id="w-comp" name="completion_status" defaultValue={v.completion_status ?? ''}>
              <option value="">Choose</option>
              {COMPLETION.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </fieldset>

      <fieldset>
        <legend className="hl-h3 mb-4">Features</legend>
        <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.value} className="flex min-h-10 items-center gap-2.5">
              <input id={`w-f-${f.value}`} type="checkbox" name="features" value={f.value} defaultChecked={v.features?.includes(f.value)} className="size-5 accent-green" />
              <label htmlFor={`w-f-${f.value}`}>{f.label}</label>
            </li>
          ))}
        </ul>
      </fieldset>

      <Field label="Video tour (YouTube link)" htmlFor="w-video" optional error={errors.video_url}>
        <Input id="w-video" name="video_url" type="url" defaultValue={v.video_url ?? ''} placeholder="https://youtu.be/…" />
      </Field>
    </div>
  )
}

export function ContactFields({ v, errors }: { v: WizardValues; errors: Record<string, string> }) {
  return (
    <div className="space-y-5">
      <p className="text-muted">Buyers tap to reveal these. We pre-filled your account details; change them if someone else handles enquiries.</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Phone" htmlFor="w-phone" error={errors.contact_phone}>
          <PhoneInput id="w-phone" name="contact_phone" defaultValue={v.contact_phone} invalid={Boolean(errors.contact_phone)} />
        </Field>
        <Field label="WhatsApp" htmlFor="w-wa" optional error={errors.contact_whatsapp}>
          <PhoneInput id="w-wa" name="contact_whatsapp" defaultValue={v.contact_whatsapp} invalid={Boolean(errors.contact_whatsapp)} />
        </Field>
        <Field label="Telegram username" htmlFor="w-tg" optional error={errors.contact_telegram}>
          <Input id="w-tg" name="contact_telegram" defaultValue={v.contact_telegram ?? ''} placeholder="@username" />
        </Field>
        <Field label="Email" htmlFor="w-em" optional error={errors.contact_email}>
          <Input id="w-em" name="contact_email" type="email" defaultValue={v.contact_email ?? ''} />
        </Field>
      </div>
      <Field label="Preferred way to be contacted" htmlFor="w-pref">
        <Select id="w-pref" name="preferred_contact" defaultValue={v.preferred_contact ?? ''}>
          <option value="">No preference</option>
          <option value="phone">Phone call</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="telegram">Telegram</option>
          <option value="email">Email</option>
        </Select>
      </Field>
    </div>
  )
}

/** Six-step listing wizard (spec 7.4). Each step saves, then moves on. */
export function ListingWizard({ id, step, values, media, isLive, reviewSlot, developments = [] }: { id: string | null; step: WizardStep; values: WizardValues; media: MediaItem[]; isLive: boolean; reviewSlot?: React.ReactNode; developments?: { id: string; name: string }[] }) {
  const router = useRouter()
  const [localStep, setLocalStep] = useState<WizardStep>(id ? step : 'basics')
  const [basics, setBasics] = useState<FormData | null>(null)
  const current = id ? step : localStep
  const [done, setDone] = useState<string | null>(null)
  const { state, action, errors } = useStep((s) => {
    if (s.data.next === 'done') {
      setDone(s.data.message ?? 'Saved.')
      if (!isLive) track('listing_submitted', { purpose: values.purpose ?? 'sale' })
      return
    }
    if (!id) track('listing_created', { purpose: values.purpose ?? 'sale' })
    router.push(`/account/listings/${s.data.id}/edit?step=${s.data.next}`)
  })
  const index = WIZARD_STEPS.findIndex((s) => s.id === current)
  const back = id && index > 0 ? `/account/listings/${id}/edit?step=${WIZARD_STEPS[index - 1].id}` : undefined
  const purpose = values.purpose ?? 'sale'
  const basicsValues: WizardValues = basics
    ? { purpose: String(basics.get('purpose') ?? ''), property_type: String(basics.get('property_type') ?? ''), title: String(basics.get('title') ?? ''), description: String(basics.get('description') ?? '') }
    : values

  if (done) {
    return (
      <div className="rounded-xl border border-border bg-white p-8 text-center shadow-sm">
        <CircleCheck className="mx-auto size-12 text-green" aria-hidden />
        <h2 className="hl-h2 mt-4">{done}</h2>
        <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row [&>*]:flex-1">
          <ButtonLink href="/account/listings">My listings</ButtonLink>
          <ButtonLink href="/account/listings/new" variant="secondary">
            Add another
          </ButtonLink>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-8">
      <Progress step={current} id={id} />
      {isLive && <FormAlert tone="info" className="mb-6">This listing is live. Your edits are sent for a quick review and the current version stays live meanwhile.</FormAlert>}
      {state && !state.ok && <FormAlert className="mb-6">{state.error}</FormAlert>}

      {current === 'basics' && !id && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setBasics(new FormData(e.currentTarget))
            setLocalStep('location')
          }}
          className="space-y-8"
          noValidate
        >
          <BasicsFields v={basicsValues} errors={errors} />
          <NavRow />
        </form>
      )}
      {current === 'location' && !id && (
        <form action={action} className="space-y-8" noValidate>
          <input type="hidden" name="step" value="location" />
          {basics && Array.from(basics.entries()).map(([k, val]) => <input key={k} type="hidden" name={k} value={String(val)} />)}
          {(errors.title || errors.description || errors.property_type || errors.purpose) && (
            <FormAlert>
              Please check the first step.{' '}
              <button type="button" className="font-semibold underline" onClick={() => setLocalStep('basics')}>
                Go back
              </button>
            </FormAlert>
          )}
          <LocationFields v={values} errors={errors} developments={developments} />
          <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
            <button type="button" onClick={() => setLocalStep('basics')} className="inline-flex h-11 items-center gap-2 rounded-md px-5 font-semibold hover:bg-stone-100">
              <ArrowLeft className="size-[18px]" /> Back
            </button>
            <SubmitButton size="lg" pendingText="Saving…">
              Save and continue
            </SubmitButton>
          </div>
        </form>
      )}

      {id && (
        <form action={action} className="space-y-8" noValidate key={current}>
          <input type="hidden" name="step" value={current} />
          <input type="hidden" name="property_id" value={id} />
          {current === 'basics' && <BasicsFields v={values} errors={errors} />}
          {current === 'location' && <LocationFields v={values} errors={errors} developments={developments} />}
          {current === 'details' && <DetailsFields v={values} errors={errors} purpose={purpose} />}
          {current === 'photos' && (
            <div className="space-y-8">
              <section>
                <h2 className="hl-h3">Photos</h2>
                <p className="mb-4 mt-1 text-muted">At least {MIN_PHOTOS}, up to 25. Bright, landscape photos of every room work best. The first photo is the cover.</p>
                <MediaManager entityType="property" entityId={id} initial={media} minRequired={MIN_PHOTOS} />
              </section>
              <section>
                <h2 className="hl-h3">Floor plans</h2>
                <p className="mb-4 mt-1 text-muted">Optional, up to 3.</p>
                <MediaManager entityType="property" entityId={id} kind="floorplan" initial={media} label="Add floor plans" />
              </section>
            </div>
          )}
          {current === 'contact' && <ContactFields v={values} errors={errors} />}
          {current === 'review' && (
            <div className="space-y-6">
              {reviewSlot}
              <fieldset className="space-y-2 rounded-lg bg-stone-50 p-4">
                <legend className="sr-only">Declarations</legend>
                <div className="flex items-start gap-3">
                  <input id="w-d1" name="declare_owner" type="checkbox" className="mt-1 size-5 accent-green" aria-invalid={Boolean(errors.declare_owner) || undefined} />
                  <label htmlFor="w-d1">I am the owner of this property or I am authorised to list it.</label>
                </div>
                <div className="flex items-start gap-3">
                  <input id="w-d2" name="declare_accurate" type="checkbox" className="mt-1 size-5 accent-green" aria-invalid={Boolean(errors.declare_accurate) || undefined} />
                  <label htmlFor="w-d2">The information and photos are accurate and up to date.</label>
                </div>
                {(errors.declare_owner || errors.declare_accurate) && <p className="text-small text-error">{errors.declare_owner ?? errors.declare_accurate}</p>}
              </fieldset>
            </div>
          )}
          <NavRow back={back} submitLabel={current === 'review' ? (isLive ? 'Submit changes' : 'Submit for review') : 'Save and continue'} />
        </form>
      )}
    </div>
  )
}
