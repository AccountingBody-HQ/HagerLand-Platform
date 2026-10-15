import { describe, expect, it } from 'vitest'
import { segmentForTypes, splitTypeSegment, typesForSegment } from '@/lib/property-type-paths'
import { COMPARE_MAX, parseCompare, toggleCompare } from '@/lib/compare'

describe('property type paths', () => {
  it('maps segments to types and back', () => {
    expect(typesForSegment('apartments')).toEqual(['apartment'])
    expect(typesForSegment('Land')).toEqual(['land'])
    expect(typesForSegment('bole')).toBeNull()
    expect(segmentForTypes(['apartment'])).toBe('apartments')
    expect(segmentForTypes(['office', 'shop', 'warehouse', 'hotel', 'mixed_use', 'commercial_building'])).toBe('commercial')
    expect(segmentForTypes(['apartment', 'house'])).toBeNull()
  })
  it('splits a type off the end of a location path', () => {
    expect(splitTypeSegment(['addis-ababa', 'bole', 'apartments'])).toEqual({ locationSegments: ['addis-ababa', 'bole'], typeSegment: 'apartments' })
    expect(splitTypeSegment(['addis-ababa', 'bole'])).toEqual({ locationSegments: ['addis-ababa', 'bole'], typeSegment: null })
    expect(splitTypeSegment(['land'])).toEqual({ locationSegments: [], typeSegment: 'land' })
  })
})

describe('compare list', () => {
  const item = (n: number) => ({ id: `00000000-0000-4000-8000-00000000000${n}`, slug: `p-${n}`, title: `P${n}` })
  it('adds, removes and caps at four', () => {
    let list = [item(1), item(2), item(3)]
    list = toggleCompare(list, item(4)).list
    expect(list).toHaveLength(COMPARE_MAX)
    expect(toggleCompare(list, item(5))).toEqual({ list, full: true })
    expect(toggleCompare(list, item(2)).list.map((x) => x.slug)).toEqual(['p-1', 'p-3', 'p-4'])
  })
  it('ignores junk in storage', () => {
    expect(parseCompare('not json')).toEqual([])
    expect(parseCompare(JSON.stringify([{ id: 'x', slug: 'y' }, item(1)]))).toEqual([item(1)])
    expect(parseCompare(JSON.stringify(Array.from({ length: 9 }, (_, i) => item(i + 1 > 9 ? 1 : i + 1))))).toHaveLength(COMPARE_MAX)
  })
})

describe('quote list sync', () => {
  it('merges browser and account lists without duplicating products', async () => {
    const { mergeQuoteLists } = await import('@/lib/quote-list')
    const cement = { key: 'a', productId: '00000000-0000-4000-8000-000000000001', name: 'Cement', unit: 'bag', quantity: 10 }
    const local = [cement, { key: 'c1', name: 'Custom nails', unit: 'kg', quantity: 2 }]
    const remote = [{ ...cement, key: 'b', quantity: 25 }, { key: 'c2', name: 'Custom tiles', unit: 'm2', quantity: 30 }]
    const merged = mergeQuoteLists(local, remote)
    expect(merged.map((m) => [m.name, m.quantity])).toEqual([['Cement', 25], ['Custom nails', 2], ['Custom tiles', 30]])
  })
})

describe('map configuration', () => {
  it('is off unless a full tile URL is configured', async () => {
    const { mapConfigFrom } = await import('@/lib/map-config')
    expect(mapConfigFrom({})).toBeNull()
    expect(mapConfigFrom({ url: 'https://tiles.example.com/{z}/{x}.png' })).toBeNull()
    expect(mapConfigFrom({ url: 'http://evil.example.com/{z}/{x}/{y}.png' })).toBeNull()
    expect(mapConfigFrom({ url: 'https://tiles.example.com/{z}/{x}/{y}.png?key=abc', attribution: '© Example' })).toEqual({ tileUrl: 'https://tiles.example.com/{z}/{x}/{y}.png?key=abc', attribution: '© Example' })
  })
})
