'use server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { verifyTurnstileToken, isHoneypotFilled } from '@/lib/turnstile'
import { redirect } from 'next/navigation'

const GREEN = '#1C7C4C'
const DARK = '#152238'

function emailWrapper(content: string) {
  return `<!DOCTYPE html>
    <html lang='en'>
    <head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head>
    <body style='margin:0;padding:0;background:#f4f5f3;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;'>
      <table width='100%' cellpadding='0' cellspacing='0' style='background:#f4f5f3;padding:40px 16px;'>
        <tr><td align='center'>
          <table width='100%' cellpadding='0' cellspacing='0' style='max-width:540px;'>
            <tr><td style='background:${GREEN};border-radius:16px 16px 0 0;padding:32px 40px;'>
              <p style='margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;'>ሃገር · Homeland · HagerLand</p>
              <p style='margin:0;color:#fff;font-size:22px;font-weight:700;'>Community Directory</p>
            </td></tr>
            <tr><td style='background:#ffffff;padding:40px;border-left:1px solid #e4e6e3;border-right:1px solid #e4e6e3;'>
              ${content}
            </td></tr>
            <tr><td style='background:#f4f5f3;border-radius:0 0 16px 16px;padding:24px 40px;border:1px solid #e4e6e3;border-top:none;'>
              <p style='margin:0;color:#9ca3af;font-size:12px;line-height:1.6;'>HagerLand — The free, verified community directory.<br>Serving the diaspora worldwide.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>`
}

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

  const companyName   = (formData.get('company_name') as string ?? '').trim()
  const city          = (formData.get('trading_address_city') as string ?? '').trim()
  const phone         = (formData.get('phone') as string ?? '').trim()
  const website       = (formData.get('website') as string ?? '').trim()
  const category      = (formData.get('sic_description') as string ?? '').trim()
  const contactEmail  = (formData.get('contact_email') as string ?? '').trim()
  const submitterName = (formData.get('submitter_name') as string ?? '').trim()

  if (!companyName || !contactEmail) redirect('/business/post?error=missing')

  const verificationToken = crypto.randomUUID()
  const manageToken       = crypto.randomUUID()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hagerland-platform.vercel.app'
  const verifyUrl = `${baseUrl}/api/business/verify-email?token=${verificationToken}`

  const { data: country } = await supabase.from('countries').select('id').eq('code', 'GB').single()

  const { error } = await supabase.from('companies').insert({
    company_name:         companyName,
    company_number:       `SELFSERVE-${Date.now()}`,
    country_id:           country?.id,
    trading_address_city: city || null,
    phone:                phone || null,
    website:              website || null,
    sic_description:      category || null,
    contact_email:        contactEmail,
    submitter_name:       submitterName || null,
    status:               'pending_verification',
    first_seen_at:        new Date().toISOString(),
    tier_classification:  1,
    profile_published:    false,
    verification_token:   verificationToken,
    manage_token:         manageToken,
  })

  if (error) {
    console.error('Insert error:', error)
    redirect('/business/post?error=db')
  }

  await resend.emails.send({
    from: 'HagerLand <info@accountingbody.com>',
    to:   contactEmail,
    subject: `Verify your email — ${companyName} listing`,
    html: emailWrapper(`
      <h2 style='margin:0 0 8px;color:${DARK};font-size:20px;'>One step to go.</h2>
      <p style='margin:0 0 20px;color:#475569;font-size:15px;line-height:1.7;'>
        Thank you${submitterName ? ', ' + submitterName.split(' ')[0] : ''} for submitting <strong>${companyName}</strong> to HagerLand.
        Please verify your email address to send your listing to our review team.
      </p>
      <a href='${verifyUrl}' style='display:inline-block;background:${GREEN};color:#fff;font-weight:600;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;margin-bottom:24px;'>Verify my email →</a>
      <p style='margin:16px 0 4px;color:#6b7280;font-size:13px;'>This link expires in 24 hours.</p>
      <p style='margin:0;color:#9ca3af;font-size:12px;'>If you did not submit this listing, you can safely ignore this email.</p>
    `),
  })

  redirect('/business/post?success=verify')
}