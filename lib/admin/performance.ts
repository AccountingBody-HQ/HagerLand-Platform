import 'server-only'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { PILLAR_KEYS, VERTICAL_PILLAR, type PillarKey } from '@/lib/pillars'
import { isVerticalKey } from '@/lib/verticals'

export interface PillarKpis {
  pillar: PillarKey
  leads: number
  medianFirstResponseHours: number | null
  won: number
  conversion: number | null
  revenueEtb: number
  activeListings: number | null
  providers: number
}

function median(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

const hours = (from: string, to: string) => (new Date(to).getTime() - new Date(from).getTime()) / 3_600_000

/**
 * Pillar performance (spec 26.14): leads, median first-response time, conversion to won, revenue from the deals
 * ledger, active listings and live providers or partners, per pillar over a period.
 * Leads: service requests, enquiries and agency/project/care records attributed to their pillar.
 * First response: provider answer to a request (or HagerLand's first look at an enquiry).
 * Revenue: commissions, lead fees and agency fees recorded in Deals (whole birr; other currencies are left out).
 */
export async function pillarKpis(since: Date): Promise<PillarKpis[]> {
  const db = getAdminSupabase()
  const from = since.toISOString()
  const head = { count: 'exact' as const, head: true }
  const [requests, matches, enquiries, deals, valuations, viewings, applications, projects, care, quotes, interestFinance, interestInsurance, props, products, jobs] = await Promise.all([
    db.from('service_requests').select('vertical_key, status').gte('created_at', from).limit(50000),
    db.from('service_request_matches').select('offered_at, responded_at, request:service_requests!inner(vertical_key, created_at)').gte('offered_at', from).not('responded_at', 'is', null).limit(50000),
    db.from('enquiries').select('target_type, status, created_at, first_viewed_at').gte('created_at', from).limit(50000),
    db.from('deals').select('pillar_key, source_type, currency, commission_minor, lead_fee_minor, status, created_at').gte('created_at', from).in('status', ['won', 'invoiced', 'paid']).limit(50000),
    db.from('agency_valuations').select('purpose').gte('created_at', from).limit(50000),
    db.from('agency_viewings').select('id, property:properties(purpose)').gte('created_at', from).limit(50000),
    db.from('rental_applications').select('id', head).gte('created_at', from),
    db.from('build_projects').select('id', head).gte('created_at', from),
    db.from('property_care_requests').select('id', head).gte('created_at', from),
    db.from('quote_requests').select('status').gte('created_at', from).limit(50000),
    db.from('interest_registrations').select('id', head).eq('vertical_key', 'finance').gte('created_at', from),
    db.from('interest_registrations').select('id', head).eq('vertical_key', 'insurance').gte('created_at', from),
    db.from('properties').select('purpose').eq('status', 'published').limit(100000),
    db.from('products').select('id', head).eq('status', 'published'),
    db.from('job_posts').select('id', head).eq('status', 'published'),
  ])
  const zero = () => ({ leads: 0, won: 0, resp: [] as number[], revenue: 0 })
  const acc = new Map<PillarKey, ReturnType<typeof zero>>(PILLAR_KEYS.map((k) => [k, zero()]))
  const of = (v: string | null | undefined) => (v && isVerticalKey(v) ? VERTICAL_PILLAR[v] : null)
  for (const r of requests.data ?? []) {
    const p = of(r.vertical_key)
    if (!p) continue
    acc.get(p)!.leads++
    if (r.status === 'won') acc.get(p)!.won++
  }
  for (const m of matches.data ?? []) {
    const req = Array.isArray(m.request) ? m.request[0] : m.request
    const p = of(req?.vertical_key)
    if (p && m.responded_at) acc.get(p)!.resp.push(hours(m.offered_at, m.responded_at))
  }
  for (const e of enquiries.data ?? []) {
    const p: PillarKey | null = ['property', 'development', 'hagerland_development'].includes(e.target_type) ? 'buy' : e.target_type === 'product' ? 'supplies' : e.target_type === 'organisation' ? 'build' : null
    if (!p) continue
    const a = acc.get(p)!
    a.leads++
    if (e.status === 'won') a.won++
    if (e.first_viewed_at) a.resp.push(hours(e.created_at, e.first_viewed_at))
  }
  for (const v of valuations.data ?? []) acc.get(v.purpose === 'rent' ? 'rent' : 'buy')!.leads++
  for (const v of viewings.data ?? []) {
    const prop = Array.isArray(v.property) ? v.property[0] : v.property
    acc.get(prop?.purpose === 'rent' ? 'rent' : 'buy')!.leads++
  }
  acc.get('rent')!.leads += applications.count ?? 0
  acc.get('build')!.leads += projects.count ?? 0
  acc.get('manage')!.leads += care.count ?? 0
  acc.get('finance')!.leads += interestFinance.count ?? 0
  acc.get('insurance')!.leads += interestInsurance.count ?? 0
  for (const q of quotes.data ?? []) {
    const a = acc.get('supplies')!
    a.leads++
    if (q.status === 'accepted') a.won++
  }
  for (const d of deals.data ?? []) {
    const p = (d.pillar_key as PillarKey | null) ?? (d.source_type === 'quote_request' ? 'supplies' : d.source_type === 'property_care' ? 'manage' : null)
    if (!p || d.currency !== 'ETB') continue
    acc.get(p)!.revenue += Math.round(((d.commission_minor ?? 0) + (d.lead_fee_minor ?? 0)) / 100)
  }
  const sale = (props.data ?? []).filter((p) => p.purpose === 'sale').length
  const rent = (props.data ?? []).filter((p) => p.purpose === 'rent').length
  const listings: Partial<Record<PillarKey, number>> = { buy: sale, rent, supplies: products.count ?? 0, jobs: jobs.count ?? 0 }
  const providers = await Promise.all(PILLAR_KEYS.map(async (k) => [k, ((await db.rpc('pillar_active_providers', { p_pillar: k })).data as number | null) ?? 0] as const))
  return PILLAR_KEYS.map((k) => {
    const a = acc.get(k)!
    const med = median(a.resp)
    return {
      pillar: k,
      leads: a.leads,
      medianFirstResponseHours: med === null ? null : Math.round(med * 10) / 10,
      won: a.won,
      conversion: a.leads ? Math.round((a.won / a.leads) * 1000) / 10 : null,
      revenueEtb: a.revenue,
      activeListings: listings[k] ?? null,
      providers: providers.find(([p]) => p === k)?.[1] ?? 0,
    }
  })
}
