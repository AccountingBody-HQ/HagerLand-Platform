import type { MetadataRoute } from 'next'
import { getPublicSupabase } from '@/lib/supabase/public'
import { getProductCategories, getServiceCategories, getSettingNumber } from '@/lib/data/reference'
import { canonicalUrl } from '@/lib/site'
import { countByAncestors, indexablePaths, SITEMAP_IDS, typePathCounts, type SitemapId } from '@/lib/sitemap-rules'
import { log } from '@/lib/log'
import { listTag } from '@/lib/revalidate'
import { getVerticals } from '@/lib/data/verticals'
import { getAgencyAvailability, getPillars } from '@/lib/data/pillars'
import { pillarHref } from '@/lib/pillars'
import { jobSitemapEntries } from '@/lib/data/jobs'
import { listGuides } from '@/lib/data/guides'
import { getBuildRates, getSiteSettings } from '@/lib/data/reference'
import { localizeHref } from '@/lib/i18n/config'
import { verticalForPath, verticalHref, type VerticalKey } from '@/lib/verticals'

export const revalidate = 3600

/** One sitemap per content type (spec 16). Only published records and indexable landing pages are listed. */
export async function generateSitemaps() {
  return SITEMAP_IDS.map((id) => ({ id }))
}

const STATIC_PATHS = ['/', '/property', '/property/for-sale', '/property/to-rent', '/supplies', '/supplies/materials-list', '/professionals', '/agents', '/developers', '/suppliers', '/developments', '/our-developments', '/about', '/how-it-works', '/list-with-us', '/advertise', '/request-service', '/agency', '/agency/sell', '/agency/let', '/agency/buyer-representation', '/agency/property-sourcing', '/agency/developer-sales', '/diaspora/property-care', '/diaspora/services-abroad', '/contact', '/help', '/terms', '/privacy', '/cookies']
const AGENCY_SALES_PATHS = ['/agency/sell', '/agency/buyer-representation', '/agency/property-sourcing', '/agency/developer-sales']
const AGENCY_LETTINGS_PATHS = ['/agency/let']
const LIMIT = 50_000

type Entry = MetadataRoute.Sitemap[number]

function entry(path: string, lastModified?: string | null, priority?: number): Entry {
  return { url: canonicalUrl(path), ...(lastModified ? { lastModified: new Date(lastModified) } : {}), ...(priority ? { priority } : {}) }
}

/** Which vertical each sitemap belongs to: its sitemap is empty unless that vertical is live (spec 24.2). */
const SITEMAP_VERTICAL: Partial<Record<SitemapId, VerticalKey>> = {
  properties: 'property',
  developments: 'property',
  'locations-sale': 'property',
  'locations-rent': 'property',
  products: 'building-supplies',
  categories: 'building-supplies',
  professionals: 'professionals',
  jobs: 'jobs',
}

