import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { verifySessionToken } from '@/lib/admin-auth'

export async function GET() {
  const supabase = createBirrBankAdminClient()

  const { data: institutions, error } = await supabase
    .schema('birrbank')
    .from('institutions')
    .select('slug, name, type, is_active, swift_code, website_url, coverage_level, nbe_licence_date')
    .order('type')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { count: activeCount } = await supabase
    .schema('birrbank')
    .from('institutions')
    .select('slug', { count: 'exact', head: true })
    .eq('is_active', true)

  return NextResponse.json({ institutions: institutions ?? [], activeCount: activeCount ?? 0 })
}

export async function POST(req: Request) {
  const token = cookies().get('hl_admin_session')?.value
  if (!verifySessionToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { action, slug, name, type, swift_code, website_url, is_active, nbe_licence_date, phone, email, description, headquarters, hq_region, founded_year, nbe_licence_number, ceo_name, branches_count, coverage_level } = body
    const supabase = createBirrBankAdminClient()
    const today = new Date().toISOString().split('T')[0]

    const ALLOWED_TYPES = new Set([
      'bank','insurer','microfinance','payment_operator',
      'money_transfer','fx_bureau','capital_lease','reinsurer'
    ])

    if (action === 'add_institution') {
      if (!slug || !name || !type) {
        return NextResponse.json({ error: 'slug, name and type are required' }, { status: 400 })
      }
      if (!ALLOWED_TYPES.has(type)) {
        return NextResponse.json({ error: 'Invalid institution type' }, { status: 400 })
      }
      const { error } = await supabase
        .schema('birrbank')
        .from('institutions')
        .insert({
          slug,
          name,
          type,
          swift_code: swift_code || null,
          website_url: website_url || null,
          is_active: false,
          coverage_level: 'basic',
          country_code: 'ET',
          nbe_licence_date: nbe_licence_date || null,
          last_data_update: today,
        })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'toggle_active' && slug) {
      const { data: current } = await supabase
        .schema('birrbank')
        .from('institutions')
        .select('is_active, coverage_level')
        .eq('slug', slug)
        .single()

      const newActive = !current?.is_active
      const newCoverage = newActive && current?.coverage_level === 'basic' ? 'partial' : current?.coverage_level

      const { error } = await supabase
        .schema('birrbank')
        .from('institutions')
        .update({ is_active: newActive, coverage_level: newCoverage })
        .eq('slug', slug)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, is_active: newActive })
    }

    if (action === 'update_institution' && slug) {
      const updates: Record<string, unknown> = {}
      if (website_url !== undefined) updates.website_url = website_url
      if (swift_code !== undefined) updates.swift_code = swift_code
      if (nbe_licence_date !== undefined) updates.nbe_licence_date = nbe_licence_date
      if (is_active !== undefined) updates.is_active = is_active
      if (phone !== undefined) updates.phone = phone
      if (email !== undefined) updates.email = email
      if (description !== undefined) updates.description = description
      if (headquarters !== undefined) updates.headquarters = headquarters
      if (hq_region !== undefined) updates.hq_region = hq_region
      if (founded_year !== undefined) updates.founded_year = founded_year
      if (nbe_licence_number !== undefined) updates.nbe_licence_number = nbe_licence_number
      if (ceo_name !== undefined) updates.ceo_name = ceo_name
      if (branches_count !== undefined) updates.branches_count = branches_count
      if (coverage_level !== undefined) updates.coverage_level = coverage_level

      const { error } = await supabase
        .schema('birrbank')
        .from('institutions')
        .update(updates)
        .eq('slug', slug)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
