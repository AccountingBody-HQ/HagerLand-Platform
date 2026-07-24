import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken } from '@/lib/admin-auth'
const SESSION_COOKIE = 'hl_admin_session'

interface PlaceResult {
  place_id: string
  name: string
  formatted_address: string
  types: string[]
}

export async function GET(request: NextRequest) {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')
  const pagetoken = searchParams.get('pagetoken')

  if (!query && !pagetoken) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  // Build URL — pagetoken replaces query on subsequent pages
  let url: string
  if (pagetoken) {
    // Google requires a 2-second delay before using pagetoken — handled client-side
    url = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${pagetoken}&key=${apiKey}`
  } else {
    // Use exactTerms for high precision matching of the search query
    url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query ?? '')}&key=${apiKey}`
  }

  const res = await fetch(url, { cache: 'no-store' })
  const data = await res.json()

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    return NextResponse.json({ error: data.status }, { status: 500 })
  }

  const results = (data.results || []).map((place: PlaceResult) => ({
    google_place_id: place.place_id,
    name: place.name,
    address: place.formatted_address,
    city: extractCity(place.formatted_address),
    country: extractCountry(place.formatted_address),
    types: place.types,
  }))

  return NextResponse.json({
    results,
    next_page_token: data.next_page_token ?? null,
    total: results.length,
  })
}

function extractCity(address: string): string {
  if (!address) return ''
  const parts = address.split(',')
  const raw = parts.length >= 2 ? parts[parts.length - 2].trim() : parts[0].trim()
  return raw.replace(/^[0-9A-Z\s-]{2,10}\s+/, '').trim()
}

function extractCountry(address: string): string {
  if (!address) return ''
  const parts = address.split(',')
  return parts[parts.length - 1].trim()
}
