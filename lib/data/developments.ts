import 'server-only'
import { cache } from 'react'
import type { Database } from '@/lib/database.types'
import { getPublicSupabase } from '@/lib/supabase/public'
import { listTag } from '@/lib/revalidate'
import { safeQuery, unwrap } from './safe'
import type { SearchResult } from './properties'

export type PublicDevelopment = Omit<Database['public']['Views']['developments_public']['Row'], 'search_tsv'>
export type DevelopmentListItem = PublicDevelopment & { listings_count: number }
type Completion = Database['public']['Enums']['completion_status']
type DevKind = Database['public']['Enums']['development_kind']

export interface DevelopmentQuery {
  q?: string
  locationId?: string | null
  completion?: Completion[]
  priceMin?: number
  priceMax?: number
  isHagerland?: boolean
  developerOrgId?: string
  kinds?: DevKind[]
  excludeId?: string
  sort?: 'newest' | 'relevance' | 'price_asc' | 'completion'
  page?: number
  pageSize?: number
}

const EMPTY: SearchResult<never> = { total: 0, items: [] }

export async function searchDevelopments(query: DevelopmentQuery): Promise<SearchResult<DevelopmentListItem>> {
  return safeQuery('search_developments', EMPTY, async () => {
    const { data, error } = await getPublicSupabase({ tags: [listTag('development')], revalidate: 300 }).rpc('search_developments', {
      p_q: query.q,
      p_location_id: query.locationId ?? undefined,
      p_completion: query.completion?.length ? query.completion : undefined,
      p_price_min: query.priceMin,
      p_price_max: query.priceMax,
      p_is_hagerland: query.isHagerland,
      p_developer_org_id: query.developerOrgId,
      p_kinds: query.kinds?.length ? query.kinds : undefined,
      p_exclude_id: query.excludeId,
      p_sort: query.sort ?? (query.q ? 'relevance' : 'newest'),
      p_page: query.page ?? 1,
      p_page_size: query.pageSize ?? 24,
    })
    if (error) throw error
    return (data as unknown as SearchResult<DevelopmentListItem>) ?? EMPTY
  })
}

export const getDevelopmentBySlug = cache(async (slug: string): Promise<PublicDevelopment | null> =>
  safeQuery('development detail', null, async () => {
    const row = unwrap(await getPublicSupabase({ tags: [listTag('development')], revalidate: 600 }).from('developments_public').select('*').eq('slug', slug).maybeSingle(), 'development')
    if (!row) return null
    const { search_tsv: tsv, ...rest } = row as PublicDevelopment & { search_tsv?: unknown }
    void tsv
    return rest
  }),
)

export interface UnitType {
  type: string
  beds?: number | null
  area_min?: number | null
  area_max?: number | null
  price_from_etb?: number | null
}

export function parseUnitTypes(v: unknown): UnitType[] {
  if (!Array.isArray(v)) return []
  return v.filter((u): u is UnitType => Boolean(u) && typeof u === 'object' && typeof (u as UnitType).type === 'string')
}

export interface DevelopmentUpdate {
  id: string
  title: string
  body: string
  happened_on: string
  photo_paths: string[]
}

/** Published progress updates of a published development, newest first (spec 25.2j). */
export async function getDevelopmentUpdates(developmentId: string): Promise<DevelopmentUpdate[]> {
  return safeQuery('development updates', [], async () => {
    const { data, error } = await getPublicSupabase({ tags: [listTag('development')], revalidate: 600 })
      .from('development_updates_public')
      .select('id, title, body, happened_on, photo_paths')
      .eq('development_id', developmentId)
      .order('happened_on', { ascending: false })
      .limit(30)
    if (error) throw error
    return (data ?? []).map((u) => ({ id: u.id ?? '', title: u.title ?? '', body: u.body ?? '', happened_on: u.happened_on ?? '', photo_paths: u.photo_paths ?? [] }))
  })
}
