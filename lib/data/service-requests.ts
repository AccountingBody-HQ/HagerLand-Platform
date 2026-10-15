import 'server-only'
import { cache } from 'react'
import { getPublicSupabase } from '@/lib/supabase/public'
import { getVerticals } from '@/lib/data/verticals'
import { parseQuestions, type Question } from '@/lib/service-requests/questions'
import { isVerticalKey, type VerticalKey } from '@/lib/verticals'
import { safeQuery, unwrap } from './safe'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { hashRequestToken, isWellFormedToken } from '@/lib/service-requests/token'

export interface RequestableCategory {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  groupName: string | null
  groupSlug: string | null
  verticalKey: VerticalKey
  questions: Question[]
  allowsEmergency: boolean
}

export interface RequestGroup {
  name: string
  slug: string
  verticalKey: VerticalKey
  categories: RequestableCategory[]
}

/**
 * Service categories people can request (spec 24.5): active leaf categories of live verticals,
 * with their question schemas. Admin edits questions in admin → Request questions.
 */
export const getRequestableCategories = cache(async (): Promise<RequestableCategory[]> =>
  safeQuery('requestable categories', [], async () => {
    const [rows, verticals] = await Promise.all([
      getPublicSupabase({ tags: ['reference'], revalidate: 3600 })
        .from('service_categories')
        .select('id, parent_id, name, slug, description, icon, sort, vertical_key, question_schema, allows_emergency')
        .order('sort')
        .then((r) => unwrap(r, 'service categories')),
      getVerticals(),
    ])
    const live = new Set(verticals.filter((v) => v.status === 'live').map((v) => v.key))
    const byId = new Map((rows ?? []).map((r) => [r.id, r]))
    return (rows ?? [])
      .filter((r) => r.parent_id && isVerticalKey(r.vertical_key) && live.has(r.vertical_key))
      .map((r) => {
        const group = r.parent_id ? byId.get(r.parent_id) : undefined
        return {
          id: r.id,
          name: r.name,
          slug: r.slug,
          description: r.description,
          icon: r.icon ?? group?.icon ?? null,
          groupName: group?.name ?? null,
          groupSlug: group?.slug ?? null,
          verticalKey: r.vertical_key as VerticalKey,
          questions: parseQuestions(r.question_schema),
          allowsEmergency: r.allows_emergency,
        }
      })
  }),
)

export async function getRequestableCategory(slug: string): Promise<RequestableCategory | null> {
  return (await getRequestableCategories()).find((c) => c.slug === slug) ?? null
}

/** Categories grouped by their parent group, in vertical order. */
export async function getRequestGroups(only?: VerticalKey[]): Promise<RequestGroup[]> {
  const [cats, verticals] = await Promise.all([getRequestableCategories(), getVerticals()])
  const order = new Map(verticals.map((v, i) => [v.key, i]))
  const groups = new Map<string, RequestGroup>()
  for (const c of cats) {
    if (only && !only.includes(c.verticalKey)) continue
    const key = c.groupSlug ?? c.slug
    if (!groups.has(key)) groups.set(key, { name: c.groupName ?? c.name, slug: key, verticalKey: c.verticalKey, categories: [] })
    groups.get(key)?.categories.push(c)
  }
  return Array.from(groups.values()).sort((a, b) => (order.get(a.verticalKey) ?? 0) - (order.get(b.verticalKey) ?? 0))
}

/** For the guest page: the request behind a link, and whether the link has expired. Unknown links return null. */
export async function requestIdForToken(token: string): Promise<{ id: string; expired: boolean } | null> {
  if (!isWellFormedToken(token)) return null
  const { data } = await getAdminSupabase().from('service_requests').select('id, access_token_expires_at').eq('access_token_hash', hashRequestToken(token)).maybeSingle()
  if (!data) return null
  return { id: data.id, expired: !data.access_token_expires_at || data.access_token_expires_at < new Date().toISOString() }
}
