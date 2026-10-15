'use client'

import { useActionState, useRef } from 'react'
import { NoResetForm, useFormPending } from '@/components/forms/NoResetForm'
import { saveJobAction, type JobState } from '@/app/actions/job-actions'
import { Field, Input, Select, Textarea, describedBy } from '@/components/ui/Field'
import { Combobox, type ComboOption } from '@/components/ui/Combobox'
import { Button } from '@/components/ui/Button'
import { FormAlert } from '@/components/forms/FormParts'
import { EMPLOYMENT_TYPES, JOB_CATEGORIES, SALARY_PERIODS } from '@/lib/jobs'

export interface JobDefaults {
  id?: string
  title?: string
  category?: string
  employment_type?: string
  location?: ComboOption | null
  salary_min?: number | null
  salary_max?: number | null
  salary_period?: string | null
  currency?: string
  description?: string
  requirements?: string | null
  closing_date?: string | null
}

function Buttons({ setIntent }: { setIntent: (v: 'draft' | 'submit') => void }) {
  const pending = useFormPending()
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button type="submit" variant="secondary" className="flex-1" disabled={pending} onClick={() => setIntent('draft')}>
        Save draft
      </Button>
      <Button type="submit" className="flex-1" disabled={pending} onClick={() => setIntent('submit')}>
        {pending ? 'Saving…' : 'Submit for review'}
      </Button>
    </div>
  )
}

/** Post or edit a vacancy (spec 24.9). Salary is optional and shown in the currency of the job's country. */
export function JobForm({ defaults }: { defaults: JobDefaults }) {
  const [state, action] = useActionState<JobState, FormData>(saveJobAction, null)
  const intentRef = useRef<HTMLInputElement>(null)
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  return (
    <NoResetForm action={action} className="space-y-5" noValidate>
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <input ref={intentRef} type="hidden" name="intent" defaultValue="draft" />
      <Field label="Job title" htmlFor="job-title" required error={errors.title}>
        <Input id="job-title" name="title" defaultValue={defaults.title} maxLength={120} required placeholder="e.g. Site engineer" invalid={Boolean(errors.title)} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Category" htmlFor="job-category" required error={errors.category}>
          <Select id="job-category" name="category" defaultValue={defaults.category ?? ''} required invalid={Boolean(errors.category)}>
            <option value="">Choose…</option>
            {JOB_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Type of job" htmlFor="job-type" required error={errors.employment_type}>
          <Select id="job-type" name="employment_type" defaultValue={defaults.employment_type ?? 'full_time'} required invalid={Boolean(errors.employment_type)}>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Where is the job?" htmlFor="job-location" required hint="A city or area in Ethiopia, or a city abroad." error={errors.location_id}>
        <Combobox id="job-location" name="location_id" endpoint="/api/locations?scope=all" defaultValue={defaults.location} invalid={Boolean(errors.location_id)} describedById={describedBy('job-location', errors.location_id, 'hint')} />
      </Field>
      <fieldset className="space-y-3">
        <legend className="font-semibold">
          Salary <span className="font-normal text-muted">(optional)</span>
        </legend>
        <p className="text-small text-muted">In the currency of the country where the job is{defaults.currency ? ` (${defaults.currency})` : ''}. Leave blank to discuss with candidates.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="From" htmlFor="job-smin" error={errors.salary_min}>
            <Input id="job-smin" name="salary_min" type="number" inputMode="numeric" min={0} defaultValue={defaults.salary_min ?? ''} invalid={Boolean(errors.salary_min)} />
          </Field>
          <Field label="To" htmlFor="job-smax" error={errors.salary_max}>
            <Input id="job-smax" name="salary_max" type="number" inputMode="numeric" min={0} defaultValue={defaults.salary_max ?? ''} invalid={Boolean(errors.salary_max)} />
          </Field>
          <Field label="Per" htmlFor="job-speriod" error={errors.salary_period}>
            <Select id="job-speriod" name="salary_period" defaultValue={defaults.salary_period ?? ''} invalid={Boolean(errors.salary_period)}>
              <option value="">Choose…</option>
              {SALARY_PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label.replace('per ', '')}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </fieldset>
      <Field label="Description" htmlFor="job-desc" required hint="The role, the projects, working hours and what you offer." error={errors.description}>
        <Textarea id="job-desc" name="description" rows={8} maxLength={8000} defaultValue={defaults.description} required invalid={Boolean(errors.description)} />
      </Field>
      <Field label="Requirements" htmlFor="job-req" optional hint="Qualifications, licences, experience and skills." error={errors.requirements}>
        <Textarea id="job-req" name="requirements" rows={5} maxLength={4000} defaultValue={defaults.requirements ?? ''} invalid={Boolean(errors.requirements)} />
      </Field>
      <Field label="Closing date" htmlFor="job-close" optional hint="If you leave it blank, the job stays open for 60 days after approval." error={errors.closing_date}>
        <Input id="job-close" name="closing_date" type="date" defaultValue={defaults.closing_date ?? ''} invalid={Boolean(errors.closing_date)} />
      </Field>
      <p className="text-small text-muted">HagerLand reviews every job before it goes live. Do not ask candidates for money: adverts that do are removed.</p>
      <Buttons
        setIntent={(v) => {
          if (intentRef.current) intentRef.current.value = v
        }}
      />
    </NoResetForm>
  )
}
