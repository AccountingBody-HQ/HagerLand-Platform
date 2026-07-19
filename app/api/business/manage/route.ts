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
      .select('id, company_name, trading_address_city, phone, website, sic_description, submitter_name, status, promo_text, promo_expires_at, pending_changes')
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
      .select('id, status, company_name, trading_address_city, phone, website, sic_description, submitter_name')
      .eq('manage_token', token)
      .single()
    if (findError || !existing) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    if (existing.status === 'rejected') return NextResponse.json({ error: 'This listing has been rejected and cannot be edited.' }, { status: 403 })

    // Promo fields go live immediately — no review needed
    // Business detail fields go into pending_changes for admin review
    const newDetails = {
      company_name: company_name.trim(),
      trading_address_city: trading_address_city?.trim() || null,
      phone: phone?.trim() || null,
      website: website?.trim() || null,
      sic_description: sic_description?.trim() || null,
      submitter_name: submitter_name?.trim() || null,
    }

    // Build diff — only store fields that actually changed
    const oldDetails = {
      company_name: existing.company_name,
      trading_address_city: existing.trading_address_city,
      phone: existing.phone,
      website: existing.website,
      sic_description: existing.sic_description,
      submitter_name: existing.submitter_name,
    }

    const changedFields: Record<string, { old: string | null, new: string | null }> = {}
    for (const key of Object.keys(newDetails) as Array<keyof typeof newDetails>) {
      if (newDetails[key] !== oldDetails[key]) {
        changedFields[key] = { old: oldDetails[key] ?? null, new: newDetails[key] ?? null }
      }
    }

    const hasDetailChanges = Object.keys(changedFields).length > 0

    const updatePayload: Record<string, unknown> = {
      // Promo always goes live immediately
      promo_text: body.promo_text ?? null,
      promo_expires_at: body.promo_expires_at ?? null,
    }

    if (hasDetailChanges) {
      // Store changes for admin review — don't apply to live fields yet
      updatePayload.pending_changes = changedFields
      updatePayload.status = existing.status === 'active' ? 'pending' : existing.status
    }

    const { error: updateError } = await supabase
      .from('companies')
      .update(updatePayload)
      .eq('id', existing.id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    return NextResponse.json({ ok: true, hasPendingChanges: hasDetailChanges })
  } catch (err) {
    console.error('Update business error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
