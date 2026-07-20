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

export async function POST(request: NextRequest) {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, address, city, phone, website, google_place_id, types } = body

  if (!name || !city) {
    return NextResponse.json({ error: 'Name and city are required' }, { status: 400 })
  }

  // Step 1 — AI enhancement via Anthropic
  const prompt = `You are helping populate HagerLand, a free verified directory for the Ethiopian and Eritrean diaspora worldwide.

A business has been found via Google Places. Your job is to:
1. Write a warm, professional "About" description (2-3 sentences) in HagerLand's tone — community-focused, welcoming, factual. Never use the words "Habesha", "Ethiopian-owned", or "Eritrean-owned".
2. Map the business to the single best HagerLand category from this list: ${HAGERLAND_CATEGORIES.join(', ')}.
3. Decide if this business likely serves the Ethiopian or Eritrean diaspora community (true/false).

Business data:
Name: ${name}
Address: ${address}
Google types: ${(types || []).join(', ')}

Respond in this exact JSON format with no other text:
{
  "ai_description": "...",
  "category": "...",
  "community_relevant": true
}`

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
    sic_description = HAGERLAND_CATEGORIES.includes(parsed.category)
      ? parsed.category
      : 'Professional Services'
    community_relevant = parsed.community_relevant !== false
  } catch {
    // AI enhancement failed — proceed with empty description
  }

  // Step 2 — Insert into companies table
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const { data, error } = await supabase.from('companies').insert({
    company_name: name,
    trading_address_city: city,
    address: address,
    phone: phone || null,
    website: website || null,
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

  return NextResponse.json({ success: true, id: data.id, ai_description, sic_description, community_relevant })
}
