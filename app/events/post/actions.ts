'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { verifyTurnstileToken, isHoneypotFilled } from '@/lib/turnstile'
const GREEN = '#1C7C4C'
export async function postEvents(formData: FormData) {
  if (isHoneypotFilled(formData)) redirect('/events?error=1')
  const turnstileToken = formData.get('cf-turnstile-response') as string | null
  if (turnstileToken) {
    const isHuman = await verifyTurnstileToken(turnstileToken)
    if (!isHuman) redirect('/events?error=1')
  }
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hagerland-platform.vercel.app'
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!)
  const resend = new Resend(process.env.RESEND_API_KEY)
  const title = (formData.get('title') as string ?? '').trim()
  const submitterName = (formData.get('submitter_name') as string ?? '').trim()
  const contactEmail = (formData.get('contact_email') as string ?? '').trim()
  const category = (formData.get('category') as string ?? '').trim()
  const description = (formData.get('description') as string ?? '').trim()
  const city = (formData.get('city') as string ?? '').trim()
  const countryName = (formData.get('country') as string ?? '').trim()
  const address = (formData.get('address') as string ?? '').trim()
  const phone = (formData.get('phone') as string ?? '').trim()
  const website = (formData.get('website') as string ?? '').trim()
  const openingHours = (formData.get('opening_hours') as string ?? '').trim()
  const instagram = (formData.get('instagram') as string ?? '').trim()
  const facebook = (formData.get('facebook') as string ?? '').trim()
  const whatsapp = (formData.get('whatsapp') as string ?? '').trim()
  if (!title || !contactEmail || !submitterName || !description || !phone || !category) {
    redirect('/events/post?error=missing')
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(contactEmail)) redirect('/events/post?error=invalid-email')
  const verificationToken = crypto.randomUUID()
  const manageToken = crypto.randomUUID()
  const verifyUrl = `${baseUrl}/api/events/verify-email?token=${verificationToken}`
  const { error: dbError } = await supabase.from('events').insert({
    title: title,
    submitter_name: submitterName,
    contact_email: contactEmail,
    category: category,
    ai_description: description,
    city: city || null,
    country: countryName || null,
    address: address || null,
    phone: phone || null,
    website: website || null,
    opening_hours: openingHours || null,
    instagram: instagram || null,
    facebook: facebook || null,
    whatsapp: whatsapp || null,
    status: 'pending_verification',
    verification_token: verificationToken,
    manage_token: manageToken,
  })
  if (dbError) redirect('/events/post?error=db')
  await resend.emails.send({
    from: 'HagerLand <info@accountingbody.com>',
    to: contactEmail,
    subject: `Verify your email — ${title}`,
    html: `<!DOCTYPE html><html><body style='margin:0;padding:0;background:#f4f5f3;font-family:-apple-system,sans-serif;'>
    <table width='100%' cellpadding='0' cellspacing='0' style='background:#f4f5f3;padding:40px 16px;'><tr><td align='center'>
    <table width='100%' cellpadding='0' cellspacing='0' style='max-width:540px;'>
    <tr><td style='background:${GREEN};border-radius:16px 16px 0 0;padding:32px 40px;'>
    <p style='margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;'>ሃገር · Homeland · HagerLand</p>
    <p style='margin:0;color:#fff;font-size:22px;font-weight:700;'>Community Directory</p></td></tr>
    <tr><td style='background:#fff;padding:40px;border:1px solid #e4e6e3;border-top:none;'>
    <h2 style='margin:0 0 16px;font-size:20px;font-weight:700;color:#152238;'>Verify your email address</h2>
    <p style='margin:0 0 24px;font-size:14px;color:#6B7280;line-height:1.6;'>Please verify your email to submit <strong style='color:#152238;'>${title}</strong> to HagerLand for review.</p>
    <a href='${verifyUrl}' style='display:inline-block;background:${GREEN};color:#fff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:100px;text-decoration:none;'>Verify my email →</a>
    <p style='margin:24px 0 0;font-size:12px;color:#9ca3af;'>Link expires in 24 hours.</p>
    </td></tr>
    <tr><td style='background:#f4f5f3;border-radius:0 0 16px 16px;padding:24px 40px;border:1px solid #e4e6e3;border-top:none;'>
    <p style='margin:0;color:#9ca3af;font-size:12px;'>HagerLand — The free, verified community directory.</p>
    </td></tr></table></td></tr></table></body></html>`
  })
  redirect('/events/post?success=verify')
}
