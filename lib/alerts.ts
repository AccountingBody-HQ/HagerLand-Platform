import 'server-only'
import { readAll, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { propertySearchArgs, type PublicProperty } from '@/lib/data/properties'
import { parsePropertyParams } from '@/lib/property-search'
import { sendEmail } from '@/lib/email/send'
import { savedSearchAlertEmail } from '@/lib/email/templates'
import { canonicalUrl } from '@/lib/site'
import { formatETB } from '@/lib/format'
import { log } from '@/lib/log'

/** What a saved property search stores: purpose, location path and the filter query string (spec 25.2a). */
export interface SavedSearchParams {
  purpose: 'sale' | 'rent'
  location: string | null
  query: string
}

export function parseSavedParams(v: unknown): SavedSearchParams | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (o.purpose !== 'sale' && o.purpose !== 'rent') return null
  return {
    purpose: o.purpose,
    location: typeof o.location === 'string' && /^[a-z0-9/-]{1,200}$/.test(o.location) ? o.location : null,
    query: typeof o.query === 'string' ? o.query.slice(0, 1000) : '',
  }
}

export function resultsPath(p: SavedSearchParams): string {
  const base = `/property/${p.purpose === 'sale' ? 'for-sale' : 'to-rent'}${p.location ? `/${p.location}` : ''}`
  return p.query ? `${base}?${p.query}` : base
}

/** Listings matching the search that were published after `since`, newest first (at most 10). */
export async function newMatches(p: SavedSearchParams, since: string): Promise<PublicProperty[]> {
  const db = getAdminSupabase()
  let locationId: string | null = null
  if (p.location) {
    const { data } = await db.from('locations').select('id').eq('path', p.location).maybeSingle()
    if (!data) return []
    locationId = data.id
  }
  const filters = { ...parsePropertyParams(Object.fromEntries(new URLSearchParams(p.query))), sort: 'newest' as const, page: 1 }
  const { data, error } = await db.rpc('search_properties', propertySearchArgs({ purpose: p.purpose, locationId, filters, pageSize: 48 }))
  if (error) throw error
  const items = ((data as unknown as { items?: PublicProperty[] })?.items ?? []).filter((x) => x.published_at && x.published_at > since)
  return items.slice(0, 10)
}

async function emailFor(userId: string): Promise<string | null> {
  return (await getAdminSupabase().auth.admin.getUserById(userId)).data.user?.email ?? null
}

/** Sends one alert email for a saved search if there is anything new. Returns true when sent. */
export async function sendAlert(search: { id: string; user_id: string; name: string; params: unknown; last_sent_at: string | null; created_at: string; unsubscribe_token: string }, only?: string): Promise<boolean> {
  const p = parseSavedParams(search.params)
  if (!p) return false
  let items = await newMatches(p, search.last_sent_at ?? search.created_at)
  if (only) items = items.filter((x) => x.id === only)
  if (items.length === 0) return false
  const to = await emailFor(search.user_id)
  if (!to) return false
  const sent = await sendEmail({
    to,
    ...savedSearchAlertEmail({
      searchName: search.name,
      items: items.map((x) => ({ title: x.title ?? 'Property', price: x.price_on_request || x.price_etb === null ? 'Price on request' : `${formatETB(x.price_etb)}${x.price_period === 'month' ? ' a month' : ''}`, place: x.location_display ?? '', url: canonicalUrl(`/property/${x.slug}`) })),
      resultsUrl: canonicalUrl(resultsPath(p)),
      manageUrl: canonicalUrl('/account/alerts'),
      unsubscribeUrl: canonicalUrl(`/alerts/unsubscribe?token=${search.unsubscribe_token}`),
    }),
  })
  if (sent) await getAdminSupabase().from('saved_searches').update({ last_sent_at: new Date().toISOString() }).eq('id', search.id)
  return sent
}

/** Daily and weekly alerts (daily job). Each search is checked at most once per period. */
export async function runScheduledAlerts(now = Date.now()): Promise<number> {
  const db = getAdminSupabase()
  const due = (freq: 'daily' | 'weekly', hours: number) =>
    db.from('saved_searches').select('id, user_id, name, params, last_sent_at, created_at, unsubscribe_token').eq('alert_frequency', freq).or(`last_sent_at.is.null,last_sent_at.lt.${new Date(now - hours * 3_600_000).toISOString()}`).limit(1000)
  const [{ data: daily }, { data: weekly }] = await Promise.all([due('daily', 20), due('weekly', 156)])
  let sent = 0
  for (const s of [...(daily ?? []), ...(weekly ?? [])]) {
    try {
      if (await sendAlert(s)) sent++
    } catch (err) {
      log.error('alerts', 'alert failed', err, { search: s.id })
    }
  }
  return sent
}

/** "Instant" alerts for one newly published listing (called when HagerLand approves it). Never throws. */
export async function sendInstantAlerts(propertyId: string): Promise<void> {
  try {
    // Fix F-1: every instant alert, page by page (a cap would silently leave people out).
    const { data } = await readAll(() => getAdminSupabase().from('saved_searches').select('id, user_id, name, params, last_sent_at, created_at, unsubscribe_token').eq('alert_frequency', 'instant'), { maxRows: REPORT_MAX_ROWS })
    for (const s of data ?? []) await sendAlert({ ...s, last_sent_at: new Date(Date.now() - 86_400_000).toISOString() }, propertyId)
  } catch (err) {
    log.error('alerts', 'instant alerts failed', err)
  }
}
