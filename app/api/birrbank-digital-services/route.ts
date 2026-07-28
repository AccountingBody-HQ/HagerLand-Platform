import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'
import { verifySessionToken } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const token = cookies().get('hl_admin_session')?.value
  if (!verifySessionToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { action, institution_slug, has_mobile_app, has_internet_banking, has_ussd, has_swift, mobile_money_platform, app_store_rating } = body
    const supabase = createBirrBankAdminClient()

    if (action === 'save_digital_services') {
      if (!institution_slug) {
        return NextResponse.json({ error: 'Missing institution_slug' }, { status: 400 })
      }
      const { error } = await supabase
        .schema('birrbank')
        .from('digital_services')
        .upsert({
          institution_slug,
          has_mobile_app: Boolean(has_mobile_app),
          has_internet_banking: Boolean(has_internet_banking),
          has_ussd: Boolean(has_ussd),
          has_swift: Boolean(has_swift),
          mobile_money_platform: mobile_money_platform ?? null,
          app_store_rating: app_store_rating ? Number(app_store_rating) : null,
        }, { onConflict: 'institution_slug' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
