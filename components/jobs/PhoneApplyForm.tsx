'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { CircleCheck } from 'lucide-react'
import { applyByPhoneAction, type PhoneFormState } from '@/app/actions/job-phone-actions'
import { Checkbox, Field, Input, Select, describedBy } from '@/components/ui/Field'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { FormAlert, Honeypot, SubmitButton, TransferConsent } from '@/components/forms/FormParts'
import { Turnstile } from '@/components/forms/Turnstile'
import { NoResetForm } from '@/components/forms/NoResetForm'
import { useJobsI18n } from '@/lib/i18n/client'
import { TRADES } from '@/lib/jobs'
import { CONTACT_METHODS, LANGUAGES } from '@/lib/jobs-phone'
import { ChoiceChips } from './ChoiceChips'
import { TRANSFER_CONSENT_TEXT } from '@/lib/data-transfer'

/** Apply by phone (Jobs Phase 2): no account or email; both ticks are required (W-A). */
export function PhoneApplyForm({ jobId }: { jobId: string }) {
  const [state, action] = useActionState<PhoneFormState, FormData>(applyByPhoneAction, null)
  const { t } = useJobsI18n()
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  const bad = (k: string) => k in errors

  if (state?.ok) {
    return (
      <div className="rounded-lg bg-green-tint p-5 text-center" role="status">
        <CircleCheck className="mx-auto size-10 text-green" aria-hidden />
        <h2 className="hl-h3 mt-3">{t('Application sent')}</h2>
        <p className="mt-2 text-muted">{t('Your reference is {reference}. Keep it in case you need to contact HagerLand. The employer will contact you if they want to talk.').replace('{reference}', state.data.reference)}</p>
      </div>
    )
  }

  return (
    <NoResetForm action={action} className="space-y-5">
      <input type="hidden" name="job_id" value={jobId} />
      <Honeypot />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      <Field label={t('Your name')} htmlFor="pa-name" error={errors.name || undefined} required>
        <Input id="pa-name" name="name" autoComplete="name" maxLength={120} required invalid={bad('name')} aria-describedby={describedBy('pa-name', errors.name || undefined)} />
      </Field>
      <Field label={t('Phone number')} htmlFor="pa-phone" error={errors.phone || undefined} required hint={t('For example 0911 234 567')}>
        <PhoneInput id="pa-phone" name="phone" required invalid={bad('phone')} describedById={describedBy('pa-phone', errors.phone || undefined, 'hint')} />
      </Field>
      <Field label={t('Your trade')} htmlFor="pa-trade" required>
        <Select id="pa-trade" name="trade" defaultValue="" required invalid={bad('trade')}>
          <option value="">{t('Choose…')}</option>
          {TRADES.map((tr) => (
            <option key={tr.value} value={tr.value}>
              {t(tr.label)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t('Where do you live or work?')} htmlFor="pa-area" required hint={t('City, sub-city or area')}>
        <Input id="pa-area" name="area" maxLength={200} required invalid={bad('area')} aria-describedby={describedBy('pa-area', undefined, 'hint')} />
      </Field>
      <ChoiceChips legend={t('How should they contact you?')} name="preferred_contact" options={CONTACT_METHODS.map((o) => ({ value: o.value, label: t(o.label) }))} defaultValue="call" invalid={bad('preferred_contact')} />
      <ChoiceChips legend={t('Language')} name="language" options={LANGUAGES.map((o) => ({ value: o.value, label: t(o.label) }))} defaultValue="am" invalid={bad('language')} />
      <div className={bad('adult') || bad('consent') ? 'rounded-md ring-2 ring-error' : undefined}>
        <Checkbox id="pa-adult" name="adult" label={t('I am 18 or older')} required aria-invalid={bad('adult') || undefined} />
        <Checkbox id="pa-consent" name="consent" label={t('I agree that HagerLand shares my name, phone, trade and area with this employer so they can contact me about this job.')} required aria-invalid={bad('consent') || undefined} />
      </div>
      <TransferConsent error={errors.transfer_consent} label={t(TRANSFER_CONSENT_TEXT)} />
      <Turnstile action="job_phone_apply" />
      <SubmitButton fullWidth size="lg" pendingText={t('Sending…')}>
        {t('Send my application')}
      </SubmitButton>
      <p className="text-small text-muted">
        {t('Never pay anyone to get a job.')}{' '}
        <Link href="/privacy" className="underline">
          {t('See our Privacy Policy.')}
        </Link>
      </p>
    </NoResetForm>
  )
}
