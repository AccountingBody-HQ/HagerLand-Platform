'use client'

import Link from 'next/link'
import { useActionState, useEffect, useState, type ReactNode } from 'react'
import { CircleCheck, FileCheck2, X } from 'lucide-react'
import { applyToRentAction, bookViewingAction, makeOfferAction, requestValuationAction, type AgencyState } from '@/app/actions/agency-actions'
import { Checkbox, Field, Input, Select, Textarea, describedBy } from '@/components/ui/Field'
import { Combobox } from '@/components/ui/Combobox'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { PriceInput } from '@/components/ui/PriceInput'
import { FormAlert, Honeypot, SubmitButton } from '@/components/forms/FormParts'
import { Turnstile } from '@/components/forms/Turnstile'
import { NoResetForm } from '@/components/forms/NoResetForm'
import { TimeZoneFields } from '@/components/forms/TimeZoneFields'
import { FileDrop, type UploadedDoc } from '@/components/media/FileDrop'
import { PROPERTY_TYPES } from '@/lib/labels'
import { track } from '@/lib/analytics'

function Done({ title, text, reference }: { title: string; text: string; reference: string }) {
  return (
    <div className="rounded-lg bg-green-tint p-5 text-center" role="status">
      <CircleCheck className="mx-auto size-10 text-green" aria-hidden />
      <h2 className="hl-h3 mt-3">{title}</h2>
      <p className="mt-2 text-muted">
        {text} Your reference is <strong className="text-ink">{reference}</strong>.
      </p>
      <p className="mt-3 text-small">
        <Link href="/account/agency" className="font-semibold text-green underline">
          Follow it in your account
        </Link>{' '}
        (sign in with the same email).
      </p>
    </div>
  )
}

