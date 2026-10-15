import { describe, expect, it } from 'vitest'
import { countByAncestors, indexablePaths, typePathCounts } from '@/lib/sitemap-rules'

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
