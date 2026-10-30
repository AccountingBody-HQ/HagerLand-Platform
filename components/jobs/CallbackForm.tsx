'use client'

import { useActionState, useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { submitCallbackAction, type CallbackFormState } from '@/app/actions/callback-actions'
import { Checkbox, Field, Input, Select, Textarea, describedBy } from '@/components/ui/Field'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { FormAlert, Honeypot, SubmitButton, TransferConsent } from '@/components/forms/FormParts'
import { Turnstile } from '@/components/forms/Turnstile'
import { NoResetForm } from '@/components/forms/NoResetForm'
import { useJobsI18n } from '@/lib/i18n/client'
import { CALLBACK_LANGUAGES, CALLBACK_TEXT, CALLBACK_TIMES } from '@/lib/callbacks'
import { ChoiceChips } from './ChoiceChips'
import { TRANSFER_CONSENT_TEXT } from '@/lib/data-transfer'

/** "Ask for a call" (Jobs Phase 5, AB's approved wording W10–W14). `countries`: the existing "outside Ethiopia" list. */
export function CallbackForm({ countries }: { countries: { code: string; name: string }[] }) {
  const [state, action] = useActionState<CallbackFormState, FormData>(submitCallbackAction, null)
  const [abroad, setAbroad] = useState(false)
  const { t } = useJobsI18n()
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  const bad = (k: string) => k in errors

  if (state?.ok) {
    return (
      <div className="rounded-lg bg-green-tint p-5 text-center" role="status">
        <CircleCheck className="mx-auto size-10 text-green" aria-hidden />
        <p className="mt-3">{state.data.message}</p>
      </div>
    )
  }

  return (
    <NoResetForm action={action} className="space-y-5">
      <Honeypot />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      <Field label={t(CALLBACK_TEXT.name)} htmlFor="cb-name" error={errors.name || undefined} required>
        <Input id="cb-name" name="name" autoComplete="name" maxLength={120} required invalid={bad('name')} aria-describedby={describedBy('cb-name', errors.name || undefined)} />
      </Field>
      <Field label={t(CALLBACK_TEXT.phone)} htmlFor="cb-phone" error={errors.phone || undefined} required>
        <PhoneInput id="cb-phone" name="phone" required invalid={bad('phone')} describedById={describedBy('cb-phone', errors.phone || undefined)} />
      </Field>
      <Field label={t(CALLBACK_TEXT.need)} htmlFor="cb-need" required hint={t(CALLBACK_TEXT.needHint)}>
        <Textarea id="cb-need" name="need" rows={3} maxLength={500} required invalid={bad('need')} aria-describedby={describedBy('cb-need', undefined, 'hint')} />
      </Field>
      <Field label={t(CALLBACK_TEXT.area)} htmlFor="cb-area" required>
        <Input id="cb-area" name="area" maxLength={200} required invalid={bad('area')} />
      </Field>
      <ChoiceChips legend={t(CALLBACK_TEXT.language)} name="language" options={CALLBACK_LANGUAGES.map((o) => ({ value: o.value, label: t(o.label) }))} defaultValue="am" invalid={bad('language')} />
      <ChoiceChips legend={t(CALLBACK_TEXT.time)} name="time_of_day" options={CALLBACK_TIMES.map((o) => ({ value: o.value, label: t(o.label) }))} defaultValue="any" invalid={bad('time_of_day')} />
      <div className="space-y-3">
        <Checkbox id="cb-abroad" name="based_abroad" label={t(CALLBACK_TEXT.abroad)} checked={abroad} onChange={(e) => setAbroad(e.target.checked)} />
        {abroad && (
          <Field label={t(CALLBACK_TEXT.country)} htmlFor="cb-country" required>
            <Select id="cb-country" name="country_code" defaultValue="" invalid={bad('country_code')}>
              <option value="" disabled>
                —
              </option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      <div className={bad('consent') ? 'rounded-md ring-2 ring-error' : undefined}>
        <Checkbox id="cb-consent" name="consent" label={t(CALLBACK_TEXT.consent)} required aria-invalid={bad('consent') || undefined} />
      </div>
      <TransferConsent error={errors.transfer_consent} label={t(TRANSFER_CONSENT_TEXT)} />
      <Turnstile action="job_callback" />
      <SubmitButton fullWidth size="lg" pendingText={t('Sending…')}>
        {t(CALLBACK_TEXT.submit)}
      </SubmitButton>
    </NoResetForm>
  )
}
