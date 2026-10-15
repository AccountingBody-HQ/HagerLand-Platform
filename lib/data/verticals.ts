import 'server-only'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { getPublicSupabase } from '@/lib/supabase/public'
import { DEFAULT_VERTICALS, isVerticalKey, type Vertical, type VerticalKey } from '@/lib/verticals'
import { safeQuery, unwrap } from './safe'

export const VERTICALS_TAG = 'verticals'

/**
 * Every vertical that is not hidden, in display order (spec 24.2).
 * Hidden verticals are not returned at all, so callers simply never see them.
 */
export const getVerticals = cache(async (): Promise<Vertical[]> =>
  safeQuery('verticals', DEFAULT_VERTICALS, async () => {
    const rows = unwrap(
      await getPublicSupabase({ tags: [VERTICALS_TAG], revalidate: 300 })
        .from('verticals_public')
        .select('key, name, nav_label, slug, status, sort, short_description, intro, icon, seo_title, seo_description, interest_enabled, partner_signup_enabled')
        .order('sort'),
      'verticals',
    )
    return (rows ?? [])
      .filter((r): r is typeof r & { key: VerticalKey } => isVerticalKey(r.key))
      .map((r) => ({
        key: r.key,
        name: r.name ?? '',
        navLabel: r.nav_label ?? r.name ?? '',
        slug: r.slug ?? '',
        status: r.status ?? 'coming_soon',
        sort: r.sort ?? 0,
        shortDescription: r.short_description ?? '',
        intro: r.intro ?? '',
        icon: r.icon ?? 'circle',
        seoTitle: r.seo_title,
        seoDescription: r.seo_description,
        interestEnabled: Boolean(r.interest_enabled),
        partnerSignupEnabled: Boolean(r.partner_signup_enabled),
      }))
  }),
)

export async function getVertical(key: VerticalKey): Promise<Vertical | null> {
  return (await getVerticals()).find((v) => v.key === key) ?? null
}

/** For pages that belong to a vertical: 404 when the vertical is hidden (or unknown). */
export async function requireVisibleVertical(key: VerticalKey): Promise<Vertical> {
  const v = await getVertical(key)
  if (!v) notFound()
  return v
}
