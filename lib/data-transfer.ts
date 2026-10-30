// QC-2 (W17, AB's LR-1 decision): the shared, required tick for storing a person's details outside Ethiopia, its
// field error and its version. Pure (no server code): used by every public form, its server action and the tests.
import { fail } from '@/lib/action-result'

export const TRANSFER_CONSENT_FIELD = 'transfer_consent'
export const TRANSFER_CONSENT_TEXT = 'I agree that HagerLand stores my details on secure servers outside Ethiopia (mainly in the European Union) to provide this service.'
export const TRANSFER_CONSENT_ERROR = 'Tick the box to continue.'
export const TRANSFER_CONSENT_VERSION = 'w17-2026-10'

/** The account notice (QC-2 2.5, approved wording). */
export const ACCOUNT_CONSENT_TEXT = {
  heading: 'To keep using your account, please confirm:',
  button: 'Confirm',
  refusal: 'Please confirm the notice at the top of your account first.',
} as const

/** True when the form's tick was ticked (a checkbox sends "on"; "true" is accepted too). */
export function transferConsentGiven(formData: FormData): boolean {
  const v = formData.get(TRANSFER_CONSENT_FIELD)
  return v === 'on' || v === 'true'
}

/** The form's normal field error when the tick is missing, otherwise null (checked on the server, never trusted). */
export function transferConsentMissing(formData: FormData): ReturnType<typeof fail> | null {
  if (transferConsentGiven(formData)) return null
  return fail('Please check the highlighted fields.', { [TRANSFER_CONSENT_FIELD]: TRANSFER_CONSENT_ERROR })
}
