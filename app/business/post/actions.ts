'use server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { verifyTurnstileToken, isHoneypotFilled } from '@/lib/turnstile'
import { redirect } from 'next/navigation'

export async function postBusiness(formData: FormData) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
  const resend = new Resend(process.env.RESEND_API_KEY)

  if (isHoneypotFilled(formData)) redirect('/business?error=1')

  const turnstileToken = formData.get('cf-turnstile-response') as string | null
  if (turnstileToken) {
    const isHuman = await verifyTurnstileToken(turnstileToken)
    if (!isHuman) redirect('/business?error=1')
  }

  const companyName = (formData.get('company_name') as string ?? '').trim()
  const city = (formData.get('trading_address_city') as string ?? '').trim()
  const phone = (formData.get('phone') as string ?? '').trim()
  const website = (formData.get('website') as string ?? '').trim()
  const category = (formData.get('sic_description') as string ?? '').trim()
  const contactEmail = (formData.get('contact_email') as string ?? '').trim()
  const submitterName = (formData.get('submitter_name') as string ?? '').trim()

  if (!companyName || !contactEmail) redirect('/business/post?error=missing')

  const verificationToken = crypto.randomUUID()
  const manageToken = crypto.randomUUID()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hagerland-platform.vercel.app'

  const { data: country } = await supabase.from('countries').select('id').eq('code', 'GB').single()

  const { error } = await supabase.from('companies').insert({
    company_name: companyName,
    company_number: `SELFSERVE-${Date.now()}`,
    country_id: country?.id,
    trading_address_city: city || null,
    phone: phone || null,
    website: website || null,
    sic_description: category || null,
    contact_email: contactEmail,
    submitter_name: submitterName || null,
    status: 'pending_verification',
    tier_classification: 1,
    profile_published: false,
    verification_token: verificationToken,
    manage_token: manageToken,
  })

  if (error) {
    console.error('Insert error:', error)
    redirect('/business/post?error=db')
  }

  // Send verification email
  const verifyUrl = `${baseUrl}/api/business/verify-email?token=${verificationToken}`
  await resend.emails.send({
    from: 'HagerLand <info@accountingbody.com>',
    to: contactEmail,
    subject: 'Please verify your email — HagerLand listing',
    html: `
      <div style='font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;'>
        <div style='background:#1C7C4C;padding:32px;border-radius:12px 12px 0 0;'>
          <h1 style='color:#fff;margin:0;font-size:22px;'>Verify your email</h1>
          <p style='color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:14px;'>HagerLand — Community Directory</p>
        </div>
        <div style='background:#fff;padding:32px;border:1px solid #e4e6e3;border-top:none;border-radius:0 0 12px 12px;'>
          <p style='color:#152238;font-size:15px;'>Thank you for submitting <strong>${companyName}</strong> to HagerLand.</p>
          <p style='color:#475569;font-size:14px;'>Please verify your email address to submit your listing for review.</p>
          <a href='${verifyUrl}' style='display:inline-block;background:#1C7C4C;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin:16px 0;'>Verify my email →</a>
          <p style='color:#6B7280;font-size:12px;margin-top:24px;'>If you did not submit this listing, you can ignore this email.</p>
          <p style='color:#6B7280;font-size:12px;'>This link expires in 24 hours.</p>
        </div>
      </div>`,
  })

  redirect('/business/post?success=verify')
}