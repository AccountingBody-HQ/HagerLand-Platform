'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15): Owner and Operations. */
const AREA = '/roodber8/jobs'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { adminActor, assertAdmin, assertOwnerOrOperations, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { CALLBACK_OUTCOMES } from '@/lib/callbacks'
import { recordCallbackOutcome } from '@/lib/callbacks-data'

type Msg = ActionResult<{ message: string }>

const MESSAGES: Record<string, string> = {
  no_action: 'Closed: called, no further action.',
  no_answer: 'Try counted.',
  wrong_number: 'Closed: the details were deleted and the number is blocked for 30 days.',
  spam: 'Closed as spam.',
}

/**
 * Records what happened on a call (Jobs Phase 5). "Called — turned into a staffing request" is not here: staff open the
 * staffing form pre-filled from the queue, and sending it closes and links the call-back.
 */
export async function recordCallbackOutcomeAction(id: string, outcome: string): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwnerOrOperations()
  const parsed = z.object({ id: z.uuid(), outcome: z.enum(['no_action', 'no_answer', 'wrong_number', 'spam']) }).safeParse({ id, outcome })
  if (!parsed.success) return fail('Not found.')
  const res = await recordCallbackOutcome(parsed.data.id, parsed.data.outcome, null, await adminActor())
  if (!res.ok) return fail('This request is already closed, or it could not be saved. Refresh the page.')
  await audit('callback.outcome', { type: 'callback', id: parsed.data.id }, { outcome: parsed.data.outcome, closed: res.closed })
  revalidatePath('/roodber8/jobs/callbacks')
  const label = CALLBACK_OUTCOMES.find((o) => o.value === parsed.data.outcome)?.label ?? parsed.data.outcome
  return ok({ message: parsed.data.outcome === 'no_answer' && res.closed ? 'Closed after 3 tries with no answer.' : (MESSAGES[parsed.data.outcome] ?? label) })
}
