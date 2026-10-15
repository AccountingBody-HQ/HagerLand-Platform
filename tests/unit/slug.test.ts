import { describe, expect, it } from 'vitest'
import { listingSlug, shortId, shortIdFromSlug, slugify } from '@/lib/slug'

describe('slugs', () => {
  it('makes readable ASCII slugs', () => {
    expect(slugify('3-Bed Apartment, Bole (Addis Ababa)')).toBe('3-bed-apartment-bole-addis-ababa')
    expect(slugify('Café & Co + More')).toBe('cafe-and-co-plus-more')
  })
  it('drops Ethiopic characters but keeps the rest', () => expect(slugify('ሀገር HagerLand ቤት')).toBe('hagerland'))
  it('builds listing slugs ending in the short id', () => {
    const id = shortId()
    expect(id).toMatch(/^[0-9a-z]{8}$/)
    const slug = listingSlug('2-bed apartment to rent Bole Addis Ababa', id)
    expect(slug.endsWith(`-${id}`)).toBe(true)
    expect(shortIdFromSlug(slug)).toBe(id)
  })
  it('treats slugs without a short id as legacy', () => {
    // Old listing URLs used UUIDs, whose last segment is 12 characters: no short id, so they redirect.
    expect(shortIdFromSlug('2b4c1d2e-1111-2222-3333-444455556666')).toBeNull()
    expect(shortIdFromSlug('my-house')).toBeNull()
  })
})
