import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
export const dynamic = 'force-dynamic'
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
function isRateLimited(email: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(email)
  if (!entry || now > entry.resetAt) { rateLimitMap.set(email, { count: 1, resetAt: now + 60 * 60 * 1000 }); return false }
  if (entry.count >= 3) return true
  entry.count++; return false
}
const GREEN = '#1C7C4C'
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)
    const resend = new Resend(process.env.RESEND_API_KEY)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hagerland-platform.vercel.app'
    const { email } = await req.json()
    if (!email) return NextResponse.json({ ok: true })
    if (isRateLimited(email)) return NextResponse.json({ ok: true })
    const { data: listings } = await supabase.from('events').select('id, title, name, company_name, manage_token, status').eq('contact_email', email).in('status', ['active','pending'])
    if (!listings || listings.length === 0) return NextResponse.json({ ok: true })
    const rows = listings.map((l: Record<string, string>) => {
      const name = l.title || l.name || l.company_name || 'Your listing'
      return `<tr><td style='padding:12px 14px;color:#152238;font-size:14px;font-weight:600;border-bottom:1px solid #e4e6e3;'>${name}</td><td style='padding:12px 14px;border-bottom:1px solid #e4e6e3;'><a href='${baseUrl}/events/manage?token=${l.manage_token}' style='color:#1C7C4C;font-weight:600;font-size:14px;text-decoration:none;'>Edit listing →</a></td></tr>`
    }).join('')
    await resend.emails.send({
      from: 'HagerLand <info@accountingbody.com>',
      to: email,
      subject: 'Your HagerLand edit links',
      html: `<!DOCTYPE html><html><body style='margin:0;padding:0;background:#f4f5f3;font-family:-apple-system,sans-serif;'>
      <table width='100%' cellpadding='0' cellspacing='0' style='background:#f4f5f3;padding:40px 16px;'><tr><td align='center'>
      <table width='100%' cellpadding='0' cellspacing='0' style='max-width:540px;'>
      <tr><td style='background:${GREEN};border-radius:16px 16px 0 0;padding:32px 40px;'>
      <p style='margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;'>ሃገር · Homeland · HagerLand</p>
      <p style='margin:0;color:#fff;font-size:22px;font-weight:700;'>Community Directory</p></td></tr>
      <tr><td style='background:#fff;padding:40px;border:1px solid #e4e6e3;border-top:none;'>
      <p style='color:#152238;font-size:15px;margin:0 0 8px;'>Here are the edit links for your HagerLand listings.</p>
      <table width='100%' style='border:1px solid #e4e6e3;border-radius:8px;overflow:hidden;border-collapse:collapse;'>${rows}</table>
      </td></tr>
      <tr><td style='background:#f4f5f3;border-radius:0 0 16px 16px;padding:20px 40px;border:1px solid #e4e6e3;border-top:none;'>
      <p style='margin:0;color:#9ca3af;font-size:12px;'>HagerLand — The free, verified community directory.</p>
      </td></tr></table></td></tr></table></body></html>`
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
