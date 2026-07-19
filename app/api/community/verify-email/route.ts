import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
export const dynamic = 'force-dynamic'
const GREEN = '#1C7C4C'
function emailWrapper(content: string) {
  return `<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'></head>
  <body style='margin:0;padding:0;background:#f4f5f3;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;'>
  <table width='100%' cellpadding='0' cellspacing='0' style='background:#f4f5f3;padding:40px 16px;'>
  <tr><td align='center'><table width='100%' cellpadding='0' cellspacing='0' style='max-width:540px;'>
  <tr><td style='background:${GREEN};border-radius:16px 16px 0 0;padding:32px 40px;'>
  <p style='margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;'>ሃገር · Homeland · HagerLand</p>
  <p style='margin:0;color:#fff;font-size:22px;font-weight:700;'>Community Directory</p></td></tr>
  <tr><td style='background:#ffffff;padding:40px;border-left:1px solid #e4e6e3;border-right:1px solid #e4e6e3;'>${content}</td></tr>
  <tr><td style='background:#f4f5f3;border-radius:0 0 16px 16px;padding:24px 40px;border:1px solid #e4e6e3;border-top:none;'>
  <p style='margin:0;color:#9ca3af;font-size:12px;'>HagerLand — The free, verified community directory.</p>
  </td></tr></table></td></tr></table></body></html>`
}
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)
    const resend = new Resend(process.env.RESEND_API_KEY)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hagerland-platform.vercel.app'
    const token = req.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.redirect(new URL('/community/post?error=invalid', req.url))
    const { data, error } = await supabase.from('community').select('*').eq('verification_token', token).single()
    if (error || !data) return NextResponse.redirect(new URL('/community/post?error=invalid', req.url))
    if (data.status !== 'pending_verification') return NextResponse.redirect(new URL('/community?verified=already', req.url))
    const submittedAt = new Date(data.created_at)
    const hoursSince = (Date.now() - submittedAt.getTime()) / (1000 * 60 * 60)
    if (hoursSince > 24) {
      await supabase.from('community').delete().eq('id', data.id)
      return NextResponse.redirect(new URL('/community/post?error=expired', req.url))
    }
    await supabase.from('community').update({ status: 'pending', email_verified_at: new Date().toISOString(), verification_token: null }).eq('id', data.id)
    const manageUrl = `${baseUrl}/community/manage?token=${data.manage_token}`
    const name = data.title || data.name || data.company_name || 'Your listing'
    await resend.emails.send({
      from: 'HagerLand <info@accountingbody.com>',
      to: data.contact_email,
      subject: `Your listing is under review — ${name}`,
      html: emailWrapper(`
        <h2 style='margin:0 0 16px;font-size:20px;font-weight:700;color:#152238;'>Your listing is under review</h2>
        <p style='margin:0 0 16px;font-size:14px;color:#6B7280;line-height:1.6;'>Thank you for submitting <strong style='color:#152238;'>${name}</strong> to HagerLand. Our team will review it within 48 hours.</p>
        <a href='${manageUrl}' style='display:inline-block;background:${GREEN};color:#ffffff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:100px;text-decoration:none;'>Edit my listing</a>
      `)
    })
    await resend.emails.send({
      from: 'HagerLand <info@accountingbody.com>',
      to: 'info@accountingbody.com',
      subject: `New community listing verified — ${name}`,
      html: emailWrapper(`<p style='font-size:14px;color:#152238;'>New community listing verified: <strong>${name}</strong></p>`)
    })
    return NextResponse.redirect(new URL('/community?verified=true', req.url))
  } catch (err) {
    console.error(err)
    return NextResponse.redirect(new URL('/community/post?error=server', req.url))
  }
}
