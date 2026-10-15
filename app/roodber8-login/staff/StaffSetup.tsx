'use client'

import { useActionState } from 'react'
import { confirmStaffSetupAction, startStaffSetupAction } from '../staff-actions'
import { Field, Input } from '@/components/ui/Field'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import { NoResetForm } from '@/components/forms/NoResetForm'

/** Two steps: choose a password, then connect an authenticator app and confirm a code (spec 26.15). */
export function StaffSetup({ token }: { token: string }) {
  const [step1, start] = useActionState(startStaffSetupAction.bind(null, token), null)
  const [step2, confirm] = useActionState(confirmStaffSetupAction.bind(null, token), null)
  const e1 = step1 && !step1.ok ? (step1.fieldErrors ?? {}) : {}
  if (!step1?.ok)
    return (
      <NoResetForm action={start} className="space-y-4" noValidate>
        {step1 && !step1.ok && <FormAlert>{step1.error}</FormAlert>}
        <Field label="Choose a password" htmlFor="ss-pass" error={e1.password} hint="At least 10 characters.">
          <Input id="ss-pass" name="password" type="password" autoComplete="new-password" invalid={Boolean(e1.password)} />
        </Field>
        <Field label="Type it again" htmlFor="ss-confirm" error={e1.confirm}>
          <Input id="ss-confirm" name="confirm" type="password" autoComplete="new-password" invalid={Boolean(e1.confirm)} />
        </Field>
        <SubmitButton fullWidth pendingText="Saving…">
          Continue
        </SubmitButton>
      </NoResetForm>
    )
  return (
    <NoResetForm action={confirm} className="space-y-4" noValidate>
      {step2 && !step2.ok && <FormAlert>{step2.error}</FormAlert>}
      <p className="text-small">Add this account to your authenticator app (for example Google Authenticator or Microsoft Authenticator): choose “enter a setup key” and type the key below, or open the link on your phone.</p>
      <p className="break-all rounded-md bg-stone-100 p-3 text-center font-mono text-body tracking-wider" data-testid="totp-secret">
        {step1.data.secret}
      </p>
      <p className="text-center text-small">
        <a href={step1.data.otpauth} className="font-semibold text-green underline">
          Open in my authenticator app
        </a>
      </p>
      <Field label="The 6-digit code your app shows" htmlFor="ss-code">
        <Input id="ss-code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="text-center tracking-[0.3em]" />
      </Field>
      <SubmitButton fullWidth pendingText="Checking…">
        Finish
      </SubmitButton>
    </NoResetForm>
  )
}
