import { Star } from 'lucide-react'
import { getActiveMembership, requireUser } from '@/lib/auth'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { EmptyState } from '@/components/ui/Layout'
import { ActionForm } from '@/components/forms/ActionForm'
import { Textarea } from '@/components/ui/Field'
import { replyToReviewAction } from './actions'

export const metadata = { title: 'Reviews' }

/** Published reviews of the business, with one reply each (spec 26.12). */
export default async function ReviewsPage() {
  await requireUser('/account/reviews')
  const active = await getActiveMembership()
  const { data } = active ? await getAdminSupabase().from('reviews').select('id, author_name, rating, body, published_at, provider_reply').eq('org_id', active.org.id).eq('status', 'published').order('published_at', { ascending: false }) : { data: [] }
  const rows = data ?? []
  const canReply = Boolean(active && ['owner', 'admin'].includes(active.role))
  return (
    <div>
      <AccountPageHeader title="Reviews" description="Reviews from customers who chose your business through HagerLand. You can reply once to each." />
      {rows.length === 0 ? (
        <EmptyState icon={<Star />} title="No reviews yet" description="When a customer chooses you for a job through HagerLand, they can review you afterwards. Reviews appear here and on your profile once checked." />
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border border-border bg-white p-5">
              <p className="text-small text-muted">
                {r.author_name.split(' ')[0]} · {r.rating} of 5 · {formatDate(r.published_at)}
              </p>
              <p className="mt-2 whitespace-pre-line">{r.body}</p>
              {r.provider_reply ? (
                <p className="mt-3 border-l-4 border-green bg-green-tint p-3 text-small">Your reply: {r.provider_reply}</p>
              ) : canReply ? (
                <ActionForm action={replyToReviewAction.bind(null, r.id)} submitLabel="Publish reply" className="mt-3 grid gap-2">
                  <Textarea aria-label="Your reply" name="reply" rows={2} maxLength={1000} />
                </ActionForm>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
