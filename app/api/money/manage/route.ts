import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)
    const token = req.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    const { data, error } = await supabase
      .from('money')
      .select('id, title, category, city, country, address, phone, website, opening_hours, instagram, facebook, whatsapp, submitter_name, status, promo_text, promo_expires_at, pending_changes, ai_description')
      .eq('manage_token', token)
      .single()
    if (error || !data) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)
    const body = await req.json()
    const { token } = body
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    const { data: existing, error: findError } = await supabase
      .from('money')
      .select('id, status, title, category, city, country, address, phone, website, opening_hours, instagram, facebook, whatsapp, submitter_name, promo_text, promo_expires_at, ai_description')
      .eq('manage_token', token)
      .single()
    if (findError || !existing) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    if (existing.status === 'rejected') return NextResponse.json({ error: 'This listing has been rejected and cannot be edited.' }, { status: 403 })

    const newDetails = {
      title:           body.title?.trim() ?? null,
      category:       body.category?.trim() ?? null,
      ai_description: body.ai_description?.trim() ?? null,
      city:           body.city?.trim() ?? null,
      country:        body.country?.trim() ?? null,
      address:        body.address?.trim() ?? null,
      phone:          body.phone?.trim() ?? null,
      website:        body.website?.trim() ?? null,
      opening_hours:  body.opening_hours?.trim() ?? null,
      instagram:      body.instagram?.trim() ?? null,
      facebook:       body.facebook?.trim() ?? null,
      whatsapp:       body.whatsapp?.trim() ?? null,
      promo_text:     body.promo_text ?? null,
      promo_expires_at: body.promo_expires_at
        ? new Date(new Date(body.promo_expires_at).setHours(23, 59, 59, 999)).toISOString()
        : null,
    }

    const oldDetails = {
      title:           existing.title ?? null,
      category:       existing.category ?? null,
      ai_description: existing.ai_description ?? null,
      city:           existing.city ?? null,
      country:        existing.country ?? null,
      address:        existing.address ?? null,
      phone:          existing.phone ?? null,
      website:        existing.website ?? null,
      opening_hours:  existing.opening_hours ?? null,
      instagram:      existing.instagram ?? null,
      facebook:       existing.facebook ?? null,
      whatsapp:       existing.whatsapp ?? null,
      promo_text:     existing.promo_text ?? null,
      promo_expires_at: existing.promo_expires_at ?? null,
    }

    const changedFields: Record<string, { old: string | null, new: string | null }> = {}
    for (const key of Object.keys(newDetails) as Array<keyof typeof newDetails>) {
      const oldVal = (oldDetails as Record<string, string | null>)[key] ?? null
      const newVal = (newDetails as Record<string, string | null>)[key] ?? null
      if (newVal !== oldVal) {
        changedFields[key] = { old: oldVal, new: newVal }
      }
    }

    const hasChanges = Object.keys(changedFields).length > 0
    const updatePayload: Record<string, unknown> = {}

    if (hasChanges) {
      updatePayload.pending_changes = changedFields
      updatePayload.status = existing.status === 'active' ? 'pending' : existing.status
    }

    const { error: updateError } = await supabase
      .from('money')
      .update(updatePayload)
      .eq('id', existing.id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    return NextResponse.json({ ok: true, hasPendingChanges: hasChanges })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
