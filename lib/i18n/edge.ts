/**
 * Whether the Amharic versions are switched on, for the middleware (Edge runtime): the site-wide switch (admin →
 * Settings, amharic_enabled) and Amharic for Jobs (Jobs Phase 5, jobs_amharic). Read from the public settings view and
 * kept in memory for a minute. Off when unknown.
 */
let cache: { at: number; site: boolean; jobs: boolean } | null = null
const TTL_MS = 60_000

export async function amharicSwitchesEdge(): Promise<{ site: boolean; jobs: boolean }> {
  if (cache && Date.now() - cache.at < TTL_MS) return { site: cache.site, jobs: cache.jobs }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { site: false, jobs: false }
  try {
    const res = await fetch(`${url}/rest/v1/site_settings_public?select=key,value&key=in.(amharic_enabled,jobs_amharic)`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(1500) })
    if (!res.ok) return { site: cache?.site ?? false, jobs: cache?.jobs ?? false }
    const rows = (await res.json()) as { key: string; value: unknown }[]
    cache = { at: Date.now(), site: rows.find((r) => r.key === 'amharic_enabled')?.value === true, jobs: rows.find((r) => r.key === 'jobs_amharic')?.value === true }
    return { site: cache.site, jobs: cache.jobs }
  } catch {
    return { site: cache?.site ?? false, jobs: cache?.jobs ?? false }
  }
}

/** The site-wide switch only (as before Jobs Phase 5). */
export async function amharicEnabledEdge(): Promise<boolean> {
  return (await amharicSwitchesEdge()).site
}
