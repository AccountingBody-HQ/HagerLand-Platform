import 'server-only'
import { cache } from 'react'
import type { Database } from '@/lib/database.types'
import { getPublicSupabase } from '@/lib/supabase/public'
import { listTag } from '@/lib/revalidate'
import { safeQuery, unwrap } from './safe'
import type { SearchResult } from './properties'

export type PublicProduct = Omit<Database['public']['Views']['products_public']['Row'], 'search_tsv'>
type Stock = Database['public']['Enums']['stock_status']

export interface ProductQuery {
  q?: string
  categoryId?: string
  brandIds?: string[]
  priceMinCents?: number
  priceMaxCents?: number
  stock?: Stock[]
  units?: string[]
  sellerOrgId?: string
  excludeId?: string
  sort?: 'popular' | 'price_asc' | 'price_desc' | 'newest' | 'relevance'
  page?: number
  pageSize?: number
}

const EMPTY: SearchResult<never> = { total: 0, items: [] }

export async function searchProducts(q: ProductQuery): Promise<SearchResult<PublicProduct>> {
  return safeQuery('search_products', EMPTY, async () => {
    const { data, error } = await getPublicSupabase({ tags: [listTag('product')], revalidate: 120 }).rpc('search_products', {
      p_q: q.q,
      p_category_id: q.categoryId,
      p_brand_ids: q.brandIds?.length ? q.brandIds : undefined,
      p_price_min: q.priceMinCents,
      p_price_max: q.priceMaxCents,
      p_stock_statuses: q.stock?.length ? q.stock : undefined,
      p_seller_org_id: q.sellerOrgId,
      p_units: q.units?.length ? q.units : undefined,
      p_exclude_id: q.excludeId,
      p_sort: q.sort ?? (q.q ? 'relevance' : 'popular'),
      p_page: q.page ?? 1,
      p_page_size: q.pageSize ?? 24,
    })
    if (error) throw error
    return (data as unknown as SearchResult<PublicProduct>) ?? EMPTY
  })
}

export const getProductBySlug = cache(async (slug: string): Promise<PublicProduct | null> =>
  safeQuery('product detail', null, async () => {
    const row = unwrap(await getPublicSupabase({ tags: [listTag('product')], revalidate: 600 }).from('products_public').select('*').eq('slug', slug).maybeSingle(), 'product')
    if (!row) return null
    const { search_tsv: tsv, ...rest } = row as PublicProduct & { search_tsv?: unknown }
    void tsv
    return rest
  }),
)

export interface Spec {
  label: string
  value: string
  unit?: string
}

export function parseSpecs(v: unknown): Spec[] {
  if (!Array.isArray(v)) return []
  return v.filter((s): s is Spec => Boolean(s) && typeof s === 'object' && typeof (s as Spec).label === 'string' && typeof (s as Spec).value === 'string')
}

export type SpecialBuy = Database['public']['Views']['special_buys_public']['Row']

/** Live Special Buys (spec 25.2d), soonest ending first. Expired and sold-out offers are excluded by the view. */
export async function getSpecialBuys(limit = 60): Promise<SpecialBuy[]> {
  return safeQuery('special buys', [], async () => {
    const { data, error } = await getPublicSupabase({ tags: [listTag('product')], revalidate: 120 }).from('special_buys_public').select('*').order('special_ends_at', { ascending: true }).limit(limit)
    if (error) throw error
    return data ?? []
  })
}

/** The live Special Buy offer for one product, if any. */
export async function getSpecialBuyFor(productId: string): Promise<SpecialBuy | null> {
  return safeQuery('special buy', null, async () => {
    const { data, error } = await getPublicSupabase({ tags: [listTag('product')], revalidate: 120 }).from('special_buys_public').select('*').eq('id', productId).maybeSingle()
    if (error) throw error
    return data
  })
}
