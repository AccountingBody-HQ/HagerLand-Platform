import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)
    const token = req.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    const { data, error } = await supabase.from('money').select('*').eq('manage_token', token).single()
    if (error || !data) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    const { contact_email: _ce, verification_token: _vt, ...safe } = data
    void _ce; void _vt
    return NextResponse.json({ data: safe })
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
    const { data: existing, error: findError } = await supabase.from('money').select('*').eq('manage_token', token).single()
    if (findError || !existing) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    if (existing.status === 'rejected') return NextResponse.json({ error: 'This listing has been rejected.' }, { status: 403 })
    const fields = ['title','name','company_name','category','description','ai_description','location','city','country','address','phone','website','opening_hours','instagram','facebook','whatsapp','promo_text','promo_expires_at']
    const newDetails: Record<string, string | null> = {}
    const oldDetails: Record<string, string | null> = {}
    for (const f of fields) {
      if (f === 'promo_expires_at') {
        newDetails[f] = body[f] ? new Date(new Date(body[f]).setHours(23,59,59,999)).toISOString() : null
      } else {
        newDetails[f] = body[f]?.trim?.() ?? body[f] ?? null
      }
      oldDetails[f] = existing[f] ?? null
    }
    const changedFields: Record<string, { old: string | null, new: string | null }> = {}
    for (const key of Object.keys(newDetails)) {
      if (newDetails[key] !== oldDetails[key]) {
        changedFields[key] = { old: oldDetails[key], new: newDetails[key] }
      }
    }
    const hasChanges = Object.keys(changedFields).length > 0
    const updatePayload: Record<string, unknown> = {}
    if (hasChanges) {
      updatePayload.pending_changes = changedFields
      updatePayload.status = existing.status === 'active' ? 'pending' : existing.status
    }
    const { error: updateError } = await supabase.from('money').update(updatePayload).eq('id', existing.id)
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    return NextResponse.json({ ok: true, hasPendingChanges: hasChanges })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
