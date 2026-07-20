import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'

const SESSION_COOKIE = 'hl_admin_session'

const HAGERLAND_CATEGORIES = [
  'Food & Hospitality',
  'Professional Services',
  'Health & Wellbeing',
  'Beauty & Personal Care',
  'Retail & Trade',
  'Transport & Travel',
  'Education & Training',
  'Creative & Media',
  'Community & Faith',
  'Property',
]

async function getPlaceDetails(placeId: string, apiKey: string) {
  const fields = 'formatted_phone_number,website,opening_hours'
  const url = 'https://maps.googleapis.com/maps/api/place/details/json?place_id=' + placeId + '&fields=' + fields + '&key=' + apiKey
  const res = await fetch(url)
  const data = await res.json()
  if (data.status !== 'OK') return {}
  const r = data.result || {}
  return {
    phone: r.formatted_phone_number || null,
    website: r.website || null,
    opening_hours: r.opening_hours?.weekday_text?.join(', ') || null,
  }
}

export async function POST(request: NextRequest) {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, address, city, phone: manualPhone, website: manualWebsite, google_place_id, types } = body

  if (!name || !city) {
    return NextResponse.json({ error: 'Name and city are required' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY!

  // Step 1 — Fetch phone, website, hours from Google Place Details
  let phone = manualPhone || null
  let website = manualWebsite || null
  let opening_hours = null

  if (google_place_id) {
    const details = await getPlaceDetails(google_place_id, apiKey)
    if (!phone && details.phone) phone = details.phone
    if (!website && details.website) website = details.website
    if (details.opening_hours) opening_hours = details.opening_hours
  }

  // Step 2 — AI enhancement via Anthropic
  const prompt = 'You are helping populate HagerLand, a free verified directory for the Ethiopian and Eritrean diaspora worldwide.' +
    ' A business has been found via Google Places. Your job is to:' +
    ' 1. Write a warm, professional About description (2-3 sentences) in HagerLand tone — community-focused, welcoming, factual. Never use the words Habesha, Ethiopian-owned, or Eritrean-owned.' +
    ' 2. Map the business to the single best HagerLand category from this list: ' + HAGERLAND_CATEGORIES.join(', ') + '.' +
    ' 3. Decide if this business likely serves the Ethiopian or Eritrean diaspora community (true/false).' +
    ' Business data:' +
    ' Name: ' + name +
    ' Address: ' + address +
    ' Google types: ' + (types || []).join(', ') +
    ' Respond in this exact JSON format with no other text: {"ai_description": "...", "category": "...", "community_relevant": true}'

  let ai_description = ''
  let sic_description = 'Professional Services'
  let community_relevant = true

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const aiData = await aiRes.json()
    const text = aiData.content?.[0]?.text || '{}'
    const parsed = JSON.parse(text)
    ai_description = parsed.ai_description || ''
    sic_description = HAGERLAND_CATEGORIES.includes(parsed.category) ? parsed.category : 'Professional Services'
    community_relevant = parsed.community_relevant !== false
  } catch {
    // AI enhancement failed — proceed with empty description
  }

  // Step 3 — Insert into companies table
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const { data, error } = await supabase.from('companies').insert({
    company_name: name,
    trading_address_city: city,
    address: address,
    phone: phone,
    website: website,
    opening_hours: opening_hours,
    sic_description: sic_description,
    ai_description: ai_description,
    status: 'pending',
    is_verified: false,
    source: 'admin_import',
    google_place_id: google_place_id || null,
    community_relevant: community_relevant,
  }).select('id').single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: data.id, ai_description, sic_description, community_relevant, phone, website, opening_hours })
}
