'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import { ok, type ActionResult } from '@/lib/action-result'
import { transferConsentMissing } from '@/lib/data-transfer'
import { accountConsented, recordTransferConsent } from '@/lib/data-transfer-server'

/** QC-2: an existing account confirms the data-transfer notice (W17). Saving it makes the notice disappear. */
export async function confirmAccountConsentAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser('/account')
  const noConsent = transferConsentMissing(formData)
  if (noConsent) return noConsent
  if (!(await accountConsented(user.id))) await recordTransferConsent({ form: 'account_notice', subjectTable: 'profiles', subjectId: user.id })
  revalidatePath('/account', 'layout')
  return ok(undefined)
}