function Contact({ p, errors, emailRequired }: { p: string; errors: Record<string, string>; emailRequired?: boolean }) {
  return (
    <>
      <Field label="Your name" htmlFor={`${p}-name`} error={errors.name} required>
        <Input id={`${p}-name`} name="name" autoComplete="name" invalid={Boolean(errors.name)} aria-describedby={describedBy(`${p}-name`, errors.name)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" htmlFor={`${p}-phone`} error={errors.phone} required>
          <PhoneInput id={`${p}-phone`} name="phone" invalid={Boolean(errors.phone)} describedById={describedBy(`${p}-phone`, errors.phone)} />
        </Field>
        <Field label="Email" htmlFor={`${p}-email`} error={errors.email} required={emailRequired} optional={!emailRequired}>
          <Input id={`${p}-email`} name="email" type="email" autoComplete="email" invalid={Boolean(errors.email)} aria-describedby={describedBy(`${p}-email`, errors.email)} />
        </Field>
      </div>
    </>
  )
}

function Footer({ p, submit, action }: { p: string; submit: string; action: string }) {
  return (
    <>
      <Checkbox id={`${p}-consent`} name="marketing_consent" label="Email me about properties that match what I am looking for" description="Optional. You can stop these at any time." />
      <Turnstile action={action} />
      <SubmitButton fullWidth size="lg" pendingText="Sending…">
        {submit}
      </SubmitButton>
      <p className="text-caption text-muted">
        HagerLand uses your details to handle this request. See our{' '}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </>
  )
}

function useAgencyForm(fn: (prev: AgencyState, fd: FormData) => Promise<AgencyState>, event: string) {
  const [state, action] = useActionState(fn, null)
  useEffect(() => {
    if (state?.ok) track('enquiry_submitted', { target_type: 'property', intent: event })
  }, [state, event])
  return { state, action, errors: state && !state.ok ? (state.fieldErrors ?? {}) : {} }
}

function Shell({ action, state, children }: { action: (fd: FormData) => void; state: AgencyState; children: ReactNode }) {
  return (
    <NoResetForm action={action} className="space-y-4" noValidate>
      <Honeypot />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      {children}
    </NoResetForm>
  )
}

/** "Book a valuation" with HagerLand's estate agency (spec 26.5). */
export function ValuationForm({ purposes }: { purposes: ('sale' | 'rent')[] }) {
  const { state, action, errors } = useAgencyForm(requestValuationAction, 'valuation')
  if (state?.ok) return <Done title="Valuation requested" text="An agent will contact you to arrange a visit." reference={state.data.reference} />
  const p = 'val'
  return (
    <Shell action={action} state={state}>
      <fieldset>
        <legend className="mb-2 text-small font-semibold text-ink">I want to</legend>
        <div className="flex gap-2">
          {purposes.map((x, i) => (
            <label key={x} className="flex-1 cursor-pointer">
              <input type="radio" name="purpose" value={x} defaultChecked={i === 0} className="peer sr-only" />
              <span className="flex min-h-11 items-center justify-center rounded-md border border-border-strong px-4 font-semibold peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-green">{x === 'sale' ? 'Sell' : 'Let'}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Type of property" htmlFor={`${p}-type`} error={errors.property_type} required>
        <Select id={`${p}-type`} name="property_type" defaultValue="" invalid={Boolean(errors.property_type)}>
          <option value="" disabled>
            Choose…
          </option>
          {PROPERTY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Where is it?" htmlFor={`${p}-loc`} error={errors.location_id} hint="City, sub-city or area in Ethiopia." required>
        <Combobox id={`${p}-loc`} name="location_id" endpoint="/api/locations" invalid={Boolean(errors.location_id)} describedById={describedBy(`${p}-loc`, errors.location_id, 'hint')} />
      </Field>
      <Field label="Address or landmark" htmlFor={`${p}-addr`} error={errors.address_line} optional>
        <Input id={`${p}-addr`} name="address_line" maxLength={300} />
      </Field>
      <Field label="Anything we should know" htmlFor={`${p}-details`} error={errors.details} optional>
        <Textarea id={`${p}-details`} name="details" rows={3} maxLength={2000} placeholder="Bedrooms, size, condition, whether it is let now…" />
      </Field>
      <Contact p={p} errors={errors} emailRequired />
      <TimeZoneFields idPrefix={p} />
      <Footer p={p} submit="Book my valuation" action="valuation" />
    </Shell>
  )
}

/** "Book a viewing" on a listing HagerLand markets (spec 26.5). */
export function ViewingForm({ propertyId }: { propertyId: string }) {
  const { state, action, errors } = useAgencyForm(bookViewingAction, 'viewing')
  if (state?.ok) return <Done title="Viewing requested" text="We will contact you to confirm a time." reference={state.data.reference} />
  const p = 'vw'
  return (
    <Shell action={action} state={state}>
      <input type="hidden" name="property_id" value={propertyId} />
      <fieldset>
        <legend className="mb-2 text-small font-semibold text-ink">How would you like to view?</legend>
        <div className="flex gap-2">
          {(
            [
              ['in_person', 'In person'],
              ['video', 'Video call'],
            ] as const
          ).map(([v, l], i) => (
            <label key={v} className="flex-1 cursor-pointer">
              <input type="radio" name="mode" value={v} defaultChecked={i === 0} className="peer sr-only" />
              <span className="flex min-h-11 items-center justify-center rounded-md border border-border-strong px-4 font-semibold peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-green">{l}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Contact p={p} errors={errors} />
      <TimeZoneFields idPrefix={p} timesLabel="When would suit you?" required error={errors.preferred_times} />
      <Field label="Message" htmlFor={`${p}-msg`} optional>
        <Textarea id={`${p}-msg`} name="message" rows={3} maxLength={2000} />
      </Field>
      <Footer p={p} submit="Request a viewing" action="viewing" />
    </Shell>
  )
}

/** "Make an offer": a non-binding expression of interest (spec 26.5). */
export function OfferForm({ propertyId }: { propertyId: string }) {
  const { state, action, errors } = useAgencyForm(makeOfferAction, 'offer')
  if (state?.ok) return <Done title="Offer sent" text="We will put your offer to the owner and tell you their decision." reference={state.data.reference} />
  const p = 'of'
  return (
    <Shell action={action} state={state}>
      <input type="hidden" name="property_id" value={propertyId} />
      <Field label="Your offer (ETB)" htmlFor={`${p}-amount`} error={errors.amount_etb} required>
        <PriceInput id={`${p}-amount`} name="amount_etb" invalid={Boolean(errors.amount_etb)} />
      </Field>
      <Field label="Conditions" htmlFor={`${p}-cond`} error={errors.conditions} optional hint="For example: subject to a survey, or including furniture.">
        <Textarea id={`${p}-cond`} name="conditions" rows={2} maxLength={2000} />
      </Field>
      <Field label="How you will pay" htmlFor={`${p}-fund`} error={errors.funding_note} optional hint="For example: cash, bank finance (in progress), or a mix.">
        <Input id={`${p}-fund`} name="funding_note" maxLength={1000} />
      </Field>
      <Contact p={p} errors={errors} />
      <div className="rounded-md bg-stone-50 p-3">
        <Checkbox id={`${p}-understood`} name="understood" label="I understand this offer is an expression of interest only" description="It does not bind me or the owner. Nothing is agreed until a written sale agreement is signed." />
        {errors.understood && <p className="mt-1 text-small text-error">{errors.understood}</p>}
      </div>
      <Footer p={p} submit="Send my offer" action="offer" />
    </Shell>
  )
}

/** "Apply to rent" on a let HagerLand markets (spec 26.5). Documents are optional and private. */
export function ApplyForm({ propertyId }: { propertyId: string }) {
  const { state, action, errors } = useAgencyForm(applyToRentAction, 'apply')
  const [uploadId] = useState(() => crypto.randomUUID())
  const [files, setFiles] = useState<UploadedDoc[]>([])
  if (state?.ok) return <Done title="Application sent" text="We will check your application with the landlord and contact you." reference={state.data.reference} />
  const p = 'ap'
  return (
    <Shell action={action} state={state}>
      <input type="hidden" name="property_id" value={propertyId} />
      <input type="hidden" name="upload_id" value={uploadId} />
      {files.map((f) => (
        <input key={f.path} type="hidden" name="files" value={f.path} />
      ))}
      <Contact p={p} errors={errors} emailRequired />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Move-in date" htmlFor={`${p}-move`} error={errors.move_in_date} optional>
          <Input id={`${p}-move`} name="move_in_date" type="date" />
        </Field>
        <Field label="Number of people living there" htmlFor={`${p}-occ`} error={errors.occupants} optional>
          <Input id={`${p}-occ`} name="occupants" inputMode="numeric" maxLength={2} />
        </Field>
      </div>
      <Field label="Your work" htmlFor={`${p}-work`} error={errors.employment_note} optional hint="Employer and role, or your business.">
        <Input id={`${p}-work`} name="employment_note" maxLength={1000} />
      </Field>
      <Field label="Income" htmlFor={`${p}-income`} error={errors.income_note} optional hint="Roughly, per month. Only HagerLand and the landlord see this.">
        <Input id={`${p}-income`} name="income_note" maxLength={1000} />
      </Field>
      <Field label="Message" htmlFor={`${p}-msg`} optional>
        <Textarea id={`${p}-msg`} name="message" rows={3} maxLength={2000} />
      </Field>
      {files.length < 5 && (
        <FileDrop
          target={{ purpose: 'private', area: 'application', id: uploadId }}
          accept="application/pdf,image/jpeg,image/png"
          maxFiles={5 - files.length}
          label="Add documents (optional)"
          hint="For example an ID or a letter from your employer. PDF or photo, up to 5 files. Kept private: only HagerLand sees them."
          onDocUploaded={(d) => setFiles((all) => [...all, d])}
        />
      )}
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f) => (
            <li key={f.path} className="flex min-h-11 items-center gap-2 rounded-md bg-green-tint px-3 text-small">
              <FileCheck2 className="size-4 text-green" aria-hidden /> <span className="flex-1 truncate">{f.name}</span>
              <button type="button" className="inline-flex size-10 items-center justify-center" aria-label={`Remove ${f.name}`} onClick={() => setFiles((all) => all.filter((x) => x.path !== f.path))}>
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Footer p={p} submit="Send my application" action="apply" />
    </Shell>
  )
}
