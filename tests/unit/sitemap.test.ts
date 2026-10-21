import { afterEach, describe, expect, it, vi } from 'vitest'
import { countByAncestors, indexablePaths, ROBOTS_DISALLOW, SITEMAP_IDS, sitemapIndexXml, sitemapOrigin, sitemapUrls, STATIC_PATHS, typePathCounts } from '@/lib/sitemap-rules'

describe('sitemap rules', () => {
  it('counts records for each ancestor location', () => {
    const c = countByAncestors(['addis-ababa/bole/cmc', 'addis-ababa/bole', 'addis-ababa/yeka', null, 'oromia/adama'])
    expect(c.get('addis-ababa')).toBe(3)
    expect(c.get('addis-ababa/bole')).toBe(2)
    expect(c.get('addis-ababa/bole/cmc')).toBe(1)
    expect(c.get('oromia')).toBe(1)
  })

  it('keeps only paths at or above the threshold', () => {
    const c = countByAncestors(['a/b', 'a/b', 'a/c', 'd'])
    expect(indexablePaths(c, 2)).toEqual(['a', 'a/b'])
    expect(indexablePaths(c, 0)).toEqual(['a', 'a/b', 'a/c', 'd'])
  })
})

describe('property-type pages in sitemaps', () => {
  it('counts each listing for its type page, nationwide and per ancestor place', () => {
    const counts = typePathCounts([
      { path: 'addis-ababa/bole', type: 'apartment' },
      { path: 'addis-ababa/bole', type: 'apartment' },
      { path: 'addis-ababa/yeka', type: 'office' },
    ])
    expect(counts.get('apartments')).toBe(2)
    expect(counts.get('addis-ababa/bole/apartments')).toBe(2)
    expect(counts.get('addis-ababa/offices')).toBe(1)
    expect(counts.get('addis-ababa/commercial')).toBe(1)
    expect(indexablePaths(counts, 2)).toEqual(['addis-ababa/apartments', 'addis-ababa/bole/apartments', 'apartments'])
  })
})

describe('sitemap index and robots.txt', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('lists every per-type sitemap in the index', () => {
    const { children, index } = sitemapUrls('https://www.hagerland.com')
    expect(index).toBe('https://www.hagerland.com/sitemap.xml')
    const xml = sitemapIndexXml(children)
    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    expect(Array.from(xml.matchAll(/<sitemap><loc>([^<]+)<\/loc><\/sitemap>/g)).map((m) => m[1])).toEqual(SITEMAP_IDS.map((id) => `https://www.hagerland.com/sitemap/${id}.xml`))
  })

  it('uses NEXT_PUBLIC_SITE_URL, else the canonical host', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    expect(sitemapOrigin()).toBe('https://www.hagerland.com')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.hagerland.com/')
    expect(sitemapOrigin()).toBe('https://www.hagerland.com')
  })

  it('robots.txt names the index first, then the same sitemaps as the index', async () => {
    vi.resetModules()
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.hagerland.com')
    const robots = (await import('@/app/robots')).default()
    const { index, children } = sitemapUrls()
    expect(robots.sitemap).toEqual([index, ...children])
    expect(robots.rules).toMatchObject({ disallow: [...ROBOTS_DISALLOW] })
  })

  it('the static sitemap lists no private, disallowed or non-canonical path', () => {
    const banned = ['/roodber8', '/roodber8-login', '/api', '/account', '/onboarding', '/auth', '/search', '/dev', ...ROBOTS_DISALLOW]
    for (const p of STATIC_PATHS) {
      expect(p.startsWith('/'), p).toBe(true)
      expect(banned.some((b) => p === b.replace(/\/$/, '') || p.startsWith(b.endsWith('/') ? b : `${b}/`)), p).toBe(false)
    }
  })
})
