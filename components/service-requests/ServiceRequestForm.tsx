'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
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
import { PAY_OFFERED_MAX, STAFFING_SLUG, requestFormCopy } from '@/lib/service-requests/form-copy'
import type { Question } from '@/lib/service-requests/questions'
import { track } from '@/lib/analytics'
import { NoResetForm } from '@/components/forms/NoResetForm'
import { useJobsI18n } from '@/lib/i18n/client'
import { fill, type Translate } from '@/lib/i18n/translate'

const asIs: Translate = (s) => s

function QuestionField({ q, error, t }: { q: Question; error?: string; t: Translate }) {
  const id = `sr-q-${q.id}`
  const name = `q_${q.id}`
  if (q.type === 'select' || q.type === 'yesno') {
    const options = q.type === 'yesno' ? [{ v: 'yes', l: t('Yes') }, { v: 'no', l: t('No') }] : (q.options ?? []).map((o) => ({ v: o, l: t(o) }))
    return (
      <fieldset aria-describedby={error ? `${id}-error` : q.hint ? `${id}-hint` : undefined}>
        <legend className="text-small font-semibold text-ink">
          {t(q.label)}
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
        {error ? <p id={`${id}-error`} role="alert" className="mt-1 text-small text-error">{error}</p> : q.hint ? <p id={`${id}-hint`} className="mt-1 text-small text-muted">{t(q.hint)}</p> : null}
      </fieldset>
    )
  }
  if (q.type === 'multi') {
    return (
      <fieldset>
        <legend className="text-small font-semibold text-ink">
          {t(q.label)}
          {q.required && <span className="text-error" aria-hidden> *</span>}
        </legend>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {(q.options ?? []).map((o, i) => (
            <label key={o} htmlFor={`${id}-${i}`} className="flex min-h-11 items-center gap-3">
              <input id={`${id}-${i}`} type="checkbox" name={name} value={o} className="size-5 accent-green" />
              {t(o)}
            </label>
          ))}
        </div>
        {error && <p role="alert" className="mt-1 text-small text-error">{error}</p>}
      </fieldset>
    )
  }
  return (
    <Field label={t(q.label)} htmlFor={id} error={error} hint={q.hint ? t(q.hint) : q.hint} required={q.required} optional={!q.required}>
      {q.type === 'textarea' ? (
        <Textarea id={id} name={name} rows={3} maxLength={2000} invalid={Boolean(error)} aria-describedby={describedBy(id, error, q.hint)} />
      ) : (
        <Input id={id} name={name} type={q.type === 'date' ? 'date' : 'text'} inputMode={q.type === 'number' ? 'decimal' : undefined} maxLength={300} invalid={Boolean(error)} aria-describedby={describedBy(id, error, q.hint)} />
      )}
    </Field>
  )
}

/** "Are you based outside Ethiopia?" (staffing only): the page passes the approved text through t(). */
export interface EmployerAbroadText {
  question: string
  hint: string
  countryQuestion: string
  countries: { code: string; name: string }[]
}

