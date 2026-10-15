import type { VerticalKey, VerticalStatus } from '@/lib/verticals'

/**
 * Vertical statuses for middleware (Edge runtime): read from the public registry view and kept
 * in memory for a minute, so pages of a vertical that is not live can be marked noindex.
 */
let cache: { at: number; statuses: Map<string, VerticalStatus> } | null = null
const TTL_MS = 60_000

export async function verticalStatusesEdge(): Promise<Map<string, VerticalStatus> | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.statuses
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  try {
    const res = await fetch(`${url}/rest/v1/verticals_public?select=key,status`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(1500),
    })
    if (!res.ok) return cache?.statuses ?? null
    const rows = (await res.json()) as { key: string; status: VerticalStatus }[]
    cache = { at: Date.now(), statuses: new Map(rows.map((r) => [r.key, r.status])) }
    return cache.statuses
  } catch {
    return cache?.statuses ?? null
  }
}

/** Live verticals are indexable; coming-soon and hidden ones (absent from the view) are not. */
export function isIndexableVertical(statuses: Map<string, VerticalStatus>, key: VerticalKey): boolean {
  return statuses.get(key) === 'live'
}

let pillarCache: { at: number; statuses: Map<string, VerticalStatus> } | null = null

/** Pillar statuses by hub slug (spec 26.3), from the public pillar view, kept for a minute like the verticals. */
export async function pillarStatusesEdge(): Promise<Map<string, VerticalStatus> | null> {
  if (pillarCache && Date.now() - pillarCache.at < TTL_MS) return pillarCache.statuses
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  try {
    const res = await fetch(`${url}/rest/v1/pillars_public?select=slug,status`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(1500),
    })
    if (!res.ok) return pillarCache?.statuses ?? null
    const rows = (await res.json()) as { slug: string; status: VerticalStatus }[]
    pillarCache = { at: Date.now(), statuses: new Map(rows.map((r) => [r.slug, r.status])) }
    return pillarCache.statuses
  } catch {
    return pillarCache?.statuses ?? null
  }
}
