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

interface GooglePlace {
  place_id: string
  name: string
  formatted_address: string
  types: string[]
}

async function fetchPage(url: string): Promise<{ results: GooglePlace[], next_page_token?: string }> {
  const res = await fetch(url, { cache: 'no-store' })
  const data = await res.json()
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return { results: [] }
  return { results: data.results || [], next_page_token: data.next_page_token }
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms))
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

  const allResults: GooglePlace[] = []

  // Page 1
  const page1 = await fetchPage(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
  )
  allResults.push(...page1.results)

  // Page 2 — only if page 1 returned a token
  console.log('Page 1 results:', page1.results.length, 'next_page_token:', !!page1.next_page_token)
  if (page1.next_page_token) {
    await delay(2500)
    const page2 = await fetchPage(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${page1.next_page_token}&key=${apiKey}`
    )
    allResults.push(...page2.results)
    console.log('Page 2 results:', page2.results.length, 'next_page_token:', !!page2.next_page_token)

    // Page 3 — only if page 2 returned a token
    if (page2.next_page_token) {
      await delay(2500)
      const page3 = await fetchPage(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${page2.next_page_token}&key=${apiKey}`
      )
      allResults.push(...page3.results)
      console.log('Page 3 results:', page3.results.length)
    }
  }

  const results = allResults.map((place: PlaceResult) => ({
    google_place_id: place.place_id,
    name: place.name,
    address: place.formatted_address,
    city: extractCity(place.formatted_address),
    country: extractCountry(place.formatted_address),
    types: place.types,
  }))

  return NextResponse.json({ results, total: results.length })
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
