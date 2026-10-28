'use client'

import { useActionState, useState } from 'react'
import { FileText } from 'lucide-react'
import { applyForJobAction, type ApplyState } from '@/app/actions/job-actions'
import { Checkbox, Field, Input, Textarea } from '@/components/ui/Field'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import { FileDrop } from '@/components/media/FileDrop'
import { NoResetForm } from '@/components/forms/NoResetForm'
import { useJobsI18n } from '@/lib/i18n/client'

/** Apply with a CV (PDF or Word, private) and a cover note (spec 24.9). */
export function ApplyForm({ jobId, userId, defaults }: { jobId: string; userId: string; defaults: { name: string; email: string; phone: string; profileCv: string | null } }) {
  const [state, action] = useActionState<ApplyState, FormData>(applyForJobAction, null)
  const [useProfileCv, setUseProfileCv] = useState(Boolean(defaults.profileCv))
  const [uploaded, setUploaded] = useState<{ path: string; name: string } | null>(null)
  const { t } = useJobsI18n()
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  const cvPath = useProfileCv && defaults.profileCv ? defaults.profileCv : uploaded?.path ?? ''
  return (
    <NoResetForm action={action} className="space-y-5" noValidate>
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="cv_path" value={cvPath} />
      <Field label={t('Full name')} htmlFor="ap-name" required error={errors.name}>
        <Input id="ap-name" name="name" defaultValue={defaults.name} autoComplete="name" maxLength={120} required invalid={Boolean(errors.name)} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t('Email')} htmlFor="ap-email" required error={errors.email}>
          <Input id="ap-email" name="email" type="email" defaultValue={defaults.email} autoComplete="email" required invalid={Boolean(errors.email)} />
        </Field>
        <Field label={t('Phone')} htmlFor="ap-phone" optional error={errors.phone}>
          <Input id="ap-phone" name="phone" type="tel" defaultValue={defaults.phone} autoComplete="tel" invalid={Boolean(errors.phone)} />
        </Field>
      </div>
      <Field label={t('Cover note')} htmlFor="ap-note" optional hint={t('Why you are a good fit, in a few sentences.')} error={errors.cover_note}>
        <Textarea id="ap-note" name="cover_note" rows={5} maxLength={3000} invalid={Boolean(errors.cover_note)} />
      </Field>
      <fieldset className="space-y-3">
        <legend className="mb-1 font-semibold">{t('Your CV (optional)')}</legend>
        {defaults.profileCv && <Checkbox id="ap-profile-cv" label={t('Send the CV saved in my candidate profile')} checked={useProfileCv} onChange={(e) => setUseProfileCv(e.target.checked)} />}
        {!useProfileCv &&
          (uploaded ? (
            <p className="flex items-center gap-2 rounded-md border border-border bg-stone-50 px-3 py-2 text-small">
              <FileText className="size-4 text-green" aria-hidden /> <span className="flex-1 truncate">{uploaded.name}</span>
              <button type="button" className="min-h-11 px-2 font-semibold text-green" onClick={() => setUploaded(null)}>
                {t('Change')}
              </button>
            </p>
          ) : (
            <FileDrop
              target={{ purpose: 'private', area: 'cv', id: userId }}
              accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx"
              multiple={false}
              label={t('Upload your CV')}
              hint={t('PDF or Word (.docx), up to 15 MB')}
              onDocUploaded={(d) => setUploaded({ path: d.path, name: d.name })}
            />
          ))}
        {errors.cv_path && <p className="text-small text-error">{errors.cv_path}</p>}
        <p className="text-small text-muted">{t('Your CV is never public. Only this employer and HagerLand can open it.')}</p>
      </fieldset>
      <SubmitButton size="lg" className="w-full sm:w-auto" pendingText={t('Sending…')}>
        {t('Send application')}
      </SubmitButton>
    </NoResetForm>
  )
}
