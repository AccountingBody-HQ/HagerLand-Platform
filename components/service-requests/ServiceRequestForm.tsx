'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useFormState } from 'react-dom'
import { FileCheck2, X } from 'lucide-react'
import { submitServiceRequestAction } from '@/app/actions/service-request-actions'
import { Field, Input, Select, Textarea, describedBy } from '@/components/ui/Field'
import { Combobox, type ComboOption } from '@/components/ui/Combobox'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { FileDrop, type UploadedDoc } from '@/components/media/FileDrop'
import { FormAlert, Honeypot, SubmitButton } from '@/components/forms/FormParts'
import { Turnstile } from '@/components/forms/Turnstile'
import { readUtm } from '@/components/enquiry/UtmCapture'
import { COUNTRIES, OTHER_COUNTRY } from '@/lib/countries'
import { BUDGET_BANDS, BUDGET_BANDS_ABROAD, URGENCY } from '@/lib/service-requests/labels'
import type { Question } from '@/lib/service-requests/questions'
import { track } from '@/lib/analytics'

function QuestionField({ q, error }: { q: Question; error?: string }) {
  const id = `sr-q-${q.id}`
  const name = `q_${q.id}`
  if (q.type === 'select' || q.type === 'yesno') {
    const options = q.type === 'yesno' ? [{ v: 'yes', l: 'Yes' }, { v: 'no', l: 'No' }] : (q.options ?? []).map((o) => ({ v: o, l: o }))
    return (
      <fieldset aria-describedby={error ? `${id}-error` : q.hint ? `${id}-hint` : undefined}>
        <legend className="text-small font-semibold text-ink">
          {q.label}
          {q.required && <span className="text-error" aria-hidden> *</span>}
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {options.map((o) => (
            <label key={o.v} className="cursor-pointer">
              <input type="radio" name={name} value={o.v} className="peer sr-only" />
              <span className="inline-flex min-h-11 items-center rounded-full border border-border-strong px-4 text-small font-medium peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-green">{o.l}</span>
            </label>
          ))}
        </div>
        {error ? <p id={`${id}-error`} role="alert" className="mt-1 text-small text-error">{error}</p> : q.hint ? <p id={`${id}-hint`} className="mt-1 text-small text-muted">{q.hint}</p> : null}
      </fieldset>
    )
  }
  if (q.type === 'multi') {
    return (
      <fieldset>
        <legend className="text-small font-semibold text-ink">
          {q.label}
          {q.required && <span className="text-error" aria-hidden> *</span>}
        </legend>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {(q.options ?? []).map((o, i) => (
            <label key={o} htmlFor={`${id}-${i}`} className="flex min-h-11 items-center gap-3">
              <input id={`${id}-${i}`} type="checkbox" name={name} value={o} className="size-5 accent-green" />
              {o}
            </label>
          ))}
        </div>
        {error && <p role="alert" className="mt-1 text-small text-error">{error}</p>}
      </fieldset>
    )
  }
  return (
    <Field label={q.label} htmlFor={id} error={error} hint={q.hint} required={q.required} optional={!q.required}>
      {q.type === 'textarea' ? (
        <Textarea id={id} name={name} rows={3} maxLength={2000} invalid={Boolean(error)} aria-describedby={describedBy(id, error, q.hint)} />
      ) : (
        <Input id={id} name={name} type={q.type === 'date' ? 'date' : 'text'} inputMode={q.type === 'number' ? 'decimal' : undefined} maxLength={300} invalid={Boolean(error)} aria-describedby={describedBy(id, error, q.hint)} />
      )}
    </Field>
  )
}

export interface RequestFormDefaults {
  name?: string | null
  phone?: string | null
  email?: string | null
  location?: ComboOption | null
}

