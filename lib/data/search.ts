import 'server-only'
import { getPublicSupabase } from '@/lib/supabase/public'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { listTag } from '@/lib/revalidate'
import { safeQuery } from './safe'
import { getVerticals } from './verticals'
import { isLive } from '@/lib/verticals'
import type { SearchResult } from './properties'
import type { PublicProperty } from './properties'
import type { DevelopmentListItem } from './developments'
import type { PublicProduct } from './products'
import type { OrganisationListItem } from './organisations'
import { searchJobs, type JobListItem } from './jobs'

export interface SearchAll {
  properties: SearchResult<PublicProperty>
  developments: SearchResult<DevelopmentListItem>
  products: SearchResult<PublicProduct>
  organisations: SearchResult<OrganisationListItem>
  jobs: SearchResult<JobListItem>
  locations: { id: string; name: string; display_name: string; path: string; level: string }[]
  services: { name: string; slug: string }[]
  product_categories: { name: string; slug: string; parent_slug: string | null }[]
}

const EMPTY: SearchAll = {
  properties: { total: 0, items: [] },
  developments: { total: 0, items: [] },
  products: { total: 0, items: [] },
  organisations: { total: 0, items: [] },
  jobs: { total: 0, items: [] },
  locations: [],
  services: [],
  product_categories: [],
}

export async function searchAll(q: string, limit = 4): Promise<SearchAll> {
  if (q.trim().length < 2) return EMPTY
  return safeQuery('search_all', EMPTY, async () => {
    const { data, error } = await getPublicSupabase({ tags: [listTag('property'), listTag('product'), listTag('organisation'), listTag('development')], revalidate: 120 }).rpc('search_all', { p_q: q, p_limit: limit })
    if (error) throw error
    const live = await withoutClosedVerticals({ ...EMPTY, ...(data as unknown as Partial<SearchAll>) })
    // Jobs are searched separately, and only while the jobs vertical is live.
    return { ...live, jobs: isLive(await getVerticals(), 'jobs') ? await searchJobs({ q, pageSize: limit }) : EMPTY.jobs }
  })
}

/** Results only from live verticals (spec 24.2): a coming-soon or hidden vertical returns nothing. */
async function withoutClosedVerticals(r: SearchAll): Promise<SearchAll> {
  const v = await getVerticals()
  const property = isLive(v, 'property')
  const supplies = isLive(v, 'building-supplies')
  const services = isLive(v, 'professionals') || isLive(v, 'contractors') || isLive(v, 'repairs-maintenance')
  return {
    properties: property ? r.properties : EMPTY.properties,
    developments: property ? r.developments : EMPTY.developments,
    locations: property ? r.locations : [],
    products: supplies ? r.products : EMPTY.products,
    product_categories: supplies ? r.product_categories : [],
    services: services ? r.services : [],
    organisations: r.organisations,
    jobs: EMPTY.jobs,
  }
}

/** Aggregated zero-result queries (no user link) to guide content and stock decisions (spec 13). */
export async function recordSearchMiss(q: string, vertical: string): Promise<void> {
  try {
    await getAdminSupabase().rpc('record_search_miss', { q, vertical })
  } catch {
    // analytics only
  }
}
