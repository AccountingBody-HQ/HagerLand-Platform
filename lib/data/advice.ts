import 'server-only'
import { getPublicSupabase } from '@/lib/supabase/public'
import { safeQuery, unwrap } from './safe'
import { listTag } from '@/lib/revalidate'

export const ADVICE_TAG = 'advice'

export interface InsightRow {
  location_id: string | null
  location_path: string | null
  location_name: string | null
  location_level: string | null
  purpose: 'sale' | 'rent'
  property_type: string
  sample_count: number
  median_etb: number
  p25_etb: number
  p75_etb: number
  min_etb: number
  max_etb: number
  refreshed_at: string
}

const COLUMNS = 'location_id, location_path, location_name, location_level, purpose, property_type, sample_count, median_etb, p25_etb, p75_etb, min_etb, max_etb, refreshed_at'

/**
 * Asking-price figures from live listings (spec 26.10), only where enough listings exist (admin minimum sample).
 * Refreshed by the daily job. These are asking prices on HagerLand, never valuations.
 */
export async function getMarketInsight(opts: { purpose?: 'sale' | 'rent'; locationId?: string | null } = {}): Promise<InsightRow[]> {
  return safeQuery('market insight', [], async () => {
    let q = getPublicSupabase({ tags: [ADVICE_TAG, listTag('property')], revalidate: 3600 }).from('market_insight_public').select(COLUMNS).order('sample_count', { ascending: false }).limit(500)
    if (opts.purpose) q = q.eq('purpose', opts.purpose)
    if (opts.locationId !== undefined) q = opts.locationId === null ? q.is('location_id', null) : q.eq('location_id', opts.locationId)
    return (unwrap(await q, 'market insight') ?? []) as InsightRow[]
  })
}

export interface AreaGuide {
  notes: string
  faqs: { question: string; answer: string }[]
  updated_at: string
}

/** The admin-written notes and FAQs for a place, once published. */
export async function getAreaGuide(locationId: string): Promise<AreaGuide | null> {
  return safeQuery<AreaGuide | null>('area guide', null, async () => {
    const { data, error } = await getPublicSupabase({ tags: [ADVICE_TAG], revalidate: 600 }).from('area_guides_public').select('notes, faqs, updated_at').eq('location_id', locationId).limit(1)
    if (error) throw error
    const row = data?.[0]
    if (!row) return null
    const faqs = Array.isArray(row.faqs) ? (row.faqs as unknown[]).filter((f): f is { question: string; answer: string } => Boolean(f) && typeof (f as { question?: unknown }).question === 'string' && typeof (f as { answer?: unknown }).answer === 'string') : []
    return { notes: row.notes ?? '', faqs, updated_at: row.updated_at ?? '' }
  })
}
