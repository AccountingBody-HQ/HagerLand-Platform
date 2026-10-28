'use client'

import { useActionState, useState } from 'react'
import { FileText } from 'lucide-react'
import { saveCandidateProfileAction } from '@/app/actions/job-actions'
import { Checkbox, Field, Input, Radio, Select, Textarea, describedBy } from '@/components/ui/Field'
import { Combobox, type ComboOption } from '@/components/ui/Combobox'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import { FileDrop } from '@/components/media/FileDrop'
import { AVAILABILITY } from '@/lib/jobs'
import type { ActionResult } from '@/lib/action-result'
import { NoResetForm } from '@/components/forms/NoResetForm'
import { useJobsI18n } from '@/lib/i18n/client'

export interface CandidateDefaults {
  full_name: string
  headline: string | null
  skills: string[]
  qualifications: string | null
  experience_years: number | null
  experience: string | null
  availability: string
  location: ComboOption | null
  cv_path: string | null
  visibility: string
  placement_wanted: boolean
}

/** Candidate profile (spec 24.9): private by default; the candidate chooses whether employers can find it. */
export function CandidateForm({ userId, defaults }: { userId: string; defaults: CandidateDefaults }) {
  const [state, action] = useActionState<ActionResult<{ message: string }> | null, FormData>(saveCandidateProfileAction, null)
  const { t } = useJobsI18n()
  const [cv, setCv] = useState<{ path: string; name: string } | null>(defaults.cv_path ? { path: defaults.cv_path, name: t('Your saved CV') } : null)
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  return (
    <NoResetForm action={action} className="space-y-5" noValidate>
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      {state?.ok && <FormAlert tone="success">{state.data.message}</FormAlert>}
      <input type="hidden" name="cv_path" value={cv?.path ?? ''} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t('Full name')} htmlFor="cp-name" required error={errors.full_name}>
          <Input id="cp-name" name="full_name" defaultValue={defaults.full_name} autoComplete="name" maxLength={120} required invalid={Boolean(errors.full_name)} />
        </Field>
        <Field label={t('Headline')} htmlFor="cp-headline" optional hint={t('e.g. Civil engineer, 8 years on high-rise projects')} error={errors.headline}>
          <Input id="cp-headline" name="headline" defaultValue={defaults.headline ?? ''} maxLength={160} invalid={Boolean(errors.headline)} />
        </Field>
      </div>
      <Field label={t('Skills and trades')} htmlFor="cp-skills" optional hint={t('Separate with commas, e.g. AutoCAD, site supervision, formwork')} error={errors.skills}>
        <Input id="cp-skills" name="skills" defaultValue={defaults.skills.join(', ')} maxLength={1200} invalid={Boolean(errors.skills)} />
      </Field>
      <Field label={t('Qualifications')} htmlFor="cp-quals" optional hint={t('Degrees, diplomas, licences and certificates.')} error={errors.qualifications}>
        <Textarea id="cp-quals" name="qualifications" rows={3} maxLength={2000} defaultValue={defaults.qualifications ?? ''} invalid={Boolean(errors.qualifications)} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
        <Field label={t('Years of experience')} htmlFor="cp-years" optional error={errors.experience_years}>
          <Input id="cp-years" name="experience_years" type="number" inputMode="numeric" min={0} max={60} defaultValue={defaults.experience_years ?? ''} invalid={Boolean(errors.experience_years)} />
        </Field>
        <Field label={t('Availability')} htmlFor="cp-avail" required error={errors.availability}>
          <Select id="cp-avail" name="availability" defaultValue={defaults.availability}>
            {AVAILABILITY.map((a) => (
              <option key={a.value} value={a.value}>
                {t(a.label)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t('Experience')} htmlFor="cp-exp" optional hint={t('Recent roles and projects.')} error={errors.experience}>
        <Textarea id="cp-exp" name="experience" rows={5} maxLength={4000} defaultValue={defaults.experience ?? ''} invalid={Boolean(errors.experience)} />
      </Field>
      <Field label={t('Where are you based?')} htmlFor="cp-loc" optional hint={t('A city in Ethiopia or abroad.')} error={errors.location_id}>
        <Combobox id="cp-loc" name="location_id" endpoint="/api/locations?scope=all" defaultValue={defaults.location} describedById={describedBy('cp-loc', errors.location_id, 'hint')} />
      </Field>
      <fieldset className="space-y-3">
        <legend className="mb-1 font-semibold">
          {t('CV')} <span className="font-normal text-muted">{t('(optional)')}</span>
        </legend>
        {cv ? (
          <p className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-stone-50 px-3 py-2 text-small">
            <FileText className="size-4 text-green" aria-hidden /> <span className="flex-1 truncate">{cv.name}</span>
            {cv.path === defaults.cv_path && (
              <>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- opens a file from a route handler, not a page */}
                <a href="/account/cv/profile" className="inline-flex min-h-11 items-center px-2 font-semibold text-green">
                  {t('Open')}
                </a>
              </>
            )}
            <button type="button" className="min-h-11 px-2 font-semibold text-error" onClick={() => setCv(null)}>
              {t('Remove')}
            </button>
          </p>
        ) : (
          <FileDrop
            target={{ purpose: 'private', area: 'cv', id: userId }}
            accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx"
            multiple={false}
            label={t('Upload your CV')}
            hint={t('PDF or Word (.docx), up to 15 MB')}
            onDocUploaded={(d) => setCv({ path: d.path, name: d.name })}
          />
        )}
        {errors.cv_path && <p className="text-small text-error">{errors.cv_path}</p>}
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="mb-1 font-semibold">{t('Who can see your profile?')}</legend>
        <Radio id="cp-vis-private" name="visibility" value="private" defaultChecked={defaults.visibility !== 'employers'} label={t('Only me')} description={t('Use it to apply for jobs faster. Nobody else can see it.')} />
        <Radio
          id="cp-vis-employers"
          name="visibility"
          value="employers"
          defaultChecked={defaults.visibility === 'employers'}
          label={t('Verified businesses and employers with an approved job')}
          description={t('They see your first name, headline, skills, qualifications and experience. Never your contact details or CV: HagerLand asks you before any introduction.')}
        />
      </fieldset>
      <Checkbox id="cp-placement" name="placement_wanted" label={t('Register me for placement help')} description={t('HagerLand may contact you about suitable roles from our recruitment requests. We introduce you to an employer only after you agree.')} defaultChecked={defaults.placement_wanted} />
      <SubmitButton pendingText={t('Saving…')}>{t('Save profile')}</SubmitButton>
    </NoResetForm>
  )
}
