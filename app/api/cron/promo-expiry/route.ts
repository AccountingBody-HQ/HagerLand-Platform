import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
  const resend = new Resend(process.env.RESEND_API_KEY)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hagerland-platform.vercel.app'

  // Find promotions expiring in exactly 3 days
  const in3Days = new Date()
  in3Days.setDate(in3Days.getDate() + 3)
  const dayStart = new Date(in3Days)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(in3Days)
  dayEnd.setHours(23, 59, 59, 999)

  const { data: expiring, error } = await supabase
    .from('companies')
    .select('id, company_name, contact_email, promo_text, promo_expires_at, manage_token')
    .eq('status', 'active')
    .gte('promo_expires_at', dayStart.toISOString())
    .lte('promo_expires_at', dayEnd.toISOString())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!expiring || expiring.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No expiring promotions today' })
  }

  let sent = 0
  for (const business of expiring) {
    if (!business.contact_email || !business.manage_token) continue
    const manageUrl = `${baseUrl}/business/manage?token=${business.manage_token}`
    const expiryDate = new Date(business.promo_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

    await resend.emails.send({
      from: 'HagerLand <info@accountingbody.com>',
      to: business.contact_email,
      subject: `Your promotion expires in 3 days — ${business.company_name}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <div style="background:#1C7C4C;padding:24px 32px;border-radius:12px 12px 0 0">
            <p style="color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 4px">ሃገር · Homeland · HagerLand</p>
            <p style="color:rgba(255,255,255,0.5);font-size:11px;margin:0">Community Directory</p>
          </div>
          <div style="background:#ffffff;padding:40px 32px">
            <h1 style="font-size:20px;font-weight:700;color:#152238;margin:0 0 16px">Your promotion expires in 3 days</h1>
            <p style="color:#6B7280;font-size:14px;line-height:1.6;margin:0 0 16px">
              The promotion you posted for <strong style="color:#152238">${business.company_name}</strong> will expire on <strong style="color:#152238">${expiryDate}</strong>.
            </p>
            <div style="background:#f4f5f3;border-radius:8px;padding:16px;margin:0 0 24px">
              <p style="font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 8px">Your current promotion</p>
              <p style="font-size:14px;color:#152238;margin:0;line-height:1.6">${business.promo_text}</p>
            </div>
            <p style="color:#6B7280;font-size:14px;line-height:1.6;margin:0 0 24px">
              To keep it live, log in to your listing and update the end date. Or replace it with something new.
            </p>
            <a href="${manageUrl}" style="display:inline-block;background:#1C7C4C;color:#ffffff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:100px;text-decoration:none">
              Update my promotion →
            </a>
          </div>
          <div style="background:#f4f5f3;padding:16px 32px;border-radius:0 0 12px 12px">
            <p style="color:#6B7280;font-size:12px;margin:0">HagerLand — The free, verified community directory.</p>
          </div>
        </div>
      `
    })
    sent++
  }

  return NextResponse.json({ sent, message: `Sent ${sent} expiry reminder(s)` })
}
