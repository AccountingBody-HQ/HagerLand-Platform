import 'server-only'
import { cache } from 'react'
import type { Database } from '@/lib/database.types'
import { getPublicSupabase } from '@/lib/supabase/public'
import { listTag, tag } from '@/lib/revalidate'
import { safeQuery, unwrap } from './safe'
import type { SearchResult } from './properties'

type OrgKind = Database['public']['Enums']['org_kind']
export type PublicOrganisation = Omit<Database['public']['Views']['organisations_public']['Row'], 'search_tsv'>
export type OrganisationListItem = PublicOrganisation & {
  portfolio_count: number
  listings_count: number
  services: { name: string; slug: string }[]
}

export interface OrganisationQuery {
  q?: string
  kinds?: OrgKind[]
  serviceId?: string
  productCategoryId?: string
  locationId?: string | null
  verifiedOnly?: boolean
  hasPortfolio?: boolean
  licenceGrade?: string
  excludeId?: string
  sort?: 'verified' | 'projects' | 'newest' | 'relevance' | 'listings'
  page?: number
  pageSize?: number
}

const EMPTY: SearchResult<never> = { total: 0, items: [] }

export async function searchOrganisations(query: OrganisationQuery): Promise<SearchResult<OrganisationListItem>> {
  return safeQuery('search_organisations', EMPTY, async () => {
    const { data, error } = await getPublicSupabase({ tags: [listTag('organisation')], revalidate: 300 }).rpc('search_organisations', {
      p_q: query.q,
      p_kinds: query.kinds?.length ? query.kinds : undefined,
      p_service_id: query.serviceId,
      p_product_category_id: query.productCategoryId,
      p_location_id: query.locationId ?? undefined,
      p_verified_only: query.verifiedOnly ?? false,
      p_has_portfolio: query.hasPortfolio ?? false,
      p_licence_grade: query.licenceGrade,
      p_exclude_id: query.excludeId,
      p_sort: query.sort ?? (query.q ? 'relevance' : 'verified'),
      p_page: query.page ?? 1,
      p_page_size: query.pageSize ?? 24,
    })
    if (error) throw error
    return (data as unknown as SearchResult<OrganisationListItem>) ?? EMPTY
  })
}

export const getOrganisationBySlug = cache(async (slug: string): Promise<PublicOrganisation | null> =>
  safeQuery('organisation detail', null, async () => {
    const row = unwrap(await getPublicSupabase({ tags: [listTag('organisation')], revalidate: 600 }).from('organisations_public').select('*').eq('slug', slug).maybeSingle(), 'organisation')
    if (!row) return null
    const { search_tsv: tsv, ...rest } = row as PublicOrganisation & { search_tsv?: unknown }
    void tsv
    return rest
  }),
)

export async function getOrganisationServices(orgId: string): Promise<{ service_id: string; name: string; slug: string; parent_id: string | null }[]> {
  return safeQuery('org services', [], async () =>
    unwrap(await getPublicSupabase({ tags: [tag('organisation', orgId)], revalidate: 600 }).from('organisation_services_public').select('service_id, name, slug, parent_id').eq('org_id', orgId).order('name'), 'org services') as { service_id: string; name: string; slug: string; parent_id: string | null }[],
  )
}

export async function getOrganisationProductCategories(orgId: string): Promise<{ product_category_id: string; name: string; slug: string }[]> {
  return safeQuery('org product categories', [], async () =>
    unwrap(await getPublicSupabase({ tags: [tag('organisation', orgId)], revalidate: 600 }).from('org_product_categories_public').select('product_category_id, name, slug').eq('org_id', orgId).order('name'), 'org categories') as { product_category_id: string; name: string; slug: string }[],
  )
}

export type PortfolioItem = Database['public']['Views']['portfolio_public']['Row']

export async function getPortfolio(orgId: string): Promise<PortfolioItem[]> {
  return safeQuery('portfolio', [], async () =>
    unwrap(await getPublicSupabase({ tags: [tag('organisation', orgId), listTag('portfolio')], revalidate: 600 }).from('portfolio_public').select('*').eq('org_id', orgId).order('sort').order('year', { ascending: false }), 'portfolio'),
  )
}

export async function getLocationNames(ids: string[]): Promise<string[]> {
  if (!ids.length) return []
  return safeQuery('location names', [], async () =>
    (unwrap(await getPublicSupabase({ tags: ['reference'], revalidate: 3600 }).from('locations').select('name').in('id', ids), 'location names') ?? []).map((l) => l.name),
  )
}
