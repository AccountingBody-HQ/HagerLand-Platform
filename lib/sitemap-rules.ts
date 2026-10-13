/** Pure helpers for app/sitemap.ts. Unit-tested. */

/** Counts every record once for its location and once for each ancestor ("addis-ababa/bole/cmc" → 3 paths). */
export function countByAncestors(paths: (string | null | undefined)[]): Map<string, number> {
  const out = new Map<string, number>()
  for (const p of paths) {
    if (!p) continue
    const parts = p.split('/')
    for (let i = 1; i <= parts.length; i++) {
      const key = parts.slice(0, i).join('/')
      out.set(key, (out.get(key) ?? 0) + 1)
    }
  }
  return out
}

/** Location paths that meet the indexing threshold, i.e. the landing pages that are not noindex. */
export function indexablePaths(counts: Map<string, number>, min: number): string[] {
  return Array.from(counts)
    .filter(([, n]) => n >= Math.max(1, min))
    .map(([p]) => p)
    .sort()
}

export const SITEMAP_IDS = ['static', 'properties', 'developments', 'products', 'companies', 'locations-sale', 'locations-rent', 'professionals', 'categories'] as const
export type SitemapId = (typeof SITEMAP_IDS)[number]
