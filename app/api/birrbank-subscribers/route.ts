import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { verifySessionToken } from '@/lib/admin-auth'

// Subscriber emails are PII — unlike the other birrbank-* GET routes, this one is guarded.
export async function GET() {
  const token = cookies().get('hl_admin_session')?.value
  if (!verifySessionToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createBirrBankAdminClient()
  const { data: subscribers, error } = await supabase
    .schema('birrbank')
    .from('email_subscribers')
    .select('*')
    .order('subscribed_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ subscribers: subscribers ?? [] })
}

export async function POST(req: NextRequest) {
  const token = cookies().get('hl_admin_session')?.value
  if (!verifySessionToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const supabase = createBirrBankAdminClient()
    const body = await req.json()
    const { action, id } = body

    if (action === 'toggle' && id) {
      const { is_active } = body
      const { error } = await supabase.schema('birrbank').from('email_subscribers')
        .update({ is_active }).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
    if (action === 'delete' && id) {
      const { error } = await supabase.schema('birrbank').from('email_subscribers')
        .delete().eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
