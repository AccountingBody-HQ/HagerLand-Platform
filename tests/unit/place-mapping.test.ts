import { describe, expect, it } from 'vitest'
import { importSection, matchLocation, placePhone, placeWebsite } from '@/lib/admin/place-mapping'

const LOCS = [
  { id: 'aa', name: 'Addis Ababa', level: 'city', parent_id: null },
  { id: 'bole', name: 'Bole', level: 'sub_city', parent_id: 'aa' },
  { id: 'cmc', name: 'CMC', level: 'area', parent_id: 'yeka' },
  { id: 'hw', name: 'Hawassa', level: 'city', parent_id: 'sidama' },
]

describe('place mapping', () => {
  it('picks the most specific matching location', () => {
    expect(matchLocation([{ longText: 'Addis Ababa', types: ['locality'] }, { longText: 'Bole', types: ['sublocality'] }], '', LOCS, null)).toBe('bole')
    expect(matchLocation([], 'Africa Ave, Bole, Addis Abeba, Ethiopia', LOCS, null)).toBe('bole')
    expect(matchLocation([{ longText: 'Awassa' }], '', LOCS, null)).toBe('hw')
    expect(matchLocation([{ longText: 'Nairobi' }], 'Nairobi, Kenya', LOCS, 'aa')).toBe('aa')
  })

  it('normalises Ethiopian phone numbers', () => {
    expect(placePhone('+251 11 123 4567', undefined)).toBe('+251111234567')
    expect(placePhone(undefined, '011 123 4567')).toBe('+251111234567')
    expect(placePhone(undefined, '0911 23 45 67')).toBe('+251911234567')
    expect(placePhone('+254 20 1234567', undefined)).toBeNull()
    expect(placePhone(undefined, undefined)).toBeNull()
  })

  it('cleans websites', () => {
    expect(placeWebsite('https://example.et/?utm_source=google&x=1')).toBe('https://example.et/?x=1')
    expect(placeWebsite('javascript:alert(1)')).toBeNull()
    expect(placeWebsite('not a url')).toBeNull()
  })

  it('builds the import section', () => {
    expect(importSection('supplier')).toBe('org_supplier')
  })
})
