'use server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Resend } from 'resend'
import { redirect } from 'next/navigation'
import crypto from 'crypto'

export async function submitClaim(listingId: string, formData: FormData) {
  const claimantName = (formData.get('claimant_name') as string)?.trim()
  const claimantEmail = (formData.get('claimant_email') as string)?.trim()
  const relationship = (formData.get('relationship') as string)?.trim()

  if (!claimantName || !claimantEmail) {
    redirect(`/housing/${listingId}/claim?error=missing`)
  }

  const { data: listing } = await supabaseAdmin
    .from('housing')
    .select('title, manage_token')
    .eq('id', listingId)
    .single()

  if (!listing) redirect(`/housing/${listingId}/claim?error=notfound`)
  if (listing.manage_token) redirect(`/housing/${listingId}/claim?error=claimed`)

  const { data: existing } = await supabaseAdmin
    .from('business_claims')
    .select('id')
    .eq('listing_id', listingId)
    .eq('section', 'housing')
    .eq('claimant_email', claimantEmail)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) redirect(`/housing/${listingId}/claim?error=duplicate`)

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { error: insertError } = await supabaseAdmin
    .from('business_claims')
    .insert({
      listing_id: listingId,
      section: 'housing',
      claimant_name: claimantName,
      claimant_email: claimantEmail,
      relationship: relationship || null,
      verification_code: token,
      code_expires_at: expiresAt,
      status: 'pending',
    })

  if (insertError) {
    console.error('Failed to insert claim:', insertError)
    redirect(`/housing/${listingId}/claim?error=server`)
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hagerland-platform.vercel.app'
  const verifyUrl = `${baseUrl}/housing/${listingId}/claim/verify?token=${token}`
  const listingTitle = listing.title

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'HagerLand <info@accountingbody.com>',
      to: claimantEmail,
      subject: `Verify your claim — ${listingTitle}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E4E6E3">
          <div style="background:#1C7C4C;padding:28px 40px">
            <p style="color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;margin:0 0 6px 0">ሃገር · Homeland · HagerLand</p>
            <p style="color:#ffffff;font-size:18px;font-weight:700;margin:0">Verify your listing claim</p>
          </div>
          <div style="padding:36px 40px">
            <p style="color:#152238;font-size:15px;margin:0 0 16px 0">Hi ${claimantName},</p>
            <p style="color:#152238;font-size:15px;margin:0 0 16px 0">Thank you for requesting to manage the listing for <strong>${listingTitle}</strong> on HagerLand.</p>
            <p style="color:#152238;font-size:15px;margin:0 0 24px 0">Please verify your email address by clicking the button below. Once verified, our team will review your claim before granting access.</p>
            <p style="margin:0 0 28px 0">
              <a href="${verifyUrl}" style="display:inline-block;background:#1C7C4C;color:#ffffff;padding:14px 32px;border-radius:32px;text-decoration:none;font-weight:700;font-size:15px">
                Verify my claim
              </a>
            </p>
            <div style="background:#f0f9f4;border-radius:8px;padding:16px 20px;margin:0 0 24px 0">
              <p style="color:#1C7C4C;font-size:13px;font-weight:600;margin:0 0 6px 0">What happens next?</p>
              <p style="color:#152238;font-size:13px;margin:0">After verifying your email, our team will review your claim. We aim to review all claims within 2 business days.</p>
            </div>
            <p style="color:#6B7280;font-size:13px;margin:0 0 8px 0">This link expires in 24 hours.</p>
            <p style="color:#6B7280;font-size:13px;margin:0 0 24px 0">If you did not request this, please ignore this email.</p>
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

  redirect(`/housing/${listingId}/claim?success=sent`)
}
