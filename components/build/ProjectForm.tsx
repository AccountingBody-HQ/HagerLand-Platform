'use client'

import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { createBuildProjectAction } from '@/app/actions/build-project-actions'
import { Field, Input, Select, Textarea, describedBy } from '@/components/ui/Field'
import { Combobox } from '@/components/ui/Combobox'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { Button, ButtonLink } from '@/components/ui/Button'
import { FormAlert, Honeypot, SubmitButton } from '@/components/forms/FormParts'
import { Turnstile } from '@/components/forms/Turnstile'
import { NoResetForm } from '@/components/forms/NoResetForm'
import { TimeZoneFields } from '@/components/forms/TimeZoneFields'
import { COUNTRIES, OTHER_COUNTRY } from '@/lib/countries'
import { BUDGET_BANDS, PROJECT_SERVICES, TIMELINES } from '@/lib/build-projects'
import { cn } from '@/lib/cn'
import { track } from '@/lib/analytics'

const STEPS = ['Your plot', 'Plans and budget', 'What you need', 'Your details'] as const
/** Which step each field is on, so a server error opens the right step. */
const FIELD_STEP: Record<string, number> = { title: 0, location_id: 0, location_text: 0, plot_size_m2: 0, floors: 1, budget_band: 1, timeline: 1, details: 1, services: 2, name: 3, phone: 3, email: 3, country_code: 3 }

