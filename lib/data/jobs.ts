import 'server-only'
import { cache } from 'react'
import type { Database } from '@/lib/database.types'
import { getPublicSupabase } from '@/lib/supabase/public'
import { listTag } from '@/lib/revalidate'
import { getLocations } from './reference'
import { safeQuery, unwrap } from './safe'
import type { SearchResult } from './properties'

export type PublicJob = Omit<Database['public']['Views']['jobs_public']['Row'], 'search_tsv'>

const LIST_COLUMNS =
  'id, slug, short_id, title, category, employment_type, trade, employer_name, employer_slug, employer_logo_path, employer_verification, location_display, country_code, currency, salary_min_minor, salary_max_minor, salary_period, closing_date, published_at'
const DETAIL_COLUMNS = `${LIST_COLUMNS}, employer_org_id, location_id, description, requirements, expires_at, updated_at`

export type JobListItem = Pick<
  PublicJob,
  'id' | 'slug' | 'short_id' | 'title' | 'category' | 'employment_type' | 'trade' | 'employer_name' | 'employer_slug' | 'employer_logo_path' | 'employer_verification' | 'location_display' | 'country_code' | 'currency' | 'salary_min_minor' | 'salary_max_minor' | 'salary_period' | 'closing_date' | 'published_at'
>

export interface JobQuery {
  q?: string
  category?: string
  type?: string
  trade?: string
  /** A location path (country, region or city); jobs in it and in the places below it. */
  location?: string
  employerOrgId?: string
  page?: number
  pageSize?: number
}

const EMPTY: SearchResult<never> = { total: 0, items: [] }

/** Open, approved jobs of published employers, newest first (spec 24.9). */
export async function searchJobs(query: JobQuery): Promise<SearchResult<JobListItem>> {
  return safeQuery('search jobs', EMPTY, async () => {
    const pageSize = query.pageSize ?? 20
    const page = Math.max(1, query.page ?? 1)
    let req = getPublicSupabase({ tags: [listTag('job')], revalidate: 300 }).from('jobs_public').select(LIST_COLUMNS, { count: 'exact' })
    if (query.q) req = req.textSearch('search_tsv', query.q, { type: 'websearch', config: 'simple' })
    if (query.category) req = req.eq('category', query.category)
    if (query.type) req = req.eq('employment_type', query.type)
    if (query.trade) req = req.eq('trade', query.trade)
    if (query.employerOrgId) req = req.eq('employer_org_id', query.employerOrgId)
    if (query.location) {
      const all = await getLocations()
      const root = all.find((l) => l.path === query.location)
      if (!root) return EMPTY
      const ids = all.filter((l) => l.path === root.path || l.path.startsWith(`${root.path}/`)).map((l) => l.id)
      req = root.level === 'country' ? req.eq('country_code', root.country_code) : req.in('location_id', ids)
    }
    const { data, error, count } = await req.order('published_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1)
    if (error) throw error
    return { total: count ?? 0, items: (data ?? []) as JobListItem[] }
  })
}

export const getJobBySlug = cache(async (slug: string): Promise<PublicJob | null> =>
  safeQuery('job detail', null, async () => unwrap(await getPublicSupabase({ tags: [listTag('job')], revalidate: 300 }).from('jobs_public').select(DETAIL_COLUMNS).eq('slug', slug).maybeSingle(), 'job') as PublicJob | null),
)

/** Every open job's slug and update time, for the sitemap. */
export async function jobSitemapEntries(): Promise<{ slug: string; updated_at: string }[]> {
  return safeQuery('job sitemap', [], async () => {
    const { data, error } = await getPublicSupabase({ tags: [listTag('job')], revalidate: 3600 }).from('jobs_public').select('slug, updated_at').limit(5000)
    if (error) throw error
    return (data ?? []).map((j) => ({ slug: j.slug ?? '', updated_at: j.updated_at ?? '' })).filter((j) => j.slug)
  })
}