function EmployerAbroadField({ text, errors, t }: { text: EmployerAbroadText; errors: Record<string, string>; t: Translate }) {
  const [answer, setAnswer] = useState('')
  const error = errors.employer_abroad
  return (
    <div className="space-y-4 sm:col-span-2">
      <fieldset aria-describedby={error ? 'sr-abroad-error' : 'sr-abroad-hint'}>
        <legend className="text-small font-semibold text-ink">{text.question}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            { v: 'yes', l: t('Yes') },
            { v: 'no', l: t('No') },
          ].map((o) => (
            <label key={o.v} className="cursor-pointer">
              <input type="radio" name="employer_abroad" value={o.v} checked={answer === o.v} onChange={() => setAnswer(o.v)} className="peer sr-only" />
              <span className="inline-flex min-h-11 items-center rounded-full border border-border-strong px-4 text-small font-medium peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-green">{o.l}</span>
            </label>
          ))}
        </div>
        {error ? <p id="sr-abroad-error" role="alert" className="mt-1 text-small text-error">{error}</p> : <p id="sr-abroad-hint" className="mt-1 text-small text-muted">{text.hint}</p>}
      </fieldset>
      {answer === 'yes' && (
        <Field label={text.countryQuestion} htmlFor="sr-abroad-country" error={errors.employer_country} required>
          <Select id="sr-abroad-country" name="employer_country" defaultValue="" invalid={Boolean(errors.employer_country)}>
            <option value="" disabled>
              —
            </option>
            {text.countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </div>
  )
}

export interface RequestFormDefaults {
  name?: string | null
  phone?: string | null
  email?: string | null
  location?: ComboOption | null
  /** Staff turning a call-back into a staffing request (Jobs Phase 5): what the caller said they need. */
  details?: string | null
}

/** "Request a service" form (spec 24.5): category questions, details, urgency, place, contact, files. */
export function ServiceRequestForm({
  categorySlug,
  categoryName,
  questions,
  allowsEmergency,
  defaults = {},
  abroad = false,
  employerAbroad = null,
  callbackId = null,
}: {
  categorySlug: string
  categoryName: string
  questions: Question[]
  allowsEmergency: boolean
  defaults?: RequestFormDefaults
  /** Start with "another country" selected (diaspora services abroad). */
  abroad?: boolean
  employerAbroad?: EmployerAbroadText | null
  /** Staff only (Jobs Phase 5): the call-back this staffing request comes from; it is closed and linked when sent. */
  callbackId?: string | null
}) {
  const [state, action] = useActionState(submitServiceRequestAction, null)
  const router = useRouter()
  const [uploadId] = useState(() => crypto.randomUUID())
  const [files, setFiles] = useState<UploadedDoc[]>([])
  const [utm, setUtm] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [notListed, setNotListed] = useState(abroad && !defaults.location)
  const [country, setCountry] = useState(abroad ? 'GB' : 'ET')
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  const copy = requestFormCopy(categorySlug)
  // Staffing is a Jobs page (Jobs Phase 5): its text goes through the Jobs translator; every other service stays as it is.
  const jobsI18n = useJobsI18n()
  const staffing = categorySlug === STAFFING_SLUG
  const t = staffing ? jobsI18n.t : asIs
  const jobsHref = staffing ? jobsI18n.href : asIs
  const urgencies = URGENCY.filter((u) => u.value !== 'emergency' || allowsEmergency)

  useEffect(() => {
    setUtm(readUtm())
    setSourceUrl(window.location.href.slice(0, 500))
  }, [])
  useEffect(() => {
    if (state?.ok) {
      track('service_request_submitted', { category: categorySlug })
      // Tidy T-2 (T2-4): staff who sent it for a phone-only caller go back to the call-back queue (no email was sent).
      if (state.data.phoneOnly) router.push(`/roodber8/jobs/callbacks?made=${encodeURIComponent(state.data.reference)}`)
      else router.push(jobsHref(`/request-service/sent?ref=${encodeURIComponent(state.data.reference)}${copy.nextStep ? `&for=${encodeURIComponent(categorySlug)}` : ''}`))
    }
  }, [state, router, categorySlug, copy.nextStep, jobsHref])

  return (
    <NoResetForm action={action} className="space-y-8" noValidate>
      <input type="hidden" name="category_slug" value={categorySlug} />
      <input type="hidden" name="upload_id" value={uploadId} />
      <input type="hidden" name="utm" value={utm} />
      <input type="hidden" name="source_url" value={sourceUrl} />
      {callbackId && <input type="hidden" name="callback_id" value={callbackId} />}
      {files.map((f) => (
        <input key={f.path} type="hidden" name="files" value={f.path} />
      ))}
      <Honeypot />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}

      <fieldset className="space-y-5">
        <legend className="hl-h3 mb-2">{t('About the job')}</legend>
        <Field label={t('Give your request a short title')} htmlFor="sr-title" error={errors.title} required hint={t(copy.titleHint(categoryName))}>
          <Input id="sr-title" name="title" maxLength={160} invalid={Boolean(errors.title)} aria-describedby={describedBy('sr-title', errors.title, true)} />
        </Field>
        {questions.map((q) => (
          <QuestionField key={q.id} q={q} error={errors[`q_${q.id}`]} t={t} />
        ))}
        <Field label={t(copy.detailsLabel)} htmlFor="sr-details" error={errors.details} required hint={t(copy.detailsHint)}>
          <Textarea id="sr-details" name="details" rows={5} maxLength={4000} defaultValue={defaults.details ?? undefined} invalid={Boolean(errors.details)} aria-describedby={describedBy('sr-details', errors.details, true)} />
        </Field>
        <fieldset>
          <legend className="text-small font-semibold text-ink">
            {t('How soon?')} <span className="text-error" aria-hidden>*</span>
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {urgencies.map((u, i) => (
              <label key={u.value} className="cursor-pointer">
                <input type="radio" name="urgency" value={u.value} defaultChecked={u.value === 'flexible' || (i === urgencies.length - 1 && !urgencies.some((x) => x.value === 'flexible'))} className="peer sr-only" />
                <span className="flex min-h-14 flex-col justify-center rounded-lg border border-border-strong px-4 py-2 peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-green">
                  <span className="font-semibold">{t(u.label)}</span>
                  <span className="text-small opacity-80">{t(u.description)}</span>
                </span>
              </label>
            ))}
          </div>
          {errors.urgency && <p role="alert" className="mt-1 text-small text-error">{errors.urgency}</p>}
        </fieldset>
        {copy.budget && (
          <Field label="Budget" htmlFor="sr-budget" optional>
            <Select id="sr-budget" name="budget_band" defaultValue="">
              <option value="">Not sure / prefer not to say</option>
              {(country === 'ET' ? BUDGET_BANDS : BUDGET_BANDS_ABROAD).map((b) => (
                <option key={b}>{b}</option>
              ))}
            </Select>
          </Field>
        )}
        {copy.pay && (
          <Field label={t(copy.pay.label)} htmlFor="sr-pay" error={errors.pay_offered} hint={t(copy.pay.hint)}>
            <Input id="sr-pay" name="pay_offered" maxLength={PAY_OFFERED_MAX} invalid={Boolean(errors.pay_offered)} aria-describedby={describedBy('sr-pay', errors.pay_offered, true)} />
          </Field>
        )}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="hl-h3 mb-2">{t('Where')}</legend>
        {!notListed ? (
          <Field label={t(copy.locationLabel)} htmlFor="sr-location" error={errors.location_id} required hint={t(copy.locationHint)}>
            <Combobox id="sr-location" name="location_id" endpoint="/api/locations?scope=all" defaultValue={defaults.location} invalid={Boolean(errors.location_id)} describedById={describedBy('sr-location', errors.location_id, 'hint')} />
          </Field>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('Country')} htmlFor="sr-country" required>
              <Select id="sr-country" name="country_code" value={country} onChange={(e) => setCountry(e.target.value)}>
                {[...COUNTRIES, OTHER_COUNTRY].map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('City or area')} htmlFor="sr-place" error={errors.location_id ?? errors.location_text} required>
              <Input id="sr-place" name="location_text" maxLength={200} invalid={Boolean(errors.location_id ?? errors.location_text)} />
            </Field>
          </div>
        )}
        <button type="button" className="min-h-11 text-small font-semibold text-green underline" onClick={() => setNotListed(!notListed)}>
          {notListed ? t('Choose from the list instead') : t("Can't find your place? Type it instead")}
        </button>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="hl-h3 mb-2">{t('Photos or documents')}</legend>
        {files.length < 5 && (
          <FileDrop
            target={{ purpose: 'private', area: 'request', id: uploadId }}
            accept="application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            maxFiles={5 - files.length}
            label={t('Add photos or documents')}
            hint={t('Optional. Photos of the problem, plans or a bill of quantities. Up to 5 files, 15 MB each. Only HagerLand and providers who accept your request see them.')}
            onDocUploaded={(d) => setFiles((all) => [...all, d])}
          />
        )}
        {files.length > 0 && (
          <ul className="space-y-1">
            {files.map((f) => (
              <li key={f.path} className="flex min-h-11 items-center gap-2 rounded-md bg-green-tint px-3 text-small">
                <FileCheck2 className="size-4 text-green" aria-hidden /> <span className="flex-1 truncate">{f.name}</span>
                <button type="button" className="inline-flex size-10 items-center justify-center" aria-label={fill(t('Remove {name}'), { name: f.name })} onClick={() => setFiles((all) => all.filter((x) => x.path !== f.path))}>
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="hl-h3 mb-2">{t('Your details')}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('Your name')} htmlFor="sr-name" error={errors.name} required>
            <Input id="sr-name" name="name" autoComplete="name" defaultValue={defaults.name ?? ''} invalid={Boolean(errors.name)} />
          </Field>
          <Field label={t('Phone')} htmlFor="sr-phone" error={errors.phone} required>
            <PhoneInput id="sr-phone" name="phone" defaultValue={defaults.phone} invalid={Boolean(errors.phone)} describedById={describedBy('sr-phone', errors.phone)} />
          </Field>
          {/* Tidy T-2 (T2-4): staff sending it from a call-back may leave the email out (the server checks the same). */}
          <Field
            label={t('Email')}
            htmlFor="sr-email"
            error={errors.email}
            required={!callbackId}
            optional={Boolean(callbackId)}
            hint={callbackId ? 'Leave it empty if the caller has no email. They will get no emails or link: keep them updated by phone.' : t('We email you a link to follow your request and see quotes.')}
          >
            <Input id="sr-email" name="email" type="email" autoComplete="email" defaultValue={defaults.email ?? ''} invalid={Boolean(errors.email)} aria-describedby={describedBy('sr-email', errors.email, true)} />
          </Field>
          <Field label={t('Preferred way to reply')} htmlFor="sr-pref">
            <Select id="sr-pref" name="preferred_contact" defaultValue="">
              <option value="">{t('No preference')}</option>
              <option value="phone">{t('Phone call')}</option>
              <option value="whatsapp">{t('WhatsApp')}</option>
              <option value="telegram">{t('Telegram')}</option>
              <option value="email">{t('Email')}</option>
            </Select>
          </Field>
          {employerAbroad && <EmployerAbroadField text={employerAbroad} errors={errors} t={t} />}
        </div>
      </fieldset>

      <Turnstile action="service_request" />
      <SubmitButton fullWidth size="lg" pendingText={t('Sending…')}>
        {t('Send my request')}
      </SubmitButton>
      <p className="text-caption text-muted">
        {t(copy.footer)} {t('See our')}{' '}
        <Link href="/terms" className="underline">
          {t('Terms')}
        </Link>{' '}
        {t('and')}{' '}
        <Link href="/privacy" className="underline">
          {t('Privacy Policy')}
        </Link>
        .
      </p>
    </NoResetForm>
  )
}
