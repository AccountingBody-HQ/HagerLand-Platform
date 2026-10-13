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
