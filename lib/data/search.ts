import 'server-only'
import { getPublicSupabase } from '@/lib/supabase/public'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { listTag } from '@/lib/revalidate'
import { safeQuery } from './safe'
import type { SearchResult } from './properties'
import type { PublicProperty } from './properties'
import type { DevelopmentListItem } from './developments'
import type { PublicProduct } from './products'
import type { OrganisationListItem } from './organisations'

export interface SearchAll {
  properties: SearchResult<PublicProperty>
  developments: SearchResult<DevelopmentListItem>
  products: SearchResult<PublicProduct>
  organisations: SearchResult<OrganisationListItem>
  locations: { id: string; name: string; display_name: string; path: string; level: string }[]
  services: { name: string; slug: string }[]
  product_categories: { name: string; slug: string; parent_slug: string | null }[]
}

const EMPTY: SearchAll = {
  properties: { total: 0, items: [] },
  developments: { total: 0, items: [] },
  products: { total: 0, items: [] },
  organisations: { total: 0, items: [] },
  locations: [],
  services: [],
  product_categories: [],
}

export async function searchAll(q: string, limit = 4): Promise<SearchAll> {
  if (q.trim().length < 2) return EMPTY
  return safeQuery('search_all', EMPTY, async () => {
    const { data, error } = await getPublicSupabase({ tags: [listTag('property'), listTag('product'), listTag('organisation'), listTag('development')], revalidate: 120 }).rpc('search_all', { p_q: q, p_limit: limit })
    if (error) throw error
    return { ...EMPTY, ...(data as unknown as Partial<SearchAll>) }
  })
}

/** Aggregated zero-result queries (no user link) to guide content and stock decisions (spec 13). */
export async function recordSearchMiss(q: string, vertical: string): Promise<void> {
  try {
    await getAdminSupabase().rpc('record_search_miss', { q, vertical })
  } catch {
    // analytics only
  }
}
