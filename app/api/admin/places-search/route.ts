import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken } from '@/lib/admin-auth'

const SESSION_COOKIE = 'hl_admin_session'
const MAX_PAGES = 3
const PAGE_DELAY_MS = 2000
const TOKEN_RETRIES = 3

export const maxDuration = 60

interface PlaceResult {
  place_id: string
  name: string
  formatted_address: string
  types: string[]
}

interface GoogleResponse {
  status: string
  results?: PlaceResult[]
  next_page_token?: string
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Fetch one page. If Google says the token isn't ready (INVALID_REQUEST),
// wait and retry up to TOKEN_RETRIES times.
async function fetchPage(url: string, isTokenPage: boolean): Promise<GoogleResponse> {
  let data: GoogleResponse = { status: 'UNKNOWN' }
  const attempts = isTokenPage ? 1 + TOKEN_RETRIES : 1
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await sleep(PAGE_DELAY_MS)
    const res = await fetch(url, { cache: 'no-store' })
    data = (await res.json()) as GoogleResponse
    if (data.status !== 'INVALID_REQUEST') return data
  }
  return data
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

  // Fetch up to 3 pages server-side. The pagetoken never leaves this function.
  const allResults: PlaceResult[] = []
  let pageToken: string | null = null

  for (let page = 0; page < MAX_PAGES; page++) {
    if (page > 0) {
      // Google requires ~2s before a next_page_token becomes valid
      await sleep(PAGE_DELAY_MS)
    }

    const url: string = pageToken
      ? `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${pageToken}&key=${apiKey}`
      : `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`

    const data = await fetchPage(url, page > 0)

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error(`places-search: page ${page + 1} failed with status ${data.status}`)
      if (page === 0) {
        return NextResponse.json({ error: data.status }, { status: 500 })
      }
      break // later pages fail soft — return what we have
    }

    allResults.push(...(data.results || []))
    pageToken = data.next_page_token ?? null
    if (!pageToken) break
  }

  const results = allResults.map((place: PlaceResult) => ({
    google_place_id: place.place_id,
    name: place.name,
    address: place.formatted_address,
    city: extractCity(place.formatted_address),
    country: extractCountry(place.formatted_address),
    types: place.types,
  }))

  return NextResponse.json({
    results,
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
