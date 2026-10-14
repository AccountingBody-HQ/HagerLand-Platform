/** Pure helpers for app/sitemap.ts. Unit-tested. */

import { TYPE_PATHS } from '@/lib/property-type-paths'

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

/**
 * Counts for property-type pages: "apartments" (nationwide) and "addis-ababa/bole/apartments" for every
 * ancestor of each listing's location. A type can belong to two pages (e.g. offices and commercial).
 */
export function typePathCounts(rows: { path: string | null | undefined; type: string | null | undefined }[]): Map<string, number> {
  const out = new Map<string, number>()
  const bump = (k: string) => out.set(k, (out.get(k) ?? 0) + 1)
  for (const r of rows) {
    if (!r.type) continue
    const segments = TYPE_PATHS.filter((t) => (t.types as string[]).includes(r.type as string)).map((t) => t.segment)
    const parts = (r.path ?? '').split('/').filter(Boolean)
    for (const seg of segments) {
      bump(seg)
      for (let i = 1; i <= parts.length; i++) bump(`${parts.slice(0, i).join('/')}/${seg}`)
    }
  }
  return out
}
