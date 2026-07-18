import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const GREEN = '#1C7C4C'
const DARK = '#152238'

function emailWrapper(content: string) {
  return `
    <!DOCTYPE html>
    <html lang='en'>
    <head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head>
    <body style='margin:0;padding:0;background:#f4f5f3;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;'>
      <table width='100%' cellpadding='0' cellspacing='0' style='background:#f4f5f3;padding:40px 16px;'>
        <tr><td align='center'>
          <table width='100%' cellpadding='0' cellspacing='0' style='max-width:540px;'>
            <!-- Header -->
            <tr><td style='background:${GREEN};border-radius:16px 16px 0 0;padding:32px 40px;'>
              <p style='margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;'>ሃገር · Homeland · HagerLand</p>
              <p style='margin:0;color:#fff;font-size:22px;font-weight:700;line-height:1.3;'>Community Directory</p>
            </td></tr>
            <!-- Body -->
            <tr><td style='background:#ffffff;padding:40px;border-left:1px solid #e4e6e3;border-right:1px solid #e4e6e3;'>
              ${content}
            </td></tr>
            <!-- Footer -->
            <tr><td style='background:#f4f5f3;border-radius:0 0 16px 16px;padding:24px 40px;border:1px solid #e4e6e3;border-top:none;'>
              <p style='margin:0;color:#9ca3af;font-size:12px;line-height:1.6;'>
                HagerLand — The free, verified community directory.<br>
                Serving the diaspora worldwide.
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    )
    const resend = new Resend(process.env.RESEND_API_KEY)
    const token = req.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.redirect(new URL('/business/post?verified=invalid', req.url))

    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('verification_token', token)
      .single()

    if (error || !data) return NextResponse.redirect(new URL('/business/post?verified=invalid', req.url))
    if (data.status !== 'pending_verification') return NextResponse.redirect(new URL('/business?verified=already', req.url))

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hagerland-platform.vercel.app'
    const manageUrl = `${baseUrl}/business/manage?token=${data.manage_token}`

    await supabase
      .from('companies')
      .update({ status: 'pending', email_verified_at: new Date().toISOString(), verification_token: null })
      .eq('id', data.id)

    // Admin notification
    await resend.emails.send({
      from: 'HagerLand <info@accountingbody.com>',
      to: 'info@accountingbody.com',
      subject: `New business verified — ${data.company_name}`,
      html: emailWrapper(`
        <h2 style='margin:0 0 16px;color:${DARK};font-size:20px;'>New business listing pending review</h2>
        <table width='100%' cellpadding='0' cellspacing='0' style='border:1px solid #e4e6e3;border-radius:8px;overflow:hidden;margin-bottom:24px;'>
          <tr style='background:#f4f5f3;'><td style='padding:10px 14px;color:#6b7280;font-size:13px;font-weight:600;width:140px;'>Business</td><td style='padding:10px 14px;color:${DARK};font-size:13px;font-weight:700;'>${data.company_name}</td></tr>
          <tr><td style='padding:10px 14px;color:#6b7280;font-size:13px;font-weight:600;'>Category</td><td style='padding:10px 14px;color:${DARK};font-size:13px;'>${data.sic_description ?? '—'}</td></tr>
          <tr style='background:#f4f5f3;'><td style='padding:10px 14px;color:#6b7280;font-size:13px;font-weight:600;'>City</td><td style='padding:10px 14px;color:${DARK};font-size:13px;'>${data.trading_address_city ?? '—'}</td></tr>
          <tr><td style='padding:10px 14px;color:#6b7280;font-size:13px;font-weight:600;'>Contact</td><td style='padding:10px 14px;color:${DARK};font-size:13px;'>${data.contact_email}</td></tr>
          <tr style='background:#f4f5f3;'><td style='padding:10px 14px;color:#6b7280;font-size:13px;font-weight:600;'>Submitted by</td><td style='padding:10px 14px;color:${DARK};font-size:13px;'>${data.submitter_name ?? '—'}</td></tr>
        </table>
        <a href='${baseUrl}/roodber8/businesses' style='display:inline-block;background:${GREEN};color:#fff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;'>Review in admin →</a>
      `),
    })

    // Confirmation to submitter
    await resend.emails.send({
      from: 'HagerLand <info@accountingbody.com>',
      to: data.contact_email,
      subject: `Your listing is under review — ${data.company_name}`,
      html: emailWrapper(`
        <h2 style='margin:0 0 8px;color:${DARK};font-size:20px;'>Email verified. You're all set.</h2>
        <p style='margin:0 0 20px;color:#475569;font-size:15px;line-height:1.7;'>
          Thank you${data.submitter_name ? ', ' + data.submitter_name.split(' ')[0] : ''}. Your listing for <strong>${data.company_name}</strong> has been submitted and is now with our team for review.
        </p>
        <div style='background:#f0f9f4;border-left:4px solid ${GREEN};padding:16px 20px;border-radius:4px;margin-bottom:24px;'>
          <p style='margin:0;color:${DARK};font-size:14px;font-weight:600;'>What happens next?</p>
          <p style='margin:8px 0 0;color:#475569;font-size:14px;line-height:1.6;'>Our team reviews every listing personally. We aim to complete all reviews within 48 hours. Once approved, your business will appear on the HagerLand directory.</p>
        </div>
        <p style='margin:0 0 8px;color:${DARK};font-size:14px;font-weight:600;'>Need to make changes?</p>
        <p style='margin:0 0 16px;color:#475569;font-size:14px;'>You can update your listing at any time using the link below. Save it — you will need it to edit your submission.</p>
        <a href='${manageUrl}' style='display:inline-block;background:${GREEN};color:#fff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;margin-bottom:24px;'>Edit your listing →</a>
        <p style='margin:0;color:#9ca3af;font-size:12px;'>If you did not submit this listing, please ignore this email.</p>
      `),
    })

    return NextResponse.redirect(new URL('/business?verified=true', req.url))
  } catch (err) {
    console.error('Verify email error:', err)
    return NextResponse.redirect(new URL('/business/post?verified=error', req.url))
  }
}