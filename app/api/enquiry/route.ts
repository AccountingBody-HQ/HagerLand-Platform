import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const VALID_SECTIONS = ['companies', 'jobs', 'housing', 'money', 'cars', 'tutors', 'community', 'events', 'delivery']

export async function POST(request: NextRequest) {
  try {
    const { section, listing_id } = await request.json()
    if (!VALID_SECTIONS.includes(section) || !listing_id || typeof listing_id !== 'string') {
      return NextResponse.json({ ok: false }, { status: 400 })
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )
    const { error } = await supabase.from('listing_enquiries').insert({
      section,
      listing_id: String(listing_id).slice(0, 100),
    })
    if (error) console.error('enquiry count failed:', error.message)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('enquiry endpoint error:', err)
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
