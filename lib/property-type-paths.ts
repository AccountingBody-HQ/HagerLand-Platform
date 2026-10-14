import type { PropertyType } from '@/lib/labels'

/**
 * URL segments for property-type landing pages (spec 25.2l), e.g. /property/for-sale/addis-ababa/bole/apartments.
 * Each type has one plural segment; "commercial" groups the commercial types (as the existing filter does).
 */
export const TYPE_PATHS: { segment: string; types: PropertyType[] }[] = [
  { segment: 'apartments', types: ['apartment'] },
  { segment: 'condominiums', types: ['condominium'] },
  { segment: 'houses', types: ['house'] },
  { segment: 'villas', types: ['villa'] },
  { segment: 'townhouses', types: ['townhouse'] },
  { segment: 'g-plus-buildings', types: ['g_plus_building'] },
  { segment: 'rooms', types: ['room'] },
  { segment: 'studios', types: ['studio'] },
  { segment: 'land', types: ['land'] },
  { segment: 'commercial', types: ['commercial_building', 'office', 'shop', 'warehouse', 'hotel', 'mixed_use'] },
  { segment: 'offices', types: ['office'] },
  { segment: 'shops', types: ['shop'] },
  { segment: 'warehouses', types: ['warehouse'] },
]

export function typesForSegment(segment: string | undefined): PropertyType[] | null {
  if (!segment) return null
  return TYPE_PATHS.find((t) => t.segment === segment.toLowerCase())?.types ?? null
}

/** The path segment for a set of filtered types, when it matches exactly one type page. */
export function segmentForTypes(types: PropertyType[]): string | null {
  if (types.length === 0) return null
  const key = [...types].sort().join(',')
  return TYPE_PATHS.find((t) => [...t.types].sort().join(',') === key)?.segment ?? null
}

/**
 * Splits catch-all segments into a location path and an optional type segment.
 * The last segment is a type only when it is a known type word (location slugs never use these words
 * as their last part, and a real location always wins: callers check the full path as a location first).
 */
export function splitTypeSegment(segments: string[]): { locationSegments: string[]; typeSegment: string | null } {
  const last = segments[segments.length - 1]
  if (last && typesForSegment(last)) return { locationSegments: segments.slice(0, -1), typeSegment: last.toLowerCase() }
  return { locationSegments: segments, typeSegment: null }
}