/** "Start a building project": a short brief in four steps (spec 26.9). One submission at the end. */
export function ProjectForm({ defaults, unavailable }: { defaults: { name: string; email: string; phone: string }; unavailable: string[] }) {
  const [state, action] = useActionState(createBuildProjectAction, null)
  const [step, setStep] = useState(0)
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {}
  useEffect(() => {
    if (state && !state.ok) {
      const first = Object.keys(state.fieldErrors ?? {}).map((k) => FIELD_STEP[k]).filter((n) => n !== undefined)
      if (first.length) setStep(Math.min(...first))
    }
    if (state?.ok) track('enquiry_submitted', { target_type: 'build_project', intent: 'quote' })
  }, [state])

  if (state?.ok)
    return (
      <div className="rounded-lg bg-green-tint p-6 text-center" role="status">
        <CircleCheck className="mx-auto size-10 text-green" aria-hidden />
        <h2 className="hl-h3 mt-3">Your project {state.data.reference} has started</h2>
        <p className="mt-2 text-muted">We have created the linked requests. Follow everything on your project page.</p>
        <ButtonLink href={`/account/projects/${state.data.id}`} className="mt-4">
          Open my project
        </ButtonLink>
      </div>
    )

  const panel = (i: number) => cn('space-y-4', step !== i && 'hidden')
  return (
    <NoResetForm action={action} className="space-y-6" noValidate>
      <Honeypot />
      <ol className="grid grid-cols-4 gap-2" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={step === i ? 'step' : undefined} className={cn('rounded-md border px-2 py-2 text-center text-caption font-semibold', step === i ? 'border-ink bg-ink text-white' : i < step ? 'border-green bg-green-tint text-green-darker' : 'border-border text-muted')}>
            <span className="block">{i + 1}</span>
            <span className="hidden sm:block">{s}</span>
          </li>
        ))}
      </ol>
      <h2 className="hl-h3">
        Step {step + 1}: {STEPS[step]}
      </h2>
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}

      <div className={panel(0)}>
        <Field label="Name your project" htmlFor="bp-title" error={errors.title} hint="For example: Family house in Gerji" required>
          <Input id="bp-title" name="title" maxLength={160} invalid={Boolean(errors.title)} aria-describedby={describedBy('bp-title', errors.title, 'hint')} />
        </Field>
        <Field label="Where is the plot?" htmlFor="bp-loc" error={errors.location_id} hint="City, sub-city or area in Ethiopia." required>
          <Combobox id="bp-loc" name="location_id" endpoint="/api/locations" invalid={Boolean(errors.location_id)} describedById={describedBy('bp-loc', errors.location_id, 'hint')} />
        </Field>
        <Field label="Plot address or landmark" htmlFor="bp-loctext" optional>
          <Input id="bp-loctext" name="location_text" maxLength={200} />
        </Field>
        <Field label="Plot size (m²)" htmlFor="bp-size" error={errors.plot_size_m2} optional>
          <Input id="bp-size" name="plot_size_m2" inputMode="decimal" invalid={Boolean(errors.plot_size_m2)} />
        </Field>
      </div>

      <div className={panel(1)}>
        <Field label="How many floors above the ground floor?" htmlFor="bp-floors" error={errors.floors} hint="0 for a ground-floor building (G), 1 for G+1, and so on." optional>
          <Input id="bp-floors" name="floors" inputMode="numeric" maxLength={2} invalid={Boolean(errors.floors)} />
        </Field>
        <Field label="Budget" htmlFor="bp-budget" error={errors.budget_band} required>
          <Select id="bp-budget" name="budget_band" defaultValue="" invalid={Boolean(errors.budget_band)}>
            <option value="" disabled>
              Choose…
            </option>
            {BUDGET_BANDS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="When do you want to start?" htmlFor="bp-time" error={errors.timeline} required>
          <Select id="bp-time" name="timeline" defaultValue="" invalid={Boolean(errors.timeline)}>
            <option value="" disabled>
              Choose…
            </option>
            {TIMELINES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tell us about the building" htmlFor="bp-details" optional hint="Rooms, use (home, rental, shop), finishing level, anything already done.">
          <Textarea id="bp-details" name="details" rows={4} maxLength={4000} />
        </Field>
      </div>

      <fieldset className={panel(2)}>
        <legend className="sr-only">What you need</legend>
        {errors.services && <p className="text-small text-error">{errors.services}</p>}
        <ul className="grid gap-3 sm:grid-cols-2">
          {PROJECT_SERVICES.map((s) => (
            <li key={s.value}>
              <label className="flex h-full min-h-14 cursor-pointer items-start gap-3 rounded-lg border border-border-strong p-4 has-[:checked]:border-green has-[:checked]:bg-green-tint">
                <input type="checkbox" name="services" value={s.value} className="mt-1 size-5 accent-green" />
                <span>
                  <span className="block font-semibold text-ink">{s.label}</span>
                  <span className="block text-small text-muted">{s.text}</span>
                  {unavailable.includes(s.value) && <span className="mt-1 block text-caption text-gold-dark">Not available yet: we will record your interest.</span>}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className={panel(3)}>
        <Field label="Your name" htmlFor="bp-name" error={errors.name} required>
          <Input id="bp-name" name="name" defaultValue={defaults.name} autoComplete="name" invalid={Boolean(errors.name)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" htmlFor="bp-phone" error={errors.phone} required>
            <PhoneInput id="bp-phone" name="phone" defaultValue={defaults.phone} invalid={Boolean(errors.phone)} describedById={describedBy('bp-phone', errors.phone)} />
          </Field>
          <Field label="Email" htmlFor="bp-email" error={errors.email} required>
            <Input id="bp-email" name="email" type="email" defaultValue={defaults.email} autoComplete="email" invalid={Boolean(errors.email)} />
          </Field>
        </div>
        <Field label="Country you live in" htmlFor="bp-country" error={errors.country_code} required>
          <Select id="bp-country" name="country_code" defaultValue="ET">
            {[...COUNTRIES, OTHER_COUNTRY].map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <TimeZoneFields idPrefix="bp" />
        <Turnstile action="project" />
      </div>

      <div className="flex gap-3">
        {step > 0 && (
          <Button type="button" variant="secondary" className="flex-1" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button type="button" className="flex-1" onClick={() => setStep(step + 1)}>
            Next
          </Button>
        ) : (
          <SubmitButton className="flex-1" pendingText="Starting your project…">
            Start my project
          </SubmitButton>
        )}
      </div>
      <p className="text-caption text-muted">
        We share your brief only with providers HagerLand matches to your project. See our{' '}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </NoResetForm>
  )
}
