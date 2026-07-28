import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { verifySessionToken } from '@/lib/admin-auth'

export async function GET() {
  const supabase = createBirrBankAdminClient()
  const { data: services, error } = await supabase
    .schema('birrbank')
    .from('transfer_services')
    .select('*, institutions(name)')
    .order('institution_slug')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data: institutions } = await supabase
    .schema('birrbank')
    .from('institutions')
    .select('slug, name')
    .in('type', ['bank','money_transfer','payment_operator'])
    .eq('is_active', true)
    .order('name')
  return NextResponse.json({ services: services ?? [], institutions: institutions ?? [] })
}

export async function POST(req: NextRequest) {
  const token = cookies().get('hl_admin_session')?.value
  if (!verifySessionToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const supabase = createBirrBankAdminClient()
    const body = await req.json()
    const { action, id } = body
    const today = new Date().toISOString().split('T')[0]
    const now = new Date().toISOString()
    if (action === 'add') {
      const { institution_slug, transfer_type, destination_countries, fee_percentage, flat_fee_etb, min_amount_etb, max_amount_etb, processing_hours, notes } = body
      if (!institution_slug || !transfer_type) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      const { error } = await supabase.schema('birrbank').from('transfer_services').insert({
        institution_slug, transfer_type,
        destination_countries: destination_countries ? destination_countries.split(',').map((s: string) => s.trim()).filter(Boolean) : null,
        fee_percentage:  fee_percentage  ? Number(fee_percentage)  : null,
        flat_fee_etb:    flat_fee_etb    ? Number(flat_fee_etb)    : null,
        min_amount_etb:  min_amount_etb  ? Number(min_amount_etb)  : null,
        max_amount_etb:  max_amount_etb  ? Number(max_amount_etb)  : null,
        processing_hours: processing_hours ? Number(processing_hours) : null,
        notes: notes || null,
        last_verified_date: today,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
    if (action === 'update' && id) {
      const { transfer_type, destination_countries, fee_percentage, flat_fee_etb, min_amount_etb, max_amount_etb, processing_hours, notes } = body
      const { error } = await supabase.schema('birrbank').from('transfer_services').update({
        transfer_type,
        destination_countries: destination_countries ? destination_countries.split(',').map((s: string) => s.trim()).filter(Boolean) : null,
        fee_percentage:  fee_percentage  ? Number(fee_percentage)  : null,
        flat_fee_etb:    flat_fee_etb    ? Number(flat_fee_etb)    : null,
        min_amount_etb:  min_amount_etb  ? Number(min_amount_etb)  : null,
        max_amount_etb:  max_amount_etb  ? Number(max_amount_etb)  : null,
        processing_hours: processing_hours ? Number(processing_hours) : null,
        notes: notes || null,
        last_verified_date: today,
        updated_at: now,
      }).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
    if (action === 'toggle' && id) {
      const { error } = await supabase.schema('birrbank').from('transfer_services')
        .update({ is_current: body.is_current, updated_at: now }).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
    if (action === 'delete' && id) {
      const { error } = await supabase.schema('birrbank').from('transfer_services').delete().eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
    if (action === 'verify' && id) {
      const { error } = await supabase.schema('birrbank').from('transfer_services')
        .update({ last_verified_date: today, updated_at: now }).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
