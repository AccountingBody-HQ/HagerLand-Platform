import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

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
    if (data.status !== 'pending_verification') return NextResponse.redirect(new URL('/business/post?verified=already', req.url))

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hagerland-platform.vercel.app'
    const manageUrl = `${baseUrl}/business/manage?token=${data.manage_token}`

    await supabase
      .from('companies')
      .update({ status: 'pending', email_verified_at: new Date().toISOString(), verification_token: null })
      .eq('id', data.id)

    // Notify admin
    await resend.emails.send({
      from: 'HagerLand <info@accountingbody.com>',
      to: 'info@accountingbody.com',
      subject: `New business verified — ${data.company_name}`,
      html: `<p>A new business listing has been verified and is awaiting your review.</p>
             <p><strong>Business:</strong> ${data.company_name}</p>
             <p><strong>City:</strong> ${data.trading_address_city ?? 'Not specified'}</p>
             <p><strong>Category:</strong> ${data.sic_description ?? 'Not specified'}</p>
             <p><strong>Contact:</strong> ${data.contact_email}</p>
             <p><a href='https://hagerland-platform.vercel.app/roodber8/businesses'>Review in admin →</a></p>`,
    })

    // Confirmation to submitter with manage link
    await resend.emails.send({
      from: 'HagerLand <info@accountingbody.com>',
      to: data.contact_email,
      subject: 'Email verified — your business listing is under review',
      html: `<p>Thank you for verifying your email address.</p>
             <p>Your listing for <strong>${data.company_name}</strong> is now with our team for review. We aim to review all submissions within 48 hours.</p>
             <p>Once approved, your business will appear on the HagerLand directory.</p>
             <p>Need to update your listing? <a href='${manageUrl}'>Edit your submission →</a></p>
             <p>Save this link — you will need it to make any changes.</p>`,
    })

    return NextResponse.redirect(new URL('/business?verified=true', req.url))
  } catch (err) {
    console.error('Verify email error:', err)
    return NextResponse.redirect(new URL('/business/post?verified=error', req.url))
  }
}