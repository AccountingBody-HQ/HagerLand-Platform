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

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`

  const res = await fetch(url)
  const data = await res.json()

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    return NextResponse.json({ error: data.status }, { status: 500 })
  }

  const results = (data.results || []).slice(0, 10).map((place: PlaceResult) => ({
    google_place_id: place.place_id,
    name: place.name,
    address: place.formatted_address,
    city: extractCity(place.formatted_address),
    types: place.types,
  }))

  return NextResponse.json({ results })
}

function extractCity(address: string): string {
  if (!address) return ''
  const parts = address.split(',')
  if (parts.length >= 2) {
    return parts[parts.length - 2].trim()
  }
  return parts[0].trim()
}
