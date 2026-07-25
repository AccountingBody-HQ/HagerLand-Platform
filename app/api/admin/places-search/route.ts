import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken } from '@/lib/admin-auth'
const SESSION_COOKIE = 'hl_admin_session'

interface GooglePlace {
  place_id: string
  name: string
  formatted_address: string
  types: string[]
}

async function handleRequest(query: string | null, pagetoken: string | null, apiKey: string) {
  const rawToken = pagetoken ? Buffer.from(pagetoken, 'base64').toString('utf-8') : null
  const url = rawToken
    ? `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${rawToken}&key=${apiKey}`
    : `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query ?? '')}&key=${apiKey}`

  const res = await fetch(url, { cache: 'no-store' })
  const data = await res.json()

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    return { error: data.status }
  }

  const results = (data.results || []).map((place: GooglePlace) => ({
    google_place_id: place.place_id,
    name: place.name,
    address: place.formatted_address,
    city: extractCity(place.formatted_address),
    country: extractCountry(place.formatted_address),
    types: place.types,
  }))

  return { results, next_page_token: data.next_page_token ?? null, total: results.length }
}

function auth(): boolean {
  const token = cookies().get(SESSION_COOKIE)?.value
  return verifySessionToken(token)
}

export async function GET(request: NextRequest) {
  if (!auth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')
  const pagetoken = searchParams.get('pagetoken')
  if (!query && !pagetoken) return NextResponse.json({ error: 'Query required' }, { status: 400 })
  const result = await handleRequest(query, pagetoken, apiKey)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  // Check cookie auth first, then fall back to x-admin-token header
  const headerToken = request.headers.get('x-admin-token')
  const cookieToken = cookies().get(SESSION_COOKIE)?.value
  const token = cookieToken || headerToken || ''
  if (!verifySessionToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  const body = await request.json()
  const { query, pagetoken } = body
  if (!query && !pagetoken) return NextResponse.json({ error: 'Query required' }, { status: 400 })
  const result = await handleRequest(query, pagetoken, apiKey)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result)
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
