'use client'

import { useActionState } from 'react'
import { confirmAccountConsentAction } from '@/app/(account)/account/consent-actions'
import { NoResetForm } from '@/components/forms/NoResetForm'
import { FormAlert, SubmitButton, TransferConsent } from '@/components/forms/FormParts'
import { ACCOUNT_CONSENT_TEXT } from '@/lib/data-transfer'

/** QC-2: shown at the top of every account page until the account has confirmed the data-transfer notice. */
export function AccountConsentNotice() {
  const [state, action] = useActionState(confirmAccountConsentAction, null)
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {}
  return (
    <section aria-labelledby="account-consent-h" className="mb-6 rounded-lg border border-gold bg-gold-soft p-4" data-testid="account-consent-notice">
      <h2 id="account-consent-h" className="font-semibold text-ink">
        {ACCOUNT_CONSENT_TEXT.heading}
      </h2>
      <NoResetForm action={action} className="mt-2 space-y-3" noValidate>
        {state && !state.ok && !errors.transfer_consent && <FormAlert>{state.error}</FormAlert>}
        <TransferConsent error={errors.transfer_consent} />
        <SubmitButton size="sm">{ACCOUNT_CONSENT_TEXT.button}</SubmitButton>
      </NoResetForm>
    </section>
  )
}
