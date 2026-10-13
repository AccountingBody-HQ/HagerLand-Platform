import type { MetadataRoute } from 'next'
import { getPublicSupabase } from '@/lib/supabase/public'
import { getProductCategories, getServiceCategories, getSettingNumber } from '@/lib/data/reference'
import { canonicalUrl } from '@/lib/site'
import { countByAncestors, indexablePaths, SITEMAP_IDS, type SitemapId } from '@/lib/sitemap-rules'
import { log } from '@/lib/log'
import { listTag } from '@/lib/revalidate'

export const revalidate = 3600

/** One sitemap per content type (spec 16). Only published records and indexable landing pages are listed. */
export async function generateSitemaps() {
  return SITEMAP_IDS.map((id) => ({ id }))
}

const STATIC_PATHS = ['/', '/property', '/property/for-sale', '/property/to-rent', '/supplies', '/supplies/materials-list', '/professionals', '/agents', '/developers', '/suppliers', '/developments', '/our-developments', '/about', '/how-it-works', '/list-with-us', '/contact', '/help', '/terms', '/privacy', '/cookies']
const LIMIT = 50_000

type Entry = MetadataRoute.Sitemap[number]

function entry(path: string, lastModified?: string | null, priority?: number): Entry {
  return { url: canonicalUrl(path), ...(lastModified ? { lastModified: new Date(lastModified) } : {}), ...(priority ? { priority } : {}) }
}

async function build(id: SitemapId): Promise<MetadataRoute.Sitemap> {
  // Tagged with every list tag so publishing, editing or removing a record refreshes the sitemaps too.
  const db = getPublicSupabase({ tags: ['sitemap', listTag('property'), listTag('development'), listTag('organisation'), listTag('product')], revalidate: 3600 })
  const min = await getSettingNumber('min_results_for_index', 3)
  switch (id) {
    case 'static':
      return STATIC_PATHS.map((p) => entry(p, null, p === '/' ? 1 : 0.7))
    case 'properties': {
      const { data } = await db.from('properties_public').select('slug, updated_at').order('published_at', { ascending: false }).limit(LIMIT)
      return (data ?? []).filter((r) => r.slug).map((r) => entry(`/property/${r.slug}`, r.updated_at))
    }
    case 'developments': {
      const { data } = await db.from('developments_public').select('slug, updated_at, is_hagerland').limit(LIMIT)
      return (data ?? []).filter((r) => r.slug).map((r) => entry(`${r.is_hagerland ? '/our-developments' : '/developments'}/${r.slug}`, r.updated_at))
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
      const { data } = await db.from('properties_public').select('location_path').eq('purpose', purpose).limit(LIMIT)
      const base = purpose === 'sale' ? '/property/for-sale' : '/property/to-rent'
      return indexablePaths(countByAncestors((data ?? []).map((r) => r.location_path)), min).map((p) => entry(`${base}/${p}`))
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
