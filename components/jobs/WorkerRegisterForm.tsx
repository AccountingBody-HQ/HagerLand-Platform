'use client'

import { useActionState } from 'react'
import { CircleCheck } from 'lucide-react'
import { joinWorkerRegisterAction, type PhoneFormState } from '@/app/actions/job-phone-actions'
import { Checkbox, Field, Input, describedBy } from '@/components/ui/Field'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { FormAlert, Honeypot, SubmitButton, TransferConsent } from '@/components/forms/FormParts'
import { Turnstile } from '@/components/forms/Turnstile'
import { NoResetForm } from '@/components/forms/NoResetForm'
import { useJobsI18n } from '@/lib/i18n/client'
import { TRADES } from '@/lib/jobs'
import { CONTACT_METHODS, LANGUAGES, REGISTER_AVAILABILITY } from '@/lib/jobs-phone'
import { cn } from '@/lib/cn'
import { ChoiceChips } from './ChoiceChips'
import { TRANSFER_CONSENT_TEXT } from '@/lib/data-transfer'

/** "Looking for work? Tell us you're available" (Jobs Phase 2, W-B): staff-only register, no account or email. */
export function WorkerRegisterForm() {
  const [state, action] = useActionState<PhoneFormState, FormData>(joinWorkerRegisterAction, null)
  const { t } = useJobsI18n()
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  const bad = (k: string) => k in errors

  if (state?.ok) {
    return (
      <div className="rounded-lg bg-green-tint p-5 text-center" role="status">
        <CircleCheck className="mx-auto size-10 text-green" aria-hidden />
        <p className="mt-3 text-muted">{t("Thank you. You're on the register. Your reference is {reference}.").replace('{reference}', state.data.reference)}</p>
      </div>
    )
  }

  return (
    <NoResetForm action={action} className="space-y-5">
      <Honeypot />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      <Field label={t('Your name')} htmlFor="wr-name" error={errors.name || undefined} required>
        <Input id="wr-name" name="name" autoComplete="name" maxLength={120} required invalid={bad('name')} aria-describedby={describedBy('wr-name', errors.name || undefined)} />
      </Field>
      <Field label={t('Phone number')} htmlFor="wr-phone" error={errors.phone || undefined} required hint={t('For example 0911 234 567')}>
        <PhoneInput id="wr-phone" name="phone" required invalid={bad('phone')} describedById={describedBy('wr-phone', errors.phone || undefined, 'hint')} />
      </Field>
      <fieldset className={cn(bad('trades') && 'rounded-md ring-2 ring-error')} aria-invalid={bad('trades') || undefined}>
        <legend className="mb-2 text-small font-semibold text-ink">
          {t('Your trades')}
          <span className="text-error" aria-hidden>
            {' '}
            *
          </span>
        </legend>
        <div className="grid gap-x-4 sm:grid-cols-2">
          {TRADES.map((tr) => (
            <Checkbox key={tr.value} id={`wr-trade-${tr.value}`} name="trades" value={tr.value} label={t(tr.label)} />
          ))}
        </div>
      </fieldset>
      <Field label={t('Where do you live or work?')} htmlFor="wr-area" required hint={t('City, sub-city or area')}>
        <Input id="wr-area" name="area" maxLength={200} required invalid={bad('area')} aria-describedby={describedBy('wr-area', undefined, 'hint')} />
      </Field>
      <ChoiceChips legend={t('When can you start?')} name="availability" options={REGISTER_AVAILABILITY.map((o) => ({ value: o.value, label: t(o.label) }))} defaultValue="now" invalid={bad('availability')} />
      <ChoiceChips legend={t('How should we contact you?')} name="preferred_contact" options={CONTACT_METHODS.map((o) => ({ value: o.value, label: t(o.label) }))} defaultValue="call" invalid={bad('preferred_contact')} />
      <ChoiceChips legend={t('Language')} name="language" options={LANGUAGES.map((o) => ({ value: o.value, label: t(o.label) }))} defaultValue="am" invalid={bad('language')} />
      <div className={bad('adult') || bad('consent') ? 'rounded-md ring-2 ring-error' : undefined}>
        <Checkbox id="wr-adult" name="adult" label={t('I am 18 or older')} required aria-invalid={bad('adult') || undefined} />
        <Checkbox
          id="wr-consent"
          name="consent"
          label={t('I agree that HagerLand keeps my details to contact me about work. They are deleted 12 months after I last update them, and HagerLand will ask me before sharing my number with an employer.')}
          required
          aria-invalid={bad('consent') || undefined}
        />
      </div>
      <TransferConsent error={errors.transfer_consent} label={t(TRANSFER_CONSENT_TEXT)} />
      <Turnstile action="worker_register" />
      <SubmitButton fullWidth size="lg" pendingText={t('Sending…')}>
        {t('Join the register')}
      </SubmitButton>
    </NoResetForm>
  )
}
