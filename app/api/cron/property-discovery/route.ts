import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const ETHIOPIA_QUERIES = [
  'real estate agency Addis Ababa',
  'real estate Ethiopia',
  'property developer Addis Ababa',
  'housing developer Ethiopia',
]

const DIASPORA_QUERIES = [
  'Ethiopian real estate agency London',
  'Ethiopian property agent UK',
  'Ethiopian real estate Washington DC',
  'Ethiopian real estate Minnesota',
  'Ethiopian property agent Dubai',
  'Ethiopian real estate Toronto',
]

const MAX_INSERTS_PER_RUN = 50

const PLACES_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.googleMapsUri',
  'places.rating',
  'places.userRatingCount',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.regularOpeningHours',
  'places.addressComponents',
].join(',')

interface PlaceAddressComponent {
  longText?: string
  shortText?: string
  types?: string[]
}

interface Place {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  googleMapsUri?: string
  rating?: number
  userRatingCount?: number
  internationalPhoneNumber?: string
  websiteUri?: string
  regularOpeningHours?: { weekdayDescriptions?: string[] }
  addressComponents?: PlaceAddressComponent[]
}

function findComponent(components: PlaceAddressComponent[] | undefined, type: string): string | null {
  return components?.find((c) => c.types?.includes(type))?.longText ?? null
}

function extractCity(components: PlaceAddressComponent[] | undefined): string | null {
  return (
    findComponent(components, 'locality') ??
    findComponent(components, 'postal_town') ??
    findComponent(components, 'administrative_area_level_2')
  )
}

function extractCountry(components: PlaceAddressComponent[] | undefined): string | null {
  return findComponent(components, 'country')
}

async function searchPlaces(query: string): Promise<Place[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY!,
      'X-Goog-FieldMask': PLACES_FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 10 }),
  })

  if (!res.ok) {
    throw new Error(`Places API error ${res.status}: ${await res.text()}`)
  }

  const data = await res.json()
  return data.places ?? []
}

async function generateDescription(companyName: string, city: string | null, country: string | null): Promise<string | null> {
  const location = [city, country].filter(Boolean).join(', ') || 'the region'
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Write a 3-sentence professional description for this real estate agency: ${companyName}, located in ${location}. Do not use the words Ethiopian-owned, Eritrean-owned, or Habesha. Be factual and professional.`,
        },
      ],
    }),
  })

  if (!res.ok) {
    console.error(`Anthropic API error ${res.status}: ${await res.text()}`)
    return null
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? null
}

function computeQualityScore(fields: {
  phone: string | null
  website: string | null
  address: string | null
  openingHours: string | null
  googleRating: number | null
}): number {
  let score = 0
  if (fields.phone) score += 20
  if (fields.website) score += 20
  if (fields.address) score += 15
  if (fields.openingHours) score += 10
  if (fields.googleRating != null) score += 10
  return Math.min(score, 100)
}

function confidenceFromScore(score: number): 'high' | 'medium' | 'low' {
  if (score >= 80) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}

async function logAgentAction(entry: {
  action: string
  target_id: string | null
  result: string
  metadata: Record<string, unknown>
}) {
  try {
    await supabaseAdmin.from('agent_log').insert({
      agent_name: 'property-discovery',
      task: 'discover',
      action: entry.action,
      target_id: entry.target_id,
      result: entry.result,
      metadata: entry.metadata,
    })
  } catch (err) {
    console.error('agent_log insert failed:', err)
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const queries = [...ETHIOPIA_QUERIES, ...DIASPORA_QUERIES]

  let inserted = 0
  let skippedDuplicates = 0
  let skippedNoContact = 0
  let errors = 0

  for (const query of queries) {
    if (inserted >= MAX_INSERTS_PER_RUN) break

    let places: Place[]
    try {
      places = await searchPlaces(query)
    } catch (err) {
      console.error(`Places search failed for "${query}":`, err)
      errors++
      continue
    }

    for (const place of places) {
      if (inserted >= MAX_INSERTS_PER_RUN) break

      const googlePlaceId = place.id
      if (!googlePlaceId) continue

      try {
        const { data: existing } = await supabaseAdmin
          .from('properties')
          .select('id')
          .eq('google_place_id', googlePlaceId)
          .maybeSingle()

        if (existing) {
          skippedDuplicates++
          continue
        }

        const companyName = place.displayName?.text ?? null
        const phone = place.internationalPhoneNumber ?? null
        const website = place.websiteUri ?? null
        const address = place.formattedAddress ?? null
        const city = extractCity(place.addressComponents)
        const country = extractCountry(place.addressComponents)
        const googleMapsUrl = place.googleMapsUri ?? null
        const googleRating = place.rating ?? null
        const googleReviewCount = place.userRatingCount ?? null
        const openingHours = place.regularOpeningHours?.weekdayDescriptions?.join(' || ') ?? null

        if (!phone && !website) {
          skippedNoContact++
          continue
        }

        if (!companyName) {
          errors++
          continue
        }

        const qualityScore = computeQualityScore({
          phone,
          website,
          address,
          openingHours,
          googleRating,
        })
        const agentConfidence = confidenceFromScore(qualityScore)
        const aiDescription = await generateDescription(companyName, city, country)

        const { data: insertedRow, error: insertError } = await supabaseAdmin
          .from('properties')
          .insert({
            company_name: companyName,
            status: 'pending',
            source: 'agent_import',
            phone,
            website,
            address,
            city,
            country,
            google_place_id: googlePlaceId,
            google_maps_url: googleMapsUrl,
            google_rating: googleRating,
            google_review_count: googleReviewCount,
            ai_description: aiDescription,
            opening_hours: openingHours,
            agent_confidence: agentConfidence,
            quality_score: qualityScore,
            agent_notes: 'Discovered via Google Places API',
            agent_last_run: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (insertError || !insertedRow) {
          console.error('properties insert failed:', insertError)
          errors++
          continue
        }

        inserted++

        await logAgentAction({
          action: 'insert',
          target_id: insertedRow.id,
          result: 'success',
          metadata: { company_name: companyName, city, country },
        })
      } catch (err) {
        console.error(`Error processing place ${googlePlaceId}:`, err)
        errors++
      }
    }
  }

  return NextResponse.json({
    success: true,
    inserted,
    skipped_duplicates: skippedDuplicates,
    skipped_no_contact: skippedNoContact,
    errors,
    message: 'Property discovery complete',
  })
}
