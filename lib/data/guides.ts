import 'server-only'
import { cache } from 'react'
import type { Database } from '@/lib/database.types'
import { getPublicSupabase } from '@/lib/supabase/public'
import { safeQuery } from './safe'
import { visibleGuide } from '@/lib/guides'

export const GUIDES_TAG = 'guides'
export type PublicGuide = Database['public']['Views']['guides_public']['Row']
export type GuideListItem = Pick<PublicGuide, 'id' | 'slug' | 'title' | 'summary' | 'topic' | 'published_at' | 'updated_at'>

/** Published guides, newest first, optionally for one topic. Guides with a CHECK note are left out (see visibleGuide). */
export async function listGuides(opts: { topic?: string; limit?: number } = {}): Promise<GuideListItem[]> {
  return safeQuery('guides', [], async () => {
    let q = getPublicSupabase({ tags: [GUIDES_TAG], revalidate: 600 }).from('guides_public').select('id, slug, title, summary, topic, body, faq, seo_title, seo_description, published_at, updated_at').order('published_at', { ascending: false }).limit(opts.limit ?? 100)
    if (opts.topic) q = q.eq('topic', opts.topic)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []).filter((g) => visibleGuide(g)).map(({ id, slug, title, summary, topic, published_at, updated_at }) => ({ id, slug, title, summary, topic, published_at, updated_at }))
  })
}

export const getGuide = cache(async (slug: string): Promise<PublicGuide | null> =>
  safeQuery('guide', null, async () => {
    const { data, error } = await getPublicSupabase({ tags: [GUIDES_TAG], revalidate: 600 }).from('guides_public').select('*').eq('slug', slug).maybeSingle()
    if (error) throw error
    return visibleGuide(data)
  }),
)
