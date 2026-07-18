import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )
    const resend = new Resend(process.env.RESEND_API_KEY)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hagerland-platform.vercel.app'

    // Find all active/pending listings for this email
    const { data: listings } = await supabase
      .from('companies')
      .select('id, company_name, manage_token, status')
      .eq('contact_email', email.trim().toLowerCase())
      .in('status', ['active', 'pending', 'pending_verification'])

    // Always return success to prevent email enumeration
    if (!listings || listings.length === 0) {
      return NextResponse.json({ ok: true })
    }

    const listingsHtml = listings.map(l =>
      `<tr><td style='padding:10px 14px;color:#152238;font-size:14px;font-weight:600;'>${l.company_name}</td>
       <td style='padding:10px 14px;'><a href='${baseUrl}/business/manage?token=${l.manage_token}' style='color:#1C7C4C;font-weight:600;font-size:14px;'>Edit listing →</a></td></tr>`
    ).join('')

    await resend.emails.send({
      from: 'HagerLand <info@accountingbody.com>',
      to: email,
      subject: 'Your HagerLand edit links',
      html: `<!DOCTYPE html>
        <html><body style='margin:0;padding:0;background:#f4f5f3;font-family:-apple-system,BlinkMacSystemFont,sans-serif;'>
        <table width='100%' cellpadding='0' cellspacing='0' style='padding:40px 16px;'>
          <tr><td align='center'>
            <table width='100%' style='max-width:540px;'>
              <tr><td style='background:#1C7C4C;border-radius:16px 16px 0 0;padding:32px 40px;'>
                <p style='margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;'>ሃገር · Homeland · HagerLand</p>
                <p style='margin:0;color:#fff;font-size:22px;font-weight:700;'>Your edit links</p>
              </td></tr>
              <tr><td style='background:#fff;padding:40px;border:1px solid #e4e6e3;border-top:none;'>
                <p style='color:#152238;font-size:15px;margin:0 0 20px;'>Here are the edit links for your HagerLand listings:</p>
                <table width='100%' style='border:1px solid #e4e6e3;border-radius:8px;overflow:hidden;'>
                  ${listingsHtml}
                </table>
                <p style='color:#6b7280;font-size:12px;margin:20px 0 0;'>Save these links — you will need them to make future changes.</p>
              </td></tr>
              <tr><td style='background:#f4f5f3;border-radius:0 0 16px 16px;padding:20px 40px;border:1px solid #e4e6e3;border-top:none;'>
                <p style='margin:0;color:#9ca3af;font-size:12px;'>HagerLand — The free, verified community directory.</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
        </body></html>`,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Resend link error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}