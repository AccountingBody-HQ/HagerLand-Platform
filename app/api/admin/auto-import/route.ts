import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'

const SESSION_COOKIE = 'hl_admin_session'
export const maxDuration = 300

const VALID_SECTIONS = ['companies', 'jobs', 'housing', 'money', 'cars', 'tutors', 'community', 'events', 'delivery', 'made_in_ethiopia'] as const
type SectionName = (typeof VALID_SECTIONS)[number]

function isValidSection(s: string): s is SectionName {
  return (VALID_SECTIONS as readonly string[]).includes(s)
}

function getTitleField(section: SectionName): string {
  return (section === 'tutors' || section === 'community') ? 'name' : section === 'companies' ? 'company_name' : 'title'
}

function getCategoryField(section: SectionName): string {
  return section === 'companies' ? 'sic_description' : 'category'
}

function getCityField(section: SectionName): string {
  return section === 'companies' ? 'trading_address_city' : 'city'
}

const HAGERLAND_CATEGORIES: Record<SectionName, string[]> = {
  companies: ['Food & Hospitality', 'Professional Services', 'Health & Wellbeing', 'Beauty & Personal Care', 'Retail & Trade', 'Transport & Travel', 'Education & Training', 'Creative & Media', 'Community & Faith', 'Property'],
  jobs: ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Volunteer', 'Apprenticeship'],
  housing: ['Room to rent', 'Flat to rent', 'House to rent', 'Studio to rent', 'Property to buy', 'Short-term let', 'Homestay', 'Commercial space'],
  money: ['Money transfer', 'Currency exchange', 'Accounting & Tax', 'Mortgage advice', 'Business loans', 'Personal loans', 'Insurance', 'Investment advice', 'Pension advice', 'Credit repair'],
  cars: ['Car for sale', 'Van for sale', 'Car hire', 'Van hire', 'Taxi & private hire', 'Driving school', 'MOT & servicing', 'Body repair & paint', 'Tyres & exhausts', 'Car parts & accessories'],
  tutors: ['Maths', 'English & Literacy', 'Science', 'Amharic language', 'Tigrinya language', 'Afaan Oromo language', 'Music & instruments', 'Art & design', 'IT & computing', 'Business studies', 'University preparation', '11+ & entrance exams', 'Special educational needs'],
  community: ['Community association', 'Church & faith group', 'Charity & non-profit', 'Cultural organisation', 'Sports club', 'Youth group', "Women\'s group", 'Elders group', 'Support group', 'Political & civic'],
  events: ['Music & concert', 'Cultural festival', 'Religious celebration', 'Community meeting', 'Sports event', 'Food & dining', 'Networking', 'Wedding & celebration', 'Fundraiser', 'Exhibition & art', 'Conference & seminar', 'Online event'],
  delivery: ['Courier services', 'Same-day/local delivery', 'Removals & man-with-van', 'Freight & haulage', 'Cargo shipping', 'Logistics & warehousing', 'Bike/motorcycle courier', 'International shipping'],
  made_in_ethiopia: ['Coffee', 'Honey & spices', 'Textiles & fabrics', 'Leather goods', 'Crafts & art', 'Food products', 'Clothing', 'Other'],
}

function getDefaultCategory(section: SectionName): string {
  const defaults: Record<SectionName, string> = {
    companies: 'Professional Services', jobs: 'Full-time', housing: 'Flat to rent',
    money: 'Money transfer', cars: 'Car for sale', tutors: 'Maths',
    community: 'Community association', events: 'Community meeting',
    delivery: 'Courier services', made_in_ethiopia: 'Other',
  }
  return defaults[section]
}

function formatOpeningHours(weekdayText: string[]): string {
  if (!weekdayText || weekdayText.length === 0) return ''
  return weekdayText.join('||')
}

interface AddressComponent {
  longText?: string
  types?: string[]
}

interface PlaceResult {
  id: string
  displayName?: { text?: string }
  formattedAddress?: string
  addressComponents?: AddressComponent[]
  types?: string[]
  websiteUri?: string
  internationalPhoneNumber?: string
  regularOpeningHours?: { weekdayDescriptions?: string[] }
}

function cityFromComponents(components?: AddressComponent[]): string {
  if (!components) return ''
  const priority = ['locality', 'postal_town', 'administrative_area_level_2', 'administrative_area_level_1']
  for (const wanted of priority) {
    const match = components.find((c) => (c.types || []).includes(wanted))
    if (match?.longText) return match.longText
  }
  return ''
}

function countryFromComponents(components?: AddressComponent[]): string {
  if (!components) return ''
  const match = components.find((c) => (c.types || []).includes('country'))
  return match?.longText ?? ''
}

function extractText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function findAboutUrl(html: string, baseUrl: string): string | null {
  const matches = Array.from(html.matchAll(/href=["']([^"']*(?:about|company|who-we-are|our-story|etamina)[^"']*)["']/gi))
  for (const match of matches) {
    const href = match[1]
    if (!href || href.startsWith('#') || href.startsWith('mailto:')) continue
    try {
      return new URL(href, baseUrl).href
    } catch {
      continue
    }
  }
  return null
}

async function scrapeWebsite(url: string): Promise<string> {
  if (!url) return ''
  const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; HagerLand/1.0)' }
  try {
    // Scrape homepage
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers })
    if (!res.ok) return ''
    const html = await res.text()
    const homeText = extractText(html).slice(0, 2000)

    // Try to find and scrape About page
    let aboutText = ''
    const aboutUrl = findAboutUrl(html, url)
    if (aboutUrl && aboutUrl !== url) {
      try {
        const aboutRes = await fetch(aboutUrl, { signal: AbortSignal.timeout(8000), headers })
        if (aboutRes.ok) {
          const aboutHtml = await aboutRes.text()
          aboutText = extractText(aboutHtml).slice(0, 2000)
        }
      } catch {
        // About page failed — homepage content is enough
      }
    }

    return aboutText
      ? `Homepage: ${homeText}\n\nAbout page: ${aboutText}`
      : homeText
  } catch {
    return ''
  }
}

export async function POST(request: NextRequest) {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { query, section = 'companies', max = 10 } = body

  if (!query?.trim()) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 })
  }

  if (!isValidSection(section)) {
    return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
  }

  const limit = Math.min(Math.max(1, parseInt(String(max))), 20)

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  // Step 1 — Search Google Places
  const searchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.addressComponents,places.types,places.websiteUri,places.internationalPhoneNumber,places.regularOpeningHours',
    },
    body: JSON.stringify({ textQuery: query, pageSize: limit }),
  })

  const searchData = await searchRes.json()
  if (!searchRes.ok || searchData.error) {
    return NextResponse.json({ error: 'Google Places search failed' }, { status: 500 })
  }

  const places: PlaceResult[] = searchData.places || []
  if (places.length === 0) {
    return NextResponse.json({ results: [], message: 'No places found' })
  }

  // Step 2 — Filter out already imported (only block if listing still exists and is not deleted)
  const placeIds = places.map((p) => p.id)
  const { data: alreadyImported } = await supabase
    .from('import_log')
    .select('google_place_id, listing_id')
    .eq('section', section)
    .eq('status', 'imported')
    .in('google_place_id', placeIds)

  // Cross-check listing_id against actual table — if deleted or missing, allow reimport
  const importedSet = new Set<string>()
  for (const row of alreadyImported || []) {
    if (!row.listing_id) continue
    const { data: existing } = await supabase
      .from(section)
      .select('id, status')
      .eq('id', row.listing_id)
      .single()
    if (existing && existing.status !== 'deleted') {
      importedSet.add(row.google_place_id)
    } else {
      // Listing is deleted or gone — clean up import_log so it can be reimported
      await supabase.from('import_log').delete()
        .eq('google_place_id', row.google_place_id)
        .eq('section', section)
    }
  }
  const toProcess = places.filter((p) => !importedSet.has(p.id))

  const results: Array<{ name: string; status: string; error?: string; id?: string }> = []

  // Step 3 — Process each place
  for (const place of toProcess) {
    const name = place.displayName?.text ?? 'Unknown'
    const address = place.formattedAddress ?? ''
    const city = cityFromComponents(place.addressComponents)
    const country = countryFromComponents(place.addressComponents)
    const phone = place.internationalPhoneNumber || null
    const website = place.websiteUri && !/google\.com|maps\.app\.goo|goo\.gl/i.test(place.websiteUri) ? place.websiteUri : null
    const opening_hours = place.regularOpeningHours?.weekdayDescriptions
      ? formatOpeningHours(place.regularOpeningHours.weekdayDescriptions)
      : null

    if (!city) {
      results.push({ name, status: 'skipped', error: 'No city found' })
      continue
    }

    // Step 4 — Scrape website
    const websiteContent = website ? await scrapeWebsite(website) : ''

    // Step 5 — Claude AI profile
    const categoryList = HAGERLAND_CATEGORIES[section].join(', ')
    const prompt = `You are a professional content writer for HagerLand — Ethiopia's business and financial platform, serving the Ethiopian and Eritrean diaspora worldwide.
A listing has been discovered automatically. Your task is to create a high-quality directory listing for the ${section} section.

LISTING DATA FROM GOOGLE:
Name: ${name}
Full Address: ${address}
City: ${city}
Country: ${country}
Phone: ${phone || 'Not available'}
Website: ${website || 'Not available'}
Opening Hours: ${opening_hours || 'Not available'}
Google Place Types: ${(place.types || []).join(', ')}
${websiteContent ? `\nWEBSITE CONTENT (use this to write a richer, more specific description):\n${websiteContent}` : ''}

YOUR TASKS:

1. DESCRIPTION (ai_description)
Write 3 sentences that:
- Open with a strong specific statement about what this listing is and does
- Mention specific services, specialities, or unique qualities — use website content if available, otherwise use the name, address, and Google types
- Close with a welcoming sentence about why people should use it
- Sound natural and professional
- Are grounded in the data — do not invent details not supported by the data
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
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
          'anthropic-version': '2023-06-01',
        },
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
      // AI failed — proceed with defaults
    }

    // Step 6 — Insert into database
    const titleField = getTitleField(section)
    const categoryField = getCategoryField(section)
    const cityField = getCityField(section)

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
    }

    if (section === 'companies') {
      row.is_verified = false
      row.community_relevant = community_relevant
      row.source = 'admin_import'
      row.google_place_id = place.id
    }

    const { data: inserted, error: insertError } = await supabase
      .from(section)
      .insert(row)
      .select('id')
      .single()

    // Log result
    await supabase.from('import_log').upsert({
      google_place_id: place.id,
      section,
      listing_id: inserted?.id ? String(inserted.id) : null,
      listing_name: name,
      status: insertError ? 'failed' : 'imported',
      error: insertError?.message || null,
      imported_at: new Date().toISOString(),
    })

    if (insertError) {
      results.push({ name, status: 'failed', error: insertError.message })
    } else {
      results.push({ name, status: 'imported', id: inserted.id })
    }
  }

  const skipped = places.length - toProcess.length
  return NextResponse.json({
    success: true,
    total_found: places.length,
    skipped_duplicates: skipped,
    processed: toProcess.length,
    results,
  })
}
