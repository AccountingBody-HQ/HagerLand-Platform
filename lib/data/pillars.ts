import 'server-only'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { getPublicSupabase } from '@/lib/supabase/public'
import { DEFAULT_PILLARS, isPillarKey, modeStatus, serviceOn, type Pillar, type PillarKey, type PillarService } from '@/lib/pillars'
import { safeQuery, unwrap } from './safe'

export const PILLARS_TAG = 'pillars'

function toServices(v: unknown): PillarService[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
    .map((x) => ({ key: String(x.key ?? ''), name: String(x.name ?? ''), direct: x.direct === true, aggregate: x.aggregate === true, interest: x.interest === true }))
}

/** Every visible pillar in lifecycle order (spec 26.2). Hidden pillars are not returned at all. */
export const getPillars = cache(async (): Promise<Pillar[]> =>
  safeQuery('pillars', DEFAULT_PILLARS, async () => {
    const rows = unwrap(
      await getPublicSupabase({ tags: [PILLARS_TAG], revalidate: 300 })
        .from('pillars_public')
        .select('key, number, name, nav_label, slug, tagline, description, icon, direct_enabled, aggregate_enabled, interest_enabled, seo_title, seo_description, services')
        .order('number'),
      'pillars',
    )
    return (rows ?? [])
      .filter((r): r is typeof r & { key: PillarKey } => isPillarKey(r.key))
      .map((r) => {
        const m = { direct: Boolean(r.direct_enabled), aggregate: Boolean(r.aggregate_enabled), interest: Boolean(r.interest_enabled) }
        return {
          key: r.key,
          number: r.number ?? 0,
          name: r.name ?? '',
          navLabel: r.nav_label ?? r.name ?? '',
          slug: r.slug ?? r.key,
          tagline: r.tagline ?? '',
          description: r.description ?? '',
          icon: r.icon ?? 'circle',
          ...m,
          status: modeStatus(m),
          seoTitle: r.seo_title,
          seoDescription: r.seo_description,
          services: toServices(r.services),
        }
      })
  }),
)

export async function getPillar(key: PillarKey): Promise<Pillar | null> {
  return (await getPillars()).find((p) => p.key === key) ?? null
}

/** For pillar hubs: 404 when the pillar is hidden. */
export async function requireVisiblePillar(key: PillarKey): Promise<Pillar> {
  const p = await getPillar(key)
  if (!p) notFound()
  return p
}

/**
 * HagerLand's own estate agency (spec 26.1, 26.5). Sales need Buy & Sell Direct, lettings need Rent & Let Direct,
 * and both follow the agency's own on/off switch (default on).
 */
export async function getAgencyAvailability(): Promise<{ sales: boolean; lettings: boolean; any: boolean }> {
  const list = await getPillars()
  const agency = serviceOn(list, 'buy', 'estate-agency')
  const sales = agency && Boolean(list.find((p) => p.key === 'buy')?.direct)
  const lettings = agency && Boolean(list.find((p) => p.key === 'rent')?.direct)
  return { sales, lettings, any: sales || lettings }
}
