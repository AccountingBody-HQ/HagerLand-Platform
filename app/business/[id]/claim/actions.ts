'use server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Resend } from 'resend'
import { redirect } from 'next/navigation'
import crypto from 'crypto'

export async function submitClaim(companyId: string, formData: FormData) {
  const claimantName = (formData.get('claimant_name') as string)?.trim()
  const claimantEmail = (formData.get('claimant_email') as string)?.trim()

  if (!claimantName || !claimantEmail) {
    redirect(`/business/${companyId}/claim?error=missing`)
  }

  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('is_claimed, is_verified, company_name')
    .eq('id', companyId)
    .single()

  if (!company) redirect(`/business/${companyId}/claim?error=notfound`)
  if (company.is_verified || company.is_claimed) {
    redirect(`/business/${companyId}/claim?error=claimed`)
  }

  const { data: existing } = await supabaseAdmin
    .from('business_claims')
    .select('id')
    .eq('company_id', companyId)
    .eq('claimant_email', claimantEmail)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) redirect(`/business/${companyId}/claim?error=duplicate`)

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { error: insertError } = await supabaseAdmin
    .from('business_claims')
    .insert({
      company_id: companyId,
      claimant_name: claimantName,
      claimant_email: claimantEmail,
      verification_code: token,
      code_expires_at: expiresAt,
      status: 'pending',
    })

  if (insertError) {
    console.error('Failed to insert claim:', insertError)
    redirect(`/business/${companyId}/claim?error=server`)
  }

  const verifyUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hagerland-platform.vercel.app'}/business/${companyId}/claim/verify?token=${token}`

  try {
    
    const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
      from: 'HagerLand <info@accountingbody.com>',
      to: claimantEmail,
      subject: `Verify your claim — ${company.company_name}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E4E6E3">
          <div style="background:#1C7C4C;padding:28px 40px">
            <p style="color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;margin:0 0 6px 0">ሃገር · Homeland · HagerLand</p>
            <p style="color:#ffffff;font-size:18px;font-weight:700;margin:0">Verify your listing claim</p>
          </div>
          <div style="padding:36px 40px">
            <p style="color:#152238;font-size:15px;margin:0 0 16px 0">Hi ${claimantName},</p>
            <p style="color:#152238;font-size:15px;margin:0 0 16px 0">Thank you for requesting to manage the listing for <strong>${company.company_name}</strong> on HagerLand.</p>
            <p style="color:#152238;font-size:15px;margin:0 0 24px 0">Please verify your email address by clicking the button below. Once verified, our team will review your claim before granting access. This ensures only legitimate owners and managers can update listings.</p>
            <p style="margin:0 0 28px 0">
              <a href="${verifyUrl}" style="display:inline-block;background:#1C7C4C;color:#ffffff;padding:14px 32px;border-radius:32px;text-decoration:none;font-weight:700;font-size:15px">
                Verify my claim
              </a>
            </p>
            <div style="background:#f0f9f4;border-radius:8px;padding:16px 20px;margin:0 0 24px 0">
              <p style="color:#1C7C4C;font-size:13px;font-weight:600;margin:0 0 6px 0">What happens next?</p>
              <p style="color:#152238;font-size:13px;margin:0">After verifying your email, our team will review your claim. You may be asked to provide additional proof of ownership. We aim to review all claims within 2 business days.</p>
            </div>
            <p style="color:#6B7280;font-size:13px;margin:0 0 8px 0">This link expires in 24 hours.</p>
            <p style="color:#6B7280;font-size:13px;margin:0 0 24px 0">If you did not request this, please ignore this email. Your listing will not be affected.</p>
            <p style="color:#6B7280;font-size:11px;margin:0;word-break:break-all">Or copy this link: ${verifyUrl}</p>
          </div>
          <div style="background:#F4F5F3;padding:20px 40px;border-top:1px solid #E4E6E3">
            <p style="color:#6B7280;font-size:12px;margin:0;text-align:center">HagerLand — The free, verified community directory.</p>
          </div>
        </div>`,
    })
  } catch (err) {
    console.error('Claim verification email failed:', err)
  }

  redirect(`/business/${companyId}/claim?success=sent`)
}
