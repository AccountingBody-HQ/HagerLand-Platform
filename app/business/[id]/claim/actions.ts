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

  const verifyUrl = `https://hagerland.com/business/${companyId}/claim/verify?token=${token}`

  try {
    
    const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
      from: 'HagerLand <info@accountingbody.com>',
      to: claimantEmail,
      subject: `Verify your claim — ${company.company_name}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:24px">
          <h2 style="color:#152238">Verify your claim on HagerLand</h2>
          <p>Hi ${claimantName},</p>
          <p>You requested to claim the listing for <strong>${company.company_name}</strong> on HagerLand.</p>
          <p style="margin:24px 0">
            <a href="${verifyUrl}"
              style="background:#1C7C4C;color:#fff;padding:12px 24px;border-radius:24px;text-decoration:none;font-weight:600">
              Verify my claim
            </a>
          </p>
          <p style="color:#5B6472;font-size:14px">This link expires in 24 hours.</p>
          <p style="color:#5B6472;font-size:14px">If you did not make this request, ignore this email.</p>
          <p style="color:#5B6472;font-size:12px">Or copy this link: ${verifyUrl}</p>
          <p>— The HagerLand Team</p>
        </div>`,
    })
  } catch (err) {
    console.error('Claim verification email failed:', err)
  }

  redirect(`/business/${companyId}/claim?success=sent`)
}
