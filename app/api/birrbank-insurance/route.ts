import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { verifySessionToken } from '@/lib/admin-auth'

export async function GET() {
  const supabase = createBirrBankAdminClient()
  const { data: products, error } = await supabase
    .schema('birrbank')
    .from('insurance_products')
    .select('*, institutions(name)')
    .order('product_type')
    .order('institution_slug')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data: insurers } = await supabase
    .schema('birrbank')
    .from('institutions')
    .select('slug, name')
    .eq('type', 'insurer')
    .eq('is_active', true)
    .order('name')
  return NextResponse.json({ products: products ?? [], insurers: insurers ?? [] })
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
      const { institution_slug, product_type, product_name, premium_from_etb, premium_to_etb, annual_premium_pct, coverage_from_etb, coverage_to_etb, is_sharia_compliant, source_url, notes } = body
      if (!institution_slug || !product_type || !product_name) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }
      const { error } = await supabase.schema('birrbank').from('insurance_products').insert({
        institution_slug, product_type, product_name,
        premium_from_etb:   premium_from_etb   ? Number(premium_from_etb)   : null,
        premium_to_etb:     premium_to_etb     ? Number(premium_to_etb)     : null,
        annual_premium_pct: annual_premium_pct ? Number(annual_premium_pct) : null,
        coverage_from_etb:  coverage_from_etb  ? Number(coverage_from_etb)  : null,
        coverage_to_etb:    coverage_to_etb    ? Number(coverage_to_etb)    : null,
        is_sharia_compliant: is_sharia_compliant === true || is_sharia_compliant === 'true',
        source_url: source_url || null,
        notes: notes || null,
        last_verified_date: today,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
    if (action === 'update' && id) {
      const { product_name, premium_from_etb, premium_to_etb, annual_premium_pct, coverage_from_etb, coverage_to_etb, is_sharia_compliant, source_url, notes } = body
      const { error } = await supabase.schema('birrbank').from('insurance_products').update({
        product_name,
        premium_from_etb:   premium_from_etb   ? Number(premium_from_etb)   : null,
        premium_to_etb:     premium_to_etb     ? Number(premium_to_etb)     : null,
        annual_premium_pct: annual_premium_pct ? Number(annual_premium_pct) : null,
        coverage_from_etb:  coverage_from_etb  ? Number(coverage_from_etb)  : null,
        coverage_to_etb:    coverage_to_etb    ? Number(coverage_to_etb)    : null,
        is_sharia_compliant: is_sharia_compliant === true || is_sharia_compliant === 'true',
        source_url: source_url || null,
        notes: notes || null,
        last_verified_date: today,
        updated_at: now,
      }).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
    if (action === 'toggle' && id) {
      const { is_current } = body
      const { error } = await supabase.schema('birrbank').from('insurance_products')
        .update({ is_current, updated_at: now }).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
    if (action === 'delete' && id) {
      const { error } = await supabase.schema('birrbank').from('insurance_products').delete().eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
    if (action === 'verify' && id) {
      const { error } = await supabase.schema('birrbank').from('insurance_products')
        .update({ last_verified_date: today, updated_at: now }).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
