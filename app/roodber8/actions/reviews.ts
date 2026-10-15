'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15). */
const AREA = '/roodber8/reviews'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { orgManagerEmails } from '@/lib/enquiries'
import { sendEmail } from '@/lib/email/send'
import { renderEmail } from '@/lib/email/layout'
import { canonicalUrl } from '@/lib/site'
import { REVIEWS_TAG } from '@/lib/data/reviews'

type Msg = ActionResult<{ message: string }>

/** Publishes or rejects a review (spec 26.12). Publishing tells the business, who may reply once. */
export async function moderateReviewAction(id: string, decision: 'publish' | 'reject', reason?: string): Promise<Msg> {
  await assertAdmin(AREA)
  const p = z.object({ id: z.uuid(), decision: z.enum(['publish', 'reject']), reason: z.string().trim().max(300).optional() }).safeParse({ id, decision, reason })
  if (!p.success) return fail('Invalid.')
  if (p.data.decision === 'reject' && !p.data.reason) return fail('Give a reason for rejecting (kept private).')
  const db = getAdminSupabase()
  const { data: r } = await db.from('reviews').select('status, org_id, rating, org:organisations(name, slug)').eq('id', id).maybeSingle()
  if (!r) return fail('Not found.')
  if (r.status !== 'pending') return fail('This review has already been moderated.')
  const now = new Date().toISOString()
  const patch = p.data.decision === 'publish' ? { status: 'published', moderated_at: now, published_at: now } : { status: 'rejected', moderated_at: now, rejection_reason: p.data.reason ?? null }
  const { error } = await db.from('reviews').update(patch).eq('id', id).eq('status', 'pending')
  if (error) return fail('Could not save.')
  const org = Array.isArray(r.org) ? r.org[0] : r.org
  if (p.data.decision === 'publish') {
    const to = await orgManagerEmails(r.org_id)
    if (to.length)
      await sendEmail({
        to,
        ...renderEmail({
          subject: `New review on HagerLand: ${r.rating} of 5`,
          preheader: `A customer reviewed ${org?.name ?? 'your business'}.`,
          heading: 'You have a new review',
          paragraphs: [`A customer who chose ${org?.name ?? 'your business'} through HagerLand has left a review. It is now on your profile. You can reply once, from your account.`],
          button: { label: 'Read and reply', href: canonicalUrl('/account/reviews') },
          reason: 'You are receiving this because you manage a business on HagerLand.',
        }),
      })
  }
  await audit(`review.${p.data.decision}`, { type: 'review', id, label: org?.name ?? null }, { rating: r.rating, reason: p.data.reason ?? null })
  revalidateTag(REVIEWS_TAG)
  if (org?.slug) revalidatePath(`/company/${org.slug}`)
  revalidatePath('/roodber8/reviews')
  return ok({ message: p.data.decision === 'publish' ? 'Published.' : 'Rejected.' })
}
