import 'server-only'
import { getPublicSupabase } from '@/lib/supabase/public'
import { safeQuery } from './safe'

export const REVIEWS_TAG = 'reviews'
/** AggregateRating structured data only from this many published reviews (spec 26.12). */
export const MIN_REVIEWS_FOR_RATING = 3

export interface PublicReview {
  id: string
  author_first_name: string
  rating: number
  body: string
  published_at: string
  provider_reply: string | null
  replied_at: string | null
}

/** Published verified reviews of one business, newest first, with the average rating. */
export async function getReviews(orgId: string): Promise<{ items: PublicReview[]; average: number | null }> {
  return safeQuery('reviews', { items: [], average: null }, async () => {
    const { data, error } = await getPublicSupabase({ tags: [REVIEWS_TAG], revalidate: 600 }).from('reviews_public').select('id, author_first_name, rating, body, published_at, provider_reply, replied_at').eq('org_id', orgId).order('published_at', { ascending: false }).limit(100)
    if (error) throw error
    const items = (data ?? []) as PublicReview[]
    return { items, average: items.length ? Math.round((items.reduce((n, r) => n + r.rating, 0) / items.length) * 10) / 10 : null }
  })
}
