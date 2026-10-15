import { describe, expect, it } from 'vitest'
import { activeChips, countActiveFilters, hasFilters, parsePropertyParams, toQuery } from '@/lib/property-search'

describe('property search URLs', () => {
  it('parses filters and expands "commercial"', () => {
    const f = parsePropertyParams({ type: 'commercial', beds: '2', price_max: '5000000', features: 'lift,moat', page: '3' })
    expect(f.types).toContain('office')
    expect(f.types).toContain('shop')
    expect(f.beds).toBe(2)
    expect(f.features).toEqual(['lift'])
    expect(f.page).toBe(3)
  })
  it('defaults sort to relevance only when searching text', () => {
    expect(parsePropertyParams({}).sort).toBe('newest')
    expect(parsePropertyParams({ q: 'villa' }).sort).toBe('relevance')
  })
  it('round-trips through the query string', () => {
    const f = parsePropertyParams({ type: 'apartment', beds: '2', deed: '1' })
    expect(toQuery(f)).toBe('?type=apartment&beds=2&deed=1')
    expect(parsePropertyParams(Object.fromEntries(new URLSearchParams(toQuery(f).slice(1))))).toEqual(f)
  })
  it('counts and removes filters', () => {
    const f = parsePropertyParams({ type: 'apartment', beds: '2' })
    expect(countActiveFilters(f)).toBe(2)
    expect(hasFilters(f)).toBe(true)
    const chips = activeChips(f, '/property/for-sale')
    expect(chips.map((c) => c.label)).toEqual(['Apartment', '2+ beds'])
    expect(chips[1].href).toBe('/property/for-sale?type=apartment')
  })
  it('ignores junk input safely', () => {
    const f = parsePropertyParams({ beds: '-1', price_min: 'lots', page: '99999', sort: 'drop table' })
    expect(f.beds).toBeUndefined()
    expect(f.priceMin).toBeUndefined()
    expect(f.page).toBe(1)
    expect(f.sort).toBe('newest')
  })
})
