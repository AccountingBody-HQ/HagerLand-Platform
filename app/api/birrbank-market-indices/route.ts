import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { verifySessionToken } from '@/lib/admin-auth'

export async function GET() {
  const supabase = createBirrBankAdminClient()
  const { data: indices, error } = await supabase
    .schema('birrbank')
    .from('market_indices')
    .select('*')
    .order('index_date', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ indices: indices ?? [] })
}

export async function POST(req: NextRequest) {
  const token = cookies().get('hl_admin_session')?.value
  if (!verifySessionToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const supabase = createBirrBankAdminClient()
    const body = await req.json()
    const { action, id } = body
    if (action === 'upsert') {
      const { index_code, index_name, index_date, close_value, change_pct, volume } = body
      if (!index_code || !index_name || !index_date || !close_value) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }
      const { error } = await supabase.schema('birrbank').from('market_indices').upsert({
        index_code: index_code.toUpperCase(),
        index_name,
        index_date,
        close_value: Number(close_value),
        change_pct:  change_pct ? Number(change_pct) : null,
        volume:      volume     ? Number(volume)      : null,
      }, { onConflict: 'index_code,index_date' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
    if (action === 'delete' && id) {
      const { error } = await supabase.schema('birrbank').from('market_indices').delete().eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