async function build(id: SitemapId): Promise<MetadataRoute.Sitemap> {
  const verticals = await getVerticals()
  const live = new Set(verticals.filter((v) => v.status === 'live').map((v) => v.key))
  const owner = SITEMAP_VERTICAL[id]
  if (owner && !live.has(owner)) return []
  const isListed = (path: string) => {
    const key = verticalForPath(path)
    return !key || live.has(key)
  }
  // Tagged with every list tag so publishing, editing or removing a record refreshes the sitemaps too.
  const db = getPublicSupabase({ tags: ['sitemap', listTag('property'), listTag('development'), listTag('organisation'), listTag('product')], revalidate: 3600 })
  const min = await getSettingNumber('min_results_for_index', 3)
  switch (id) {
    case 'static': {
      // Pillar hubs follow pillar visibility: only live pillars are listed; coming-soon hubs are noindex (spec 26.16).
      const [pillars, agency] = await Promise.all([getPillars(), getAgencyAvailability()])
      const livePillars = pillars.filter((p) => p.status === 'live').map(pillarHref)
      const hiddenAgency = new Set([...(agency.sales ? [] : AGENCY_SALES_PATHS), ...(agency.lettings ? [] : AGENCY_LETTINGS_PATHS), ...(agency.any ? [] : ['/agency'])])
      const paths = Array.from(new Set([...STATIC_PATHS, ...livePillars, ...verticals.filter((v) => v.status === 'live').map(verticalHref)]))
        .filter(isListed)
        .filter((p) => !hiddenAgency.has(p))
      // Amharic versions of the main pages, only while the Amharic locale is switched on (spec 25.2m).
      const amharic = (await getSiteSettings()).amharic_enabled === true ? paths.map((p) => localizeHref(p, 'am')) : []
      return [...paths.map((p) => entry(p, null, p === '/' ? 1 : 0.7)), ...amharic.map((p) => entry(p, null, 0.5))]
    }
    case 'properties': {
      const { data } = await db.from('properties_public').select('slug, updated_at').order('published_at', { ascending: false }).limit(LIMIT)
      return (data ?? []).filter((r) => r.slug).map((r) => entry(`/property/${r.slug}`, r.updated_at))
    }
    case 'developments': {
      const { data } = await db.from('developments_public').select('slug, updated_at, is_hagerland').limit(LIMIT)
      return (data ?? [])
        .filter((r) => r.slug)
        .map((r) => ({ path: `${r.is_hagerland ? '/our-developments' : '/developments'}/${r.slug}`, updated: r.updated_at }))
        .filter((r) => isListed(r.path))
        .map((r) => entry(r.path, r.updated))
    }
    case 'products': {
      const { data } = await db.from('products_public').select('slug, updated_at').limit(LIMIT)
      return (data ?? []).filter((r) => r.slug).map((r) => entry(`/supplies/product/${r.slug}`, r.updated_at))
    }
    case 'companies': {
      const { data } = await db.from('organisations_public').select('slug, updated_at, kind').neq('kind', 'hagerland').limit(LIMIT)
      return (data ?? []).filter((r) => r.slug).map((r) => entry(`/company/${r.slug}`, r.updated_at))
    }
    case 'locations-sale':
    case 'locations-rent': {
      const purpose = id === 'locations-sale' ? 'sale' : 'rent'
      const { data } = await db.from('properties_public').select('location_path, property_type').eq('purpose', purpose).limit(LIMIT)
      const base = purpose === 'sale' ? '/property/for-sale' : '/property/to-rent'
      const locationPages = indexablePaths(countByAncestors((data ?? []).map((r) => r.location_path)), min).map((p) => entry(`${base}/${p}`))
      // Property-type pages (spec 25.2l), nationwide and per place, when they meet the same threshold.
      const typePages = indexablePaths(typePathCounts((data ?? []).map((r) => ({ path: r.location_path, type: r.property_type }))), min).map((p) => entry(`${base}/${p}`))
      return [...locationPages, ...typePages]
    }
    case 'professionals': {
      const [{ data: links }, { data: orgs }, services] = await Promise.all([
        db.from('organisation_services_public').select('org_id, service_id, parent_id').limit(LIMIT),
        db.from('organisations_public').select('id, location_path').limit(LIMIT),
        getServiceCategories(),
      ])
      const orgPath = new Map((orgs ?? []).map((o) => [o.id as string, o.location_path]))
      const slugs = new Map(services.flatMap((g) => [[g.id, g.slug] as const, ...g.children.map((c) => [c.id, c.slug] as const)]))
      const byService = new Map<string, Set<string>>()
      for (const l of links ?? []) {
        for (const sid of [l.service_id, l.parent_id]) {
          if (!sid || !l.org_id) continue
          if (!byService.has(sid)) byService.set(sid, new Set())
          byService.get(sid)?.add(l.org_id)
        }
      }
      const out: Entry[] = []
      for (const [sid, orgIds] of Array.from(byService)) {
        const slug = slugs.get(sid)
        if (!slug || orgIds.size < Math.max(1, min)) continue
        out.push(entry(`/professionals/${slug}`))
        for (const p of indexablePaths(countByAncestors(Array.from(orgIds).map((o) => orgPath.get(o))), min)) out.push(entry(`/professionals/${slug}/${p}`))
      }
      return out
    }
    case 'guides': {
      // Guides and the build-cost estimator appear only once there is something public (spec 25.2g, h).
      const [guides, rates] = await Promise.all([listGuides(), getBuildRates()])
      return [...(guides.length ? [entry('/guides'), ...guides.map((g) => entry(`/guides/${g.slug}`, g.updated_at))] : []), ...(rates.length ? [entry('/build-cost-estimator')] : [])]
    }
    case 'jobs':
      return (await jobSitemapEntries()).map((j) => entry(`/jobs/${j.slug}`, j.updated_at))
    case 'categories': {
      const [{ data }, tree] = await Promise.all([db.from('products_public').select('category_id, category_parent_id').limit(LIMIT), getProductCategories()])
      const used = new Set((data ?? []).flatMap((r) => [r.category_id, r.category_parent_id]).filter(Boolean))
      return tree.flatMap((root) => (used.has(root.id) ? [entry(`/supplies/${root.slug}`), ...root.children.filter((c) => used.has(c.id)).map((c) => entry(`/supplies/${root.slug}/${c.slug}`))] : []))
    }
  }
}

export default async function sitemap({ id }: { id: SitemapId }): Promise<MetadataRoute.Sitemap> {
  try {
    return await build(id)
  } catch (err) {
    log.error('sitemap', 'build failed', err, { id })
    return id === 'static' ? STATIC_PATHS.map((p) => entry(p)) : []
  }
}
