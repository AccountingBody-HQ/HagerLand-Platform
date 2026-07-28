import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { verifySessionToken } from '@/lib/admin-auth'

export async function GET() {
  const supabase = createBirrBankAdminClient()

  const { data: rates } = await supabase
    .schema('birrbank')
    .from('loan_rates')
    .select('id, institution_slug, loan_type, min_rate, max_rate, max_tenure_months, min_amount_etb, collateral_required, is_current, last_verified_date, institutions(name)')
    .eq('is_current', true)
    .order('loan_type')

  const { data: institutions } = await supabase
    .schema('birrbank')
    .from('institutions')
    .select('slug, name')
    .in('type', ['bank', 'microfinance'])
    .eq('is_active', true)
    .order('name')

  return NextResponse.json({
    rates: rates ?? [],
    institutions: institutions ?? [],
  })
}

export async function POST(req: Request) {
  const token = cookies().get('hl_admin_session')?.value
  if (!verifySessionToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { action, institution_slug, loan_type, min_rate, max_rate, max_tenure_months, min_amount_etb, collateral_required, id } = body
    const supabase = createBirrBankAdminClient()
    const today = new Date().toISOString().split('T')[0]

    if (action === 'save_rate') {
      if (!institution_slug || !loan_type || min_rate === undefined) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      if (id) {
        const { error } = await supabase
          .schema('birrbank')
          .from('loan_rates')
          .update({
            min_rate: Number(min_rate),
            max_rate: max_rate ? Number(max_rate) : null,
            max_tenure_months: max_tenure_months ? Number(max_tenure_months) : null,
            min_amount_etb: min_amount_etb ? Number(min_amount_etb) : null,
            collateral_required: Boolean(collateral_required),
            last_verified_date: today,
          })
          .eq('id', id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      } else {
        await supabase
          .schema('birrbank')
          .from('loan_rates')
          .update({ is_current: false })
          .eq('institution_slug', institution_slug)
          .eq('loan_type', loan_type)
          .eq('is_current', true)

        const { error } = await supabase
          .schema('birrbank')
          .from('loan_rates')
          .insert({
            institution_slug,
            loan_type,
            min_rate: Number(min_rate),
            max_rate: max_rate ? Number(max_rate) : null,
            max_tenure_months: max_tenure_months ? Number(max_tenure_months) : null,
            min_amount_etb: min_amount_etb ? Number(min_amount_etb) : null,
            collateral_required: Boolean(collateral_required),
            is_current: true,
            last_verified_date: today,
            country_code: 'ET',
          })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true })
    }

    if (action === 'verify_rate' && id) {
      const { error } = await supabase
        .schema('birrbank')
        .from('loan_rates')
        .update({ last_verified_date: today })
        .eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
