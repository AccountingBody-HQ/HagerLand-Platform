/** Pure helpers for app/sitemap.ts. Unit-tested. */

import { TYPE_PATHS } from '@/lib/property-type-paths'
import { CANONICAL_URL } from '@/lib/site'

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

export const SITEMAP_IDS = ['static', 'properties', 'developments', 'products', 'companies', 'locations-sale', 'locations-rent', 'professionals', 'categories', 'jobs', 'guides'] as const
export type SitemapId = (typeof SITEMAP_IDS)[number]

/** robots.txt Disallow rules on production. No sitemap may list a path under one of them. */
export const ROBOTS_DISALLOW = ['/roodber8', '/roodber8-login', '/api/', '/account', '/onboarding', '/auth', '/search', '/supplies/quote', '/dev/', '/requests/', '/request-service/sent', '/alerts/', '/property/compare'] as const

/** Fixed pages for the static sitemap; app/sitemap.ts drops those whose vertical or agency service is not live. */
export const STATIC_PATHS = ['/', '/property', '/property/for-sale', '/property/to-rent', '/supplies', '/supplies/materials-list', '/professionals', '/agents', '/developers', '/suppliers', '/developments', '/our-developments', '/about', '/how-it-works', '/list-with-us', '/advertise', '/request-service', '/agency', '/agency/sell', '/agency/let', '/agency/buyer-representation', '/agency/property-sourcing', '/agency/developer-sales', '/diaspora/property-care', '/diaspora/services-abroad', '/contact', '/help', '/terms', '/privacy', '/cookies']

/** Origin for the sitemap index and the robots.txt Sitemap lines: NEXT_PUBLIC_SITE_URL, else the canonical host. */
export function sitemapOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || CANONICAL_URL).replace(/\/+$/, '')
}

/** Every sitemap URL in robots.txt order: the index first, then one per content type. robots.ts and the index both use it. */
export function sitemapUrls(origin = sitemapOrigin()): { index: string; children: string[] } {
  return { index: `${origin}/sitemap.xml`, children: SITEMAP_IDS.map((id) => `${origin}/sitemap/${id}.xml`) }
}

/** The /sitemap.xml body: a sitemap index pointing at each per-type sitemap. */
export function sitemapIndexXml(children: string[]): string {
  const items = children.map((loc) => `<sitemap><loc>${loc}</loc></sitemap>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`
}

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
