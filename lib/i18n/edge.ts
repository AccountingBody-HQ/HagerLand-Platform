/**
 * Whether the Amharic locale is switched on (admin → Settings), for the middleware (Edge runtime).
 * Read from the public settings view and kept in memory for a minute. Off when unknown.
 */
let cache: { at: number; on: boolean } | null = null
const TTL_MS = 60_000

export async function amharicEnabledEdge(): Promise<boolean> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.on
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return false
  try {
    const res = await fetch(`${url}/rest/v1/site_settings_public?select=value&key=eq.amharic_enabled`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(1500) })
    if (!res.ok) return cache?.on ?? false
    const rows = (await res.json()) as { value: unknown }[]
    cache = { at: Date.now(), on: rows[0]?.value === true }
    return cache.on
  } catch {
    return cache?.on ?? false
  }
}
