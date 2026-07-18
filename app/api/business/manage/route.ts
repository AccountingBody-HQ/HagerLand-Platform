import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )
    const token = req.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    const { data, error } = await supabase
      .from('companies')
      .select('id, company_name, trading_address_city, phone, website, sic_description, submitter_name, status, promo_text')
      .eq('manage_token', token)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    return NextResponse.json({ data })
  } catch (err) {
    console.error('Get business error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )
    const body = await req.json()
    const { token, company_name, trading_address_city, phone, website, sic_description, submitter_name } = body

    if (!token || !company_name) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

    const { data: existing, error: findError } = await supabase
      .from('companies')
      .select('id, status')
      .eq('manage_token', token)
      .single()

    if (findError || !existing) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })

    // Don't allow editing rejected listings
    if (existing.status === 'rejected') return NextResponse.json({ error: 'This listing has been rejected and cannot be edited.' }, { status: 403 })

    const { error: updateError } = await supabase
      .from('companies')
      .update({
        promo_text: body.promo_text ?? null,
        company_name: company_name.trim(),
        trading_address_city: trading_address_city?.trim() || null,
        phone: phone?.trim() || null,
        website: website?.trim() || null,
        sic_description: sic_description?.trim() || null,
        submitter_name: submitter_name?.trim() || null,
        // Reset to pending if active so admin can re-review
        status: existing.status === 'active' ? 'pending' : existing.status,
      })
      .eq('id', existing.id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Update business error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
