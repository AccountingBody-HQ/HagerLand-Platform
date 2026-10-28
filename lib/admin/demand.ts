import 'server-only'
import { readAll, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { must } from '@/lib/admin/must'
import { PILLAR_KEYS, VERTICAL_PILLAR, isPillarKey, type PillarKey } from '@/lib/pillars'
import { isVerticalKey } from '@/lib/verticals'

const DAY = 86_400_000

/** Search tabs logged in search_misses → the pillar they belong to. */
const SEARCH_PILLAR: Record<string, PillarKey | null> = { property: 'buy', developments: 'buy', supplies: 'supplies', companies: 'build', jobs: 'jobs', all: null }

export type DemandSource = 'interest' | 'request' | 'unmatched' | 'declined' | 'search' | 'enquiry'
export const SOURCE_LABEL: Record<DemandSource, string> = {
  interest: 'Interest registrations',
  request: 'Service requests',
  unmatched: 'Unmatched requests',
  declined: 'Declined by every provider',
  search: 'Searches with no results',
  enquiry: 'Enquiries and leads',
}

export interface DemandSignal {
  source: DemandSource
  pillar: PillarKey | null
  category: string
  place: string
  country: string
  at: string
  weight: number
}

export interface DemandReport {
  since: Date
  signals: DemandSignal[]
  byPillar: { pillar: PillarKey | null; counts: Record<DemandSource, number>; total: number }[]
  byCategory: { key: string; total: number }[]
  byPlace: { key: string; total: number }[]
  byCountry: { key: string; total: number }[]
  weekly: { label: string; value: number }[]
  recommendations: Recommendation[]
}

export interface Recommendation {
  pillar: PillarKey
  category: string
  place: string
  demand: number
  supply: number
  score: number
}

const pillarOfVertical = (v: string | null | undefined): PillarKey | null => (v && isVerticalKey(v) ? VERTICAL_PILLAR[v] : null)

function tally<T extends string>(signals: DemandSignal[], key: (s: DemandSignal) => T): { key: T; total: number }[] {
  const m = new Map<T, number>()
  for (const s of signals) m.set(key(s), (m.get(key(s)) ?? 0) + s.weight)
  return Array.from(m.entries())
    .map(([k, total]) => ({ key: k, total }))
    .sort((a, b) => b.total - a.total)
}

/**
 * Demand intelligence (spec 26.13): interest registrations, unmatched or declined service requests, zero-result
 * searches and enquiries over a period, by pillar, category, place and country, with a weekly trend and activation
 * recommendations that compare demand with live supply.
 */
export async function demandReport(since: Date, until: Date = new Date()): Promise<DemandReport> {
  const db = getAdminSupabase()
  const from = since.toISOString()
  const to = until.toISOString()
  // The failure rule (Jobs Phase 6, C2-10): a failed read stops the page with an error instead of showing zeros.
  const [interest, requests, misses, enquiries, locations, categories] = must(await Promise.all([
    readAll(() => db.from('interest_registrations').select('vertical_key, pillar_key, category, city, country_code, created_at').gte('created_at', from).lt('created_at', to), { maxRows: REPORT_MAX_ROWS }),
    readAll(() => db.from('service_requests').select('id, vertical_key, service_category_id, location_id, location_text, country_code, status, closed_reason, created_at, matches:service_request_matches(status)').gte('created_at', from).lt('created_at', to), { maxRows: REPORT_MAX_ROWS }),
    readAll(() => db.from('search_misses').select('q_normalised, vertical, count, last_seen_at').gte('last_seen_at', from).lt('last_seen_at', to), { maxRows: REPORT_MAX_ROWS, key: ['q_normalised', 'vertical'] }),
    readAll(() => db.from('enquiries').select('target_type, created_at').gte('created_at', from).lt('created_at', to), { maxRows: REPORT_MAX_ROWS }),
    readAll(() => db.from('locations').select('id, display_name, country_code'), { maxRows: REPORT_MAX_ROWS }),
    readAll(() => db.from('service_categories').select('id, name'), { maxRows: REPORT_MAX_ROWS }),
  ]))
  const placeName = new Map((locations.data ?? []).map((l) => [l.id, l.display_name ?? '']))
  const catName = new Map((categories.data ?? []).map((c) => [c.id, c.name]))
  const signals: DemandSignal[] = []
  for (const i of interest.data ?? []) {
    const pillar = isPillarKey(i.pillar_key) ? i.pillar_key : pillarOfVertical(i.vertical_key)
    signals.push({ source: 'interest', pillar, category: i.category ?? 'General', place: i.city ?? 'Not given', country: i.country_code, at: i.created_at, weight: 1 })
  }
  const stale = Date.now() - 2 * DAY
  for (const r of requests.data ?? []) {
    const pillar = pillarOfVertical(r.vertical_key)
    const base = { pillar, category: (r.service_category_id && catName.get(r.service_category_id)) || 'Other', place: (r.location_id && placeName.get(r.location_id)) || r.location_text || 'Not given', country: r.country_code, at: r.created_at, weight: 1 }
    signals.push({ ...base, source: 'request' })
    const matches = Array.isArray(r.matches) ? r.matches : []
    const allDeclined = matches.length > 0 && matches.every((m) => m.status === 'declined' || m.status === 'withdrawn')
    if (allDeclined || r.closed_reason === 'all_declined') signals.push({ ...base, source: 'declined' })
    else if (r.closed_reason === 'no_provider' || (matches.length === 0 && ['submitted', 'triaged'].includes(r.status) && new Date(r.created_at).getTime() < stale)) signals.push({ ...base, source: 'unmatched' })
  }
  for (const m of misses.data ?? []) signals.push({ source: 'search', pillar: SEARCH_PILLAR[m.vertical] ?? null, category: `“${m.q_normalised}”`, place: 'Search', country: 'ET', at: m.last_seen_at, weight: m.count })
  for (const e of enquiries.data ?? []) {
    const pillar: PillarKey | null = ['property', 'development', 'hagerland_development'].includes(e.target_type) ? 'buy' : e.target_type === 'product' ? 'supplies' : e.target_type === 'organisation' ? 'build' : null
    signals.push({ source: 'enquiry', pillar, category: e.target_type, place: 'Not given', country: 'ET', at: e.created_at, weight: 1 })
  }

  const empty = (): Record<DemandSource, number> => ({ interest: 0, request: 0, unmatched: 0, declined: 0, search: 0, enquiry: 0 })
  const byPillar = [...PILLAR_KEYS, null].map((pillar) => {
    const counts = empty()
    for (const s of signals.filter((x) => x.pillar === pillar)) counts[s.source] += s.weight
    return { pillar, counts, total: Object.values(counts).reduce((a, b) => a + b, 0) }
  })

  // Weekly trend (most recent 12 weeks of the period).
  const weeks = Math.min(12, Math.max(1, Math.ceil((until.getTime() - since.getTime()) / (7 * DAY))))
  const weekly = Array.from({ length: weeks }, (_, i) => {
    const end = until.getTime() - (weeks - 1 - i) * 7 * DAY
    const start = end - 7 * DAY
    const value = signals.filter((s) => s.source !== 'search' && new Date(s.at).getTime() >= start && new Date(s.at).getTime() < end).reduce((n, s) => n + s.weight, 0)
    return { label: new Date(start).toISOString().slice(5, 10), value }
  })

  return {
    since,
    signals,
    byPillar,
    byCategory: tally(signals, (s) => s.category).slice(0, 25),
    byPlace: tally(signals.filter((s) => s.source !== 'search'), (s) => s.place).slice(0, 25),
    byCountry: tally(signals.filter((s) => s.source !== 'search'), (s) => s.country).slice(0, 25),
    weekly,
    recommendations: await recommendations(signals),
  }
}

/**
 * Activation recommendations (spec 26.13): pillar × category × place ranked by demand against live supply. Unmet
 * demand (unmatched, declined, interest) counts double, because it is demand nobody served.
 */
async function recommendations(signals: DemandSignal[]): Promise<Recommendation[]> {
  const groups = new Map<string, { pillar: PillarKey; category: string; place: string; demand: number }>()
  for (const s of signals) {
    if (!s.pillar || s.source === 'search' || s.source === 'enquiry') continue
    const k = `${s.pillar}|${s.category}|${s.place}`
    const g = groups.get(k) ?? { pillar: s.pillar, category: s.category, place: s.place, demand: 0 }
    g.demand += s.source === 'request' ? s.weight : 2 * s.weight
    groups.set(k, g)
  }
  const db = getAdminSupabase()
  const pillars = Array.from(new Set(Array.from(groups.values()).map((g) => g.pillar)))
  const supply = new Map<string, number>()
  await Promise.all(pillars.map(async (p) => supply.set(p, (must(await db.rpc('pillar_active_providers', { p_pillar: p })).data as number | null) ?? 0)))
  return Array.from(groups.values())
    .map((g) => {
      const s = supply.get(g.pillar) ?? 0
      return { ...g, supply: s, score: Math.round((g.demand / (s + 1)) * 10) / 10 }
    })
    .sort((a, b) => b.score - a.score || b.demand - a.demand)
    .slice(0, 20)
}

/** One-line summary for the daily digest (spec 26.13). */
export async function demandDigestLine(now = Date.now()): Promise<[string, string] | null> {
  const r = await demandReport(new Date(now - DAY), new Date(now))
  const total = r.byPillar.reduce((n, p) => n + p.total, 0)
  if (total === 0) return null
  const top = r.recommendations[0]
  const counts = r.byPillar.reduce((acc, p) => {
    for (const [k, v] of Object.entries(p.counts)) acc[k as DemandSource] += v
    return acc
  }, { interest: 0, request: 0, unmatched: 0, declined: 0, search: 0, enquiry: 0 } as Record<DemandSource, number>)
  const parts = [`${counts.interest} interest`, `${counts.request} requests`, `${counts.unmatched + counts.declined} unmet`, `${counts.search} empty searches`]
  return ['Demand (24 h)', `${parts.join(', ')}${top ? `. Top gap: ${top.category} in ${top.place}` : ''}`.slice(0, 200)]
}
