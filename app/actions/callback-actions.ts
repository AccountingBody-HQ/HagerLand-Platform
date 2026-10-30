'use server'

import { headers } from 'next/headers'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { getClientIp, hashIp } from '@/lib/security'
import { rateLimit } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { readJobsSwitches } from '@/lib/jobs-switches'
import { CALLBACK_LIMITS, CALLBACK_TEXT, callbackFieldErrors, callbackSchema } from '@/lib/callbacks'
import { submitCallback } from '@/lib/callbacks-data'
import { getJobsI18n } from '@/lib/i18n/server'
import { translateResult } from '@/lib/i18n/translate'
import { spamCheckDrop } from '@/lib/spam-check'
import { transferConsentMissing } from '@/lib/data-transfer'
import { recordTransferConsent } from '@/lib/data-transfer-server'

export type CallbackFormState = ActionResult<{ message: string }> | null

/**
 * "Ask for a call" (Jobs Phase 5): only while the owner's call-back switch is on. Limits: 3 an hour and 10 a day per
 * connection; per phone one open request and 2 a week. A blocked or repeat number gets the same thank-you (W13) and no
 * new row. Nothing is emailed or texted to anyone.
 */
async function submitCallbackActionImpl(_prev: CallbackFormState, formData: FormData): Promise<CallbackFormState> {
  if (await spamCheckDrop(formData, 'submit_callback')) return ok({ message: CALLBACK_TEXT.thanks })
  const noConsent = transferConsentMissing(formData)
  if (noConsent) return noConsent
  if (!(await readJobsSwitches()).callbacks) return fail(CALLBACK_TEXT.unavailable)
  const parsed = callbackSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return fail(CALLBACK_TEXT.check, callbackFieldErrors(parsed.error))
  const ip = getClientIp(await headers())
  const ipHash = hashIp(ip)
  const [hour, day] = await Promise.all([rateLimit(`callback:ip:h:${ipHash}`, CALLBACK_LIMITS.hour, 3600), rateLimit(`callback:ip:d:${ipHash}`, CALLBACK_LIMITS.day, 86_400)])
  if (!hour.allowed || !day.allowed) return fail(CALLBACK_TEXT.tooMany)
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, ip))) return fail(CALLBACK_TEXT.security)
  const result = await submitCallback(parsed.data, ipHash)
  if (result === 'error') return fail(CALLBACK_TEXT.unavailable)
  await recordTransferConsent({ form: 'callback', subjectTable: 'callback_requests', subjectId: null, subjectReference: null })
  return ok({ message: CALLBACK_TEXT.thanks })
}

// Jobs Phase 5: the messages in the visitor's language (Amharic for Jobs: only native-reviewed text; English unchanged).
export async function submitCallbackAction(_prev: CallbackFormState, formData: FormData): Promise<CallbackFormState> {
  return translateResult(await submitCallbackActionImpl(_prev, formData), (await getJobsI18n()).t)
}
