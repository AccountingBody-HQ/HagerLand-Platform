import 'server-only'
import { readAll, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { countBy, sumBy, weeklySeries } from './aggregate'
import { must } from '@/lib/admin/must'

export const REPORT_PERIODS = { '30': 30, '90': 90, '365': 365 } as const
export type ReportPeriod = keyof typeof REPORT_PERIODS

export function periodFrom(p: string | undefined): { key: ReportPeriod; since: string; days: number } {
  const key = (p && p in REPORT_PERIODS ? p : '30') as ReportPeriod
  const days = REPORT_PERIODS[key]
  return { key, days, since: new Date(Date.now() - days * 86_400_000).toISOString() }
}

/** Listing counts: all properties by status; published ones by type and by location. */
export async function listingReport() {
  const { data } = await readAll(() => getAdminSupabase().from('properties').select('status, property_type, purpose, location:locations(display_name)'), { maxRows: REPORT_MAX_ROWS })
  const rows = data ?? []
  const live = rows.filter((r) => r.status === 'published')
  return {
    byStatus: countBy(rows, (r) => r.status),
    byType: countBy(live, (r) => `${r.property_type.replace(/_/g, ' ')} · ${r.purpose === 'sale' ? 'for sale' : 'for rent'}`),
    byLocation: countBy(live, (r) => (r.location as { display_name: string } | null)?.display_name ?? 'Unknown'),
  }
}

/** Enquiries received per organisation (and HagerLand / private owners) in the period. */
export async function enquiriesPerOrg(since: string) {
  const { data } = await readAll(() => getAdminSupabase().from('enquiries').select('recipient_org_id, recipient_user_id, status, org:organisations!enquiries_recipient_org_id_fkey(name)').gte('created_at', since).neq('status', 'spam'), { maxRows: REPORT_MAX_ROWS })
  const rows = data ?? []
  const label = (r: (typeof rows)[number]) => (r.org as { name: string } | null)?.name ?? (r.recipient_user_id ? 'Private owners' : 'HagerLand')
  const won = countBy(rows.filter((r) => r.status === 'won'), label)
  const wonMap = new Map(won.map((w) => [w.key, w.count]))
  return countBy(rows, label).map((r) => ({ organisation: r.key, enquiries: r.count, won: wonMap.get(r.key) ?? 0 }))
}

/** Quote values by month (issued quotes) and the pipeline by status. */
export async function quoteReport(since: string) {
  const { data } = await readAll(() => getAdminSupabase().from('quote_requests').select('status, created_at, quoted_at, quoted_total_etb_cents').gte('created_at', since), { maxRows: REPORT_MAX_ROWS })
  const rows = data ?? []
  return {
    byStatus: countBy(rows, (r) => r.status),
    byMonth: sumBy(rows.filter((r) => r.quoted_at), (r) => (r.quoted_at as string).slice(0, 7), (r) => r.quoted_total_etb_cents),
    acceptedCents: rows.filter((r) => r.status === 'accepted').reduce((a, r) => a + (r.quoted_total_etb_cents ?? 0), 0),
    quotedCents: rows.reduce((a, r) => a + (r.quoted_total_etb_cents ?? 0), 0),
    requests: rows.length,
  }
}

export async function signupSeries(weeks: number) {
  const since = new Date(Date.now() - weeks * 7 * 86_400_000).toISOString()
  const db = getAdminSupabase()
  const [{ data: profiles }, { data: enquiries }] = await Promise.all([
    readAll(() => db.from('profiles').select('created_at, account_type').gte('created_at', since), { maxRows: REPORT_MAX_ROWS }),
    readAll(() => db.from('enquiries').select('created_at').gte('created_at', since).neq('status', 'spam'), { maxRows: REPORT_MAX_ROWS }),
  ])
  return {
    signups: weeklySeries((profiles ?? []).map((p) => p.created_at), weeks),
    business: (profiles ?? []).filter((p) => p.account_type === 'business').length,
    total: profiles?.length ?? 0,
    enquiries: weeklySeries((enquiries ?? []).map((e) => e.created_at), weeks),
  }
}

export async function searchMisses(limit = 50) {
  const { data } = must(await getAdminSupabase().from('search_misses').select('q_normalised, vertical, count, last_seen_at').order('count', { ascending: false }).limit(limit))
  return data ?? []
}
