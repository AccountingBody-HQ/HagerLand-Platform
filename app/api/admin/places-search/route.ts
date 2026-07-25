import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'

const SESSION_COOKIE = 'hl_admin_session'
const MAX_PAGES = 3

export const maxDuration = 60

interface NewPlace {
  id: string
  displayName?: { text?: string }
  formattedAddress?: string
  types?: string[]
}

interface NewApiResponse {
  places?: NewPlace[]
  nextPageToken?: string
  error?: { code: number; message: string; status: string }
}

export async function GET(request: NextRequest) {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')
  const section = searchParams.get('section') || 'companies'

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  // Places API (New): POST searchText, paginate via pageToken in the body.
  // Tokens are valid immediately — no delay needed between pages.
  const allPlaces: NewPlace[] = []
  let pageToken: string | undefined

  for (let page = 0; page < MAX_PAGES; page++) {
    const body: Record<string, unknown> = { textQuery: query, pageSize: 20 }
    if (pageToken) body.pageToken = pageToken

    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.types,nextPageToken',
      },
      body: JSON.stringify(body),
    })
    const data = (await res.json()) as NewApiResponse

    if (!res.ok || data.error) {
      const status = data.error?.status ?? `HTTP_${res.status}`
      console.error(`places-search: page ${page + 1} failed with status ${status}`)
      if (page === 0) {
        return NextResponse.json({ error: status }, { status: 500 })
      }
      break // later pages fail soft — return what we have
    }

    allPlaces.push(...(data.places || []))
    pageToken = data.nextPageToken
    if (!pageToken) break
  }

  const results = allPlaces.map((place) => ({
    google_place_id: place.id,
    name: place.displayName?.text ?? '',
    address: place.formattedAddress ?? '',
    city: extractCity(place.formattedAddress ?? ''),
    country: extractCountry(place.formattedAddress ?? ''),
    types: place.types ?? [],
  }))

  // Flag results already imported into this section (best-effort)
  let importedIds = new Set<string>()
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )
    const ids = results.map((r) => r.google_place_id)
    if (ids.length > 0) {
      const { data: logged } = await supabase
        .from('import_log')
        .select('google_place_id')
        .eq('section', section)
        .eq('status', 'imported')
        .in('google_place_id', ids)
      importedIds = new Set((logged || []).map((l) => l.google_place_id))
    }
  } catch (err) {
    console.error('admin/places-search error:', err)
    // flagging failed — search still works, badges just won't show
  }

  const flagged = results.map((r) => ({
    ...r,
    already_imported: importedIds.has(r.google_place_id),
  }))

  return NextResponse.json({
    results: flagged,
    total: flagged.length,
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
