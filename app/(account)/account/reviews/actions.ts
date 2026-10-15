'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getActiveMembership, requireUser } from '@/lib/auth'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { REVIEWS_TAG } from '@/lib/data/reviews'

/** The business replies once to a published review (spec 26.12). Owners and admins of the business only. */
export async function replyToReviewAction(reviewId: string, _prev: ActionResult<{ message: string }> | null, formData: FormData): Promise<ActionResult<{ message: string }>> {
  await requireUser('/account/reviews')
  const active = await getActiveMembership()
  if (!active || !['owner', 'admin'].includes(active.role)) return fail('Only owners and admins of the business can reply.')
  const p = z.object({ id: z.uuid(), reply: z.string().trim().min(2, 'Write your reply').max(1000, 'Use 1,000 characters or fewer') }).safeParse({ id: reviewId, reply: formData.get('reply') })
  if (!p.success) return invalid(p.error)
  const db = getAdminSupabase()
  const { data, error } = await db.from('reviews').update({ provider_reply: p.data.reply, replied_at: new Date().toISOString() }).eq('id', reviewId).eq('org_id', active.org.id).eq('status', 'published').is('provider_reply', null).select('id').maybeSingle()
  if (error || !data) return fail('You have already replied to this review, or it is not yours.')
  revalidateTag(REVIEWS_TAG)
  revalidatePath('/account/reviews')
  return ok({ message: 'Reply published.' })
}
