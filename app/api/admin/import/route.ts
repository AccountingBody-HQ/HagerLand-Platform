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

function formatOpeningHours(weekdayText: string[]): string {
  if (!weekdayText || weekdayText.length === 0) return ''
  return weekdayText.join('||')
}

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
    opening_hours: r.opening_hours?.weekday_text ? formatOpeningHours(r.opening_hours.weekday_text) : null,
  }
}

export async function POST(request: NextRequest) {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, address, city, country, phone: manualPhone, website: manualWebsite, google_place_id, types } = body

  if (!name || !city) {
    return NextResponse.json({ error: 'Name and city are required' }, { status: 400 })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY!

  let phone = manualPhone || null
  let website = manualWebsite || null
  let opening_hours = null

  if (google_place_id) {
    const details = await getPlaceDetails(google_place_id, apiKey)
    if (!phone && details.phone) phone = details.phone
    if (!website && details.website) website = details.website
    if (details.opening_hours) opening_hours = details.opening_hours
  }

  const prompt = `You are a professional content writer and business directory specialist for HagerLand — the premier verified directory for the Ethiopian and Eritrean diaspora worldwide.
A business has been discovered via Google Places. Your task is to create a high-quality, professional directory listing.

BUSINESS DATA FROM GOOGLE:
Name: ${name}
Full Address: ${address}
City: ${city}
Google Place Types: ${(types || []).join(', ')}
Phone: ${phone || 'Not available'}
Website: ${website || 'Not available'}
Opening Hours: ${opening_hours || 'Not available'}

YOUR TASKS:

1. ABOUT DESCRIPTION (ai_description)
Write 3 sentences that:
- Open with a strong specific statement about what this business is and does
- Mention the specific cuisine, service type, or expertise
- Close with a welcoming sentence about why people should visit
- Sound natural and professional like a premium directory
- Are grounded in the business name, address, and type — do not invent details
- Never use: Habesha, Ethiopian-owned, Eritrean-owned, diaspora-owned
- Never use vague filler like "a wide range of services" or "committed to excellence"

2. CATEGORY (category)
Pick the single most accurate from:
Food & Hospitality: restaurants, cafes, bars, catering, bakeries, takeaways, coffee shops
Professional Services: accountants, lawyers, consultants, architects, financial advisors
Health & Wellbeing: doctors, dentists, pharmacies, gyms, physiotherapy, opticians
Beauty & Personal Care: hair salons, barbershops, nail bars, spas, beauty clinics
Retail & Trade: shops, supermarkets, clothing, electronics, hardware, wholesale
Transport & Travel: taxis, private hire, driving schools, car hire, travel agents
Education & Training: tutors, schools, colleges, training centres, language schools
Creative & Media: photographers, designers, videographers, marketing, music studios
Community & Faith: churches, mosques, community centres, charities, cultural organisations
Property: estate agents, letting agents, property management, construction

Google type rules:
restaurant/food/meal_takeaway/cafe/bar/bakery = Food & Hospitality
doctor/dentist/pharmacy/hospital/gym = Health & Wellbeing
hair_care/beauty_salon/spa/nail_salon = Beauty & Personal Care
store/supermarket/clothing_store/electronics_store = Retail & Trade
lawyer/accounting/finance/insurance_agency = Professional Services
taxi_service/car_rental/driving_school/travel_agency = Transport & Travel
school/university/tutoring/child_care = Education & Training
church/mosque/place_of_worship/charity = Community & Faith
real_estate_agency/lodging/general_contractor = Property
art_gallery/photography/design/movie_studio = Creative & Media

3. COMMUNITY RELEVANCE (community_relevant)
true if the business name, location, or type suggests it serves the Ethiopian or Eritrean community. When uncertain, set true.

RESPOND IN THIS EXACT JSON FORMAT WITH NO OTHER TEXT OR MARKDOWN:
{"ai_description": "...", "category": "...", "community_relevant": true}`

  let ai_description = ''
  let sic_description = 'Professional Services'
  let community_relevant = true

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY ?? '', 'anthropic-version': '2023-06-01' },
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const { data, error } = await supabase.from('companies').insert({
    company_name: name,
    trading_address_city: city,
    address: address,
    country: country || null,
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
