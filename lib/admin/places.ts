import 'server-only'
import { log } from '@/lib/log'
import type { AddressComponent } from './place-mapping'

/**
 * Google Places API (New). Search uses POST places:searchText with pageToken in the POST body
 * (the legacy API refuses pagination for HagerLand's key). Only discovery data is stored:
 * never Google reviews, ratings or photos.
 */
export interface PlaceSummary {
  google_place_id: string
  name: string
  address: string
  types: string[]
  addressComponents: AddressComponent[]
}

export interface PlaceDetails extends PlaceSummary {
  internationalPhone?: string
  nationalPhone?: string
  website?: string
  lat?: number
  lng?: number
  businessStatus?: string
}

interface NewPlace {
  id: string
  displayName?: { text?: string }
  formattedAddress?: string
  addressComponents?: AddressComponent[]
  types?: string[]
  internationalPhoneNumber?: string
  nationalPhoneNumber?: string
  websiteUri?: string
  location?: { latitude?: number; longitude?: number }
  businessStatus?: string
}

const MAX_PAGES = 3

function key(): string {
  const k = process.env.GOOGLE_PLACES_API_KEY
  if (!k) throw new PlacesError('Google Places is not configured (GOOGLE_PLACES_API_KEY).')
  return k
}

export class PlacesError extends Error {}

function summary(p: NewPlace): PlaceSummary {
  return { google_place_id: p.id, name: p.displayName?.text ?? '', address: p.formattedAddress ?? '', types: p.types ?? [], addressComponents: p.addressComponents ?? [] }
}

export async function searchPlaces(query: string): Promise<PlaceSummary[]> {
  const apiKey = key()
  const out: PlaceSummary[] = []
  let pageToken: string | undefined
  for (let page = 0; page < MAX_PAGES; page++) {
    const body: Record<string, unknown> = { textQuery: query, pageSize: 20, regionCode: 'ET' }
    if (pageToken) body.pageToken = pageToken
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.addressComponents,places.types,nextPageToken',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
    const data = (await res.json().catch(() => ({}))) as { places?: NewPlace[]; nextPageToken?: string; error?: { status?: string; message?: string } }
    if (!res.ok || data.error) {
      log.error('places', 'search failed', data.error ?? res.status, { page })
      if (page === 0) throw new PlacesError(`Google search failed (${data.error?.status ?? res.status}).`)
      break
    }
    out.push(...(data.places ?? []).map(summary))
    pageToken = data.nextPageToken
    if (!pageToken) break
  }
  return out
}

export async function placeDetails(placeId: string): Promise<PlaceDetails> {
  if (!/^[A-Za-z0-9_-]{10,300}$/.test(placeId)) throw new PlacesError('Invalid place id.')
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    cache: 'no-store',
    headers: {
      'X-Goog-Api-Key': key(),
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,addressComponents,types,internationalPhoneNumber,nationalPhoneNumber,websiteUri,location,businessStatus',
    },
    signal: AbortSignal.timeout(15_000),
  })
  const data = (await res.json().catch(() => ({}))) as NewPlace & { error?: { status?: string } }
  if (!res.ok || data.error) throw new PlacesError(`Google details failed (${data.error?.status ?? res.status}).`)
  return {
    ...summary(data),
    internationalPhone: data.internationalPhoneNumber,
    nationalPhone: data.nationalPhoneNumber,
    website: data.websiteUri,
    lat: data.location?.latitude,
    lng: data.location?.longitude,
    businessStatus: data.businessStatus,
  }
}
