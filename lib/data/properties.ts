import 'server-only'
import { cache } from 'react'
import type { Database } from '@/lib/database.types'
import { getPublicSupabase } from '@/lib/supabase/public'
import { listTag, tag } from '@/lib/revalidate'
import type { PropertyFilters } from '@/lib/property-search'
import type { ListingPurpose } from '@/lib/labels'
import { safeQuery, unwrap } from './safe'

export type PublicProperty = Omit<Database['public']['Views']['properties_public']['Row'], 'search_tsv'>
export type PublicMedia = Database['public']['Views']['media_public']['Row']

export interface SearchResult<T> {
  total: number
  items: T[]
}

const EMPTY: SearchResult<never> = { total: 0, items: [] }

export interface PropertyQuery {
  purpose?: ListingPurpose
  locationId?: string | null
  filters?: Partial<PropertyFilters>
  developmentId?: string
  listerOrgId?: string
  excludeId?: string
  featuredOnly?: boolean
  pageSize?: number
}

/** Arguments for the search_properties database function (shared by pages and the alerts job). */
export function propertySearchArgs(query: PropertyQuery) {
  const f = query.filters ?? {}
  return {
    p_q: f.q,
    p_purpose: query.purpose,
    p_types: f.types?.length ? f.types : undefined,
    p_location_id: query.locationId ?? undefined,
    p_price_min: f.priceMin,
    p_price_max: f.priceMax,
    p_beds_min: f.beds,
    p_baths_min: f.baths,
    p_area_min: f.areaMin,
    p_area_max: f.areaMax,
    p_finishing: f.finishing?.length ? f.finishing : undefined,
    p_furnishing: f.furnishing?.length ? f.furnishing : undefined,
    p_features: f.features?.length ? f.features : undefined,
    p_completion: f.completion?.length ? f.completion : undefined,
    p_has_title_deed: f.deed,
    p_lister_type: f.lister,
    p_added_within_days: f.added,
    p_include_negotiable: !f.excludeNegotiable,
    p_development_id: query.developmentId,
    p_lister_org_id: query.listerOrgId,
    p_exclude_id: query.excludeId,
    p_featured_only: query.featuredOnly ?? false,
    p_sort: f.sort ?? 'newest',
    p_page: f.page ?? 1,
    p_page_size: query.pageSize ?? 24,
  }
}

export async function searchProperties(query: PropertyQuery): Promise<SearchResult<PublicProperty>> {
  return safeQuery('search_properties', EMPTY, async () => {
    const { data, error } = await getPublicSupabase({ tags: [listTag('property')], revalidate: 120 }).rpc('search_properties', propertySearchArgs(query))
    if (error) throw error
    return (data as unknown as SearchResult<PublicProperty>) ?? EMPTY
  })
}

export const getPropertyByShortId = cache(async (shortId: string): Promise<PublicProperty | null> =>
  safeQuery('property detail', null, async () => {
    const res = await getPublicSupabase({ tags: [`property-short:${shortId}`, listTag('property')], revalidate: 600 })
      .from('properties_public')
      .select('*')
      .eq('short_id', shortId)
      .maybeSingle()
    const row = unwrap(res, 'property detail')
    if (!row) return null
    const { search_tsv: _ignored, ...rest } = row as PublicProperty & { search_tsv?: unknown }
    void _ignored
    return rest
  }),
)

/** Published properties by id, in the given order (homepage picks set in admin → Settings). */
export async function getPropertiesByIds(ids: string[]): Promise<PublicProperty[]> {
  if (!ids.length) return []
  return safeQuery('properties by id', [], async () => {
    const rows = unwrap(await getPublicSupabase({ tags: [listTag('property'), 'home'], revalidate: 300 }).from('properties_public').select('*').in('id', ids.slice(0, 24)), 'properties by id') ?? []
    const byId = new Map(rows.map((r) => [r.id as string, r as PublicProperty]))
    return ids.map((id) => byId.get(id)).filter((r): r is PublicProperty => Boolean(r))
  })
}

export async function getEntityMedia(entityType: 'property' | 'development' | 'organisation' | 'portfolio' | 'product', id: string): Promise<PublicMedia[]> {
  return safeQuery('media', [], async () =>
    unwrap(
      await getPublicSupabase({ tags: [tag(entityType, id)], revalidate: 600 }).from('media_public').select('*').eq('entity_type', entityType).eq('entity_id', id).order('is_cover', { ascending: false }).order('sort'),
      'media',
    ),
  )
}

export interface UnavailableProperty {
  short_id: string
  purpose: ListingPurpose
  property_type: string
  title: string
  location_id: string
  location_display: string
  location_path: string
  bedrooms: number | null
}

export async function getUnavailableProperty(shortId: string): Promise<UnavailableProperty | null> {
  return safeQuery('property unavailable', null, async () => {
    const { data, error } = await getPublicSupabase({ tags: [listTag('property')], revalidate: 600 }).rpc('property_unavailable', { p_short_id: shortId })
    if (error) throw error
    return ((data as unknown as UnavailableProperty[]) ?? [])[0] ?? null
  })
}

export interface PopularLocation {
  id: string
  name: string
  display_name: string
  path: string
  level: string
  count: number
}

export async function getPopularLocations(purpose: ListingPurpose | null, limit = 8): Promise<PopularLocation[]> {
  return safeQuery('popular locations', [], async () => {
    const { data, error } = await getPublicSupabase({ tags: [listTag('property')], revalidate: 300 }).rpc('popular_locations', { p_purpose: purpose ?? undefined, p_limit: limit })
    if (error) throw error
    return (data as unknown as PopularLocation[]) ?? []
  })
}

export interface LocationSummary {
  count: number
  price_min: number | null
  price_max: number | null
  top_types: string[]
  children: { id: string; name: string; path: string; count: number }[]
}

export async function getLocationSummary(locationId: string, purpose: ListingPurpose): Promise<LocationSummary> {
  return safeQuery('location summary', { count: 0, price_min: null, price_max: null, top_types: [], children: [] }, async () => {
    const { data, error } = await getPublicSupabase({ tags: [listTag('property')], revalidate: 300 }).rpc('location_summary', { p_location_id: locationId, p_purpose: purpose })
    if (error) throw error
    return data as unknown as LocationSummary
  })
}