/** "Request a service" form (spec 24.5): category questions, details, urgency, place, contact, files. */
export function ServiceRequestForm({
  categorySlug,
  categoryName,
  questions,
  allowsEmergency,
  defaults = {},
  abroad = false,
}: {
  categorySlug: string
  categoryName: string
  questions: Question[]
  allowsEmergency: boolean
  defaults?: RequestFormDefaults
  /** Start with "another country" selected (diaspora services abroad). */
  abroad?: boolean
}) {
  const [state, action] = useFormState(submitServiceRequestAction, null)
  const router = useRouter()
  const [uploadId] = useState(() => crypto.randomUUID())
  const [files, setFiles] = useState<UploadedDoc[]>([])
  const [utm, setUtm] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [notListed, setNotListed] = useState(abroad && !defaults.location)
  const [country, setCountry] = useState(abroad ? 'GB' : 'ET')
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  const urgencies = URGENCY.filter((u) => u.value !== 'emergency' || allowsEmergency)

  useEffect(() => {
    setUtm(readUtm())
    setSourceUrl(window.location.href.slice(0, 500))
  }, [])
  useEffect(() => {
    if (state?.ok) {
      track('service_request_submitted', { category: categorySlug })
      router.push(`/request-service/sent?ref=${encodeURIComponent(state.data.reference)}`)
    }
  }, [state, router, categorySlug])

  return (
    <form action={action} className="space-y-8" noValidate>
      <input type="hidden" name="category_slug" value={categorySlug} />
      <input type="hidden" name="upload_id" value={uploadId} />
      <input type="hidden" name="utm" value={utm} />
      <input type="hidden" name="source_url" value={sourceUrl} />
      {files.map((f) => (
        <input key={f.path} type="hidden" name="files" value={f.path} />
      ))}
      <Honeypot />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}

      <fieldset className="space-y-5">
        <legend className="hl-h3 mb-2">About the job</legend>
        <Field label="Give your request a short title" htmlFor="sr-title" error={errors.title} required hint={`For example: “${categoryName} for a G+1 house in Bole”.`}>
          <Input id="sr-title" name="title" maxLength={160} invalid={Boolean(errors.title)} aria-describedby={describedBy('sr-title', errors.title, true)} />
        </Field>
        {questions.map((q) => (
          <QuestionField key={q.id} q={q} error={errors[`q_${q.id}`]} />
        ))}
        <Field label="Describe what you need" htmlFor="sr-details" error={errors.details} required hint="Size, materials, access, anything a provider should know before quoting.">
          <Textarea id="sr-details" name="details" rows={5} maxLength={4000} invalid={Boolean(errors.details)} aria-describedby={describedBy('sr-details', errors.details, true)} />
        </Field>
        <fieldset>
          <legend className="text-small font-semibold text-ink">
            How soon? <span className="text-error" aria-hidden>*</span>
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {urgencies.map((u, i) => (
              <label key={u.value} className="cursor-pointer">
                <input type="radio" name="urgency" value={u.value} defaultChecked={u.value === 'flexible' || (i === urgencies.length - 1 && !urgencies.some((x) => x.value === 'flexible'))} className="peer sr-only" />
                <span className="flex min-h-14 flex-col justify-center rounded-lg border border-border-strong px-4 py-2 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-green">
                  <span className="font-semibold">{u.label}</span>
                  <span className="text-small opacity-80">{u.description}</span>
                </span>
              </label>
            ))}
          </div>
          {errors.urgency && <p role="alert" className="mt-1 text-small text-error">{errors.urgency}</p>}
        </fieldset>
        <Field label="Budget" htmlFor="sr-budget" optional>
          <Select id="sr-budget" name="budget_band" defaultValue="">
            <option value="">Not sure / prefer not to say</option>
            {(country === 'ET' ? BUDGET_BANDS : BUDGET_BANDS_ABROAD).map((b) => (
              <option key={b}>{b}</option>
            ))}
          </Select>
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="hl-h3 mb-2">Where</legend>
        {!notListed ? (
          <Field label="Where is the work?" htmlFor="sr-location" error={errors.location_id} required hint="Start typing a city, sub-city or area. We also cover cities abroad.">
            <Combobox id="sr-location" name="location_id" endpoint="/api/locations?scope=all" defaultValue={defaults.location} invalid={Boolean(errors.location_id)} describedById={describedBy('sr-location', errors.location_id, 'hint')} />
          </Field>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Country" htmlFor="sr-country" required>
              <Select id="sr-country" name="country_code" value={country} onChange={(e) => setCountry(e.target.value)}>
                {[...COUNTRIES, OTHER_COUNTRY].map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="City or area" htmlFor="sr-place" error={errors.location_id ?? errors.location_text} required>
              <Input id="sr-place" name="location_text" maxLength={200} invalid={Boolean(errors.location_id ?? errors.location_text)} />
            </Field>
          </div>
        )}
        <button type="button" className="min-h-11 text-small font-semibold text-green underline" onClick={() => setNotListed(!notListed)}>
          {notListed ? 'Choose from the list instead' : "Can't find your place? Type it instead"}
        </button>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="hl-h3 mb-2">Photos or documents</legend>
        {files.length < 5 && (
          <FileDrop
            target={{ purpose: 'private', area: 'request', id: uploadId }}
            accept="application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            maxFiles={5 - files.length}
            label="Add photos or documents"
            hint="Optional. Photos of the problem, plans or a bill of quantities. Up to 5 files, 15 MB each. Only HagerLand and providers who accept your request see them."
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
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="hl-h3 mb-2">Your details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" htmlFor="sr-name" error={errors.name} required>
            <Input id="sr-name" name="name" autoComplete="name" defaultValue={defaults.name ?? ''} invalid={Boolean(errors.name)} />
          </Field>
          <Field label="Phone" htmlFor="sr-phone" error={errors.phone} required>
            <PhoneInput id="sr-phone" name="phone" defaultValue={defaults.phone} invalid={Boolean(errors.phone)} describedById={describedBy('sr-phone', errors.phone)} />
          </Field>
          <Field label="Email" htmlFor="sr-email" error={errors.email} required hint="We email you a link to follow your request and see quotes.">
            <Input id="sr-email" name="email" type="email" autoComplete="email" defaultValue={defaults.email ?? ''} invalid={Boolean(errors.email)} aria-describedby={describedBy('sr-email', errors.email, true)} />
          </Field>
          <Field label="Preferred way to reply" htmlFor="sr-pref">
            <Select id="sr-pref" name="preferred_contact" defaultValue="">
              <option value="">No preference</option>
              <option value="phone">Phone call</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
              <option value="email">Email</option>
            </Select>
          </Field>
        </div>
      </fieldset>

      <Turnstile action="service_request" />
      <SubmitButton fullWidth size="lg" pendingText="Sending…">
        Send my request
      </SubmitButton>
      <p className="text-caption text-muted">
        We share your request with up to three suitable providers. Your phone and email go only to providers who accept it. See our{' '}
        <Link href="/terms" className="underline">
          Terms
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  )
}
