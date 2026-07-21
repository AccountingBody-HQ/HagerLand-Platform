import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'

const SESSION_COOKIE = 'hl_admin_session'

const VALID_SECTIONS = ['companies', 'jobs', 'housing', 'money', 'cars', 'tutors', 'community', 'events'] as const
type SectionName = (typeof VALID_SECTIONS)[number]

function isValidSection(s: string): s is SectionName {
  return (VALID_SECTIONS as readonly string[]).includes(s)
}

// Field name mapping per section
function getTitleField(section: SectionName): string {
  return (section === 'tutors' || section === 'community') ? 'name' : section === 'companies' ? 'company_name' : 'title'
}

function getCategoryField(section: SectionName): string {
  return section === 'companies' ? 'sic_description' : 'category'
}

function getCityField(section: SectionName): string {
  return section === 'companies' ? 'trading_address_city' : 'city'
}

// Admin path for redirect after import
function getAdminPath(section: SectionName): string {
  return section === 'companies' ? '/roodber8/businesses/' : `/roodber8/${section}/`
}

const HAGERLAND_CATEGORIES: Record<SectionName, string[]> = {
  companies: [
    'Food & Hospitality', 'Professional Services', 'Health & Wellbeing',
    'Beauty & Personal Care', 'Retail & Trade', 'Transport & Travel',
    'Education & Training', 'Creative & Media', 'Community & Faith', 'Property',
  ],
  jobs: ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Volunteer', 'Apprenticeship'],
  housing: ['Room to rent', 'Flat to rent', 'House to rent', 'Studio to rent', 'Property to buy', 'Short-term let', 'Homestay', 'Commercial space'],
  money: ['Money transfer', 'Currency exchange', 'Accounting & Tax', 'Mortgage advice', 'Business loans', 'Personal loans', 'Insurance', 'Investment advice', 'Pension advice', 'Credit repair'],
  cars: ['Car for sale', 'Van for sale', 'Car hire', 'Van hire', 'Taxi & private hire', 'Driving school', 'MOT & servicing', 'Body repair & paint', 'Tyres & exhausts', 'Car parts & accessories'],
  tutors: ['Maths', 'English & Literacy', 'Science', 'Amharic language', 'Tigrinya language', 'Afaan Oromo language', 'Music & instruments', 'Art & design', 'IT & computing', 'Business studies', 'University preparation', '11+ & entrance exams', 'Special educational needs'],
  community: ['Community association', 'Church & faith group', 'Charity & non-profit', 'Cultural organisation', 'Sports club', 'Youth group', "Women's group", 'Elders group', 'Support group', 'Political & civic'],
  events: ['Music & concert', 'Cultural festival', 'Religious celebration', 'Community meeting', 'Sports event', 'Food & dining', 'Networking', 'Wedding & celebration', 'Fundraiser', 'Exhibition & art', 'Conference & seminar', 'Online event'],
}

function getDefaultCategory(section: SectionName): string {
  const defaults: Record<SectionName, string> = {
    companies: 'Professional Services',
    jobs: 'Full-time',
    housing: 'Flat to rent',
    money: 'Money transfer',
    cars: 'Car for sale',
    tutors: 'Maths',
    community: 'Community association',
    events: 'Community meeting',
  }
  return defaults[section]
}

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
  const { section = 'companies', name, address, city, country, phone: manualPhone, website: manualWebsite, google_place_id, types } = body

  if (!isValidSection(section)) {
    return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
  }

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

  const categoryList = HAGERLAND_CATEGORIES[section].join(', ')
  const prompt = `You are a professional content writer for HagerLand — the verified directory for the Ethiopian and Eritrean diaspora worldwide.
A listing has been discovered via Google Places. Your task is to create a high-quality directory listing for the ${section} section.

LISTING DATA FROM GOOGLE:
Name: ${name}
Full Address: ${address}
City: ${city}
Google Place Types: ${(types || []).join(', ')}
Phone: ${phone || 'Not available'}
Website: ${website || 'Not available'}
Opening Hours: ${opening_hours || 'Not available'}

YOUR TASKS:

1. DESCRIPTION (ai_description)
Write 3 sentences that:
- Open with a strong specific statement about what this listing is and does
- Mention the specific service type or expertise
- Close with a welcoming sentence about why people should use it
- Sound natural and professional
- Are grounded in the name, address, and type — do not invent details
- Never use: Habesha, Ethiopian-owned, Eritrean-owned, diaspora-owned
- Never use vague filler like "a wide range of services" or "committed to excellence"

2. CATEGORY (category)
Pick the single most accurate from this list for the ${section} section:
${categoryList}

3. COMMUNITY RELEVANCE (community_relevant)
true if the name, location, or type suggests it serves the Ethiopian or Eritrean community. When uncertain, set true.

RESPOND IN THIS EXACT JSON FORMAT WITH NO OTHER TEXT OR MARKDOWN:
{"ai_description": "...", "category": "...", "community_relevant": true}`

  let ai_description = ''
  let assignedCategory = getDefaultCategory(section)
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
    const cats = HAGERLAND_CATEGORIES[section]
    assignedCategory = cats.includes(parsed.category) ? parsed.category : getDefaultCategory(section)
    community_relevant = parsed.community_relevant !== false
  } catch {
    // AI enhancement failed — proceed with defaults
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const titleField = getTitleField(section)
  const categoryField = getCategoryField(section)
  const cityField = getCityField(section)

  // Build the insert row dynamically
  const row: Record<string, unknown> = {
    [titleField]: name,
    [cityField]: city,
    address,
    country: country || null,
    phone,
    website,
    opening_hours,
    [categoryField]: assignedCategory,
    ai_description,
    status: 'pending',
    source: 'admin_import',
    google_place_id: google_place_id || null,
  }

  // companies-only fields
  if (section === 'companies') {
    row.is_verified = false
    row.community_relevant = community_relevant
  }

  const { data, error } = await supabase.from(section).insert(row).select('id').single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    id: data.id,
    ai_description,
    sic_description: assignedCategory,
    community_relevant,
    phone,
    website,
    opening_hours,
    adminPath: getAdminPath(section),
  })
}
