import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { verifySessionToken } from '@/lib/admin-auth'

export async function GET() {
  const supabase = createBirrBankAdminClient()
  const { data } = await supabase
    .schema('birrbank')
    .from('regulations')
    .select('id, title, summary, regulator, category, published_date, full_text_url, is_current')
    .order('published_date', { ascending: false })
  return NextResponse.json({ regulations: data ?? [] })
}

export async function POST(req: Request) {
  const token = cookies().get('hl_admin_session')?.value
  if (!verifySessionToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { action } = body
    const supabase = createBirrBankAdminClient()

    if (action === 'add') {
      const { title, summary, regulator, category, published_date, full_text_url } = body
      if (!title || !regulator) return NextResponse.json({ error: 'title and regulator required' }, { status: 400 })
      const { error } = await supabase.schema('birrbank').from('regulations').insert({
        title,
        summary: summary || null,
        regulator,
        category: category || null,
        published_date: published_date || null,
        full_text_url: full_text_url || null,
        is_current: true,
        country_code: 'ET',
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'toggle') {
      const { id, is_current } = body
      const { error } = await supabase.schema('birrbank').from('regulations').update({ is_current }).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'update_url') {
      const { id, full_text_url } = body
      const { error } = await supabase.schema('birrbank').from('regulations').update({ full_text_url: full_text_url || null }).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'delete') {
      const { id } = body
      const { error } = await supabase.schema('birrbank').from('regulations').delete().eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
