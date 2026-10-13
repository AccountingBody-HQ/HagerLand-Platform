import 'server-only'
import { cache } from 'react'
import type { Database } from '@/lib/database.types'
import { getPublicSupabase } from '@/lib/supabase/public'
import { safeQuery, unwrap } from './safe'

export type Location = Pick<Database['public']['Tables']['locations']['Row'], 'id' | 'parent_id' | 'level' | 'name' | 'name_am' | 'slug' | 'path' | 'display_name' | 'sort' | 'lat' | 'lng' | 'seo_intro_sale' | 'seo_intro_rent' | 'seo_intro_professionals'>
export type Category = Pick<Database['public']['Tables']['service_categories']['Row'], 'id' | 'parent_id' | 'name' | 'slug' | 'description' | 'icon' | 'sort' | 'seo_title' | 'seo_intro'>
export interface CategoryNode extends Category {
  children: Category[]
}

const REF = { tags: ['reference'], revalidate: 3600 }
const LOCATION_COLUMNS = 'id, parent_id, level, name, name_am, slug, path, display_name, sort, lat, lng, seo_intro_sale, seo_intro_rent, seo_intro_professionals'
const CATEGORY_COLUMNS = 'id, parent_id, name, slug, description, icon, sort, seo_title, seo_intro'

function toTree(rows: Category[]): CategoryNode[] {
  const roots = rows.filter((r) => !r.parent_id).sort((a, b) => a.sort - b.sort)
  return roots.map((r) => ({ ...r, children: rows.filter((c) => c.parent_id === r.id).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name)) }))
}

export const getLocations = cache(async (): Promise<Location[]> =>
  safeQuery('locations', [], async () =>
    unwrap(await getPublicSupabase(REF).from('locations').select(LOCATION_COLUMNS).order('sort').order('name').limit(5000), 'locations'),
  ),
)

export async function getLocationByPath(path: string): Promise<Location | null> {
  return (await getLocations()).find((l) => l.path === path) ?? null
}

export async function getLocationById(id: string | null | undefined): Promise<Location | null> {
  if (!id) return null
  return (await getLocations()).find((l) => l.id === id) ?? null
}

/** Ancestors from the root down to (and including) the location. */
export async function getLocationChain(id: string): Promise<Location[]> {
  const all = await getLocations()
  const byId = new Map(all.map((l) => [l.id, l]))
  const chain: Location[] = []
  let cur = byId.get(id)
  while (cur) {
    chain.unshift(cur)
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined
  }
  return chain
}

export async function getChildLocations(id: string | null): Promise<Location[]> {
  return (await getLocations()).filter((l) => l.parent_id === id)
}

export const getServiceCategories = cache(async (): Promise<CategoryNode[]> =>
  safeQuery('service categories', [], async () =>
    toTree(unwrap(await getPublicSupabase(REF).from('service_categories').select(CATEGORY_COLUMNS).order('sort'), 'service categories')),
  ),
)

export const getProductCategories = cache(async (): Promise<CategoryNode[]> =>
  safeQuery('product categories', [], async () =>
    toTree(unwrap(await getPublicSupabase(REF).from('product_categories').select(CATEGORY_COLUMNS).order('sort'), 'product categories')),
  ),
)

export async function findCategory(tree: CategoryNode[], slug: string): Promise<{ category: Category; parent: CategoryNode | null; node: CategoryNode | null } | null> {
  for (const root of tree) {
    if (root.slug === slug) return { category: root, parent: null, node: root }
    const child = root.children.find((c) => c.slug === slug)
    if (child) return { category: child, parent: root, node: null }
  }
  return null
}

export const getBrands = cache(async () =>
  safeQuery('brands', [] as { id: string; name: string; slug: string }[], async () =>
    unwrap(await getPublicSupabase(REF).from('brands').select('id, name, slug').order('name'), 'brands'),
  ),
)

export const getSiteSettings = cache(async (): Promise<Record<string, unknown>> =>
  safeQuery('site settings', {}, async () => {
    const rows = unwrap(await getPublicSupabase({ tags: ['settings'], revalidate: 600 }).from('site_settings_public').select('key, value'), 'settings')
    return Object.fromEntries((rows ?? []).map((r) => [r.key as string, r.value]))
  }),
)

export async function getSettingNumber(key: string, fallback: number): Promise<number> {
  const v = (await getSiteSettings())[key]
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}
