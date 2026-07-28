import { NextRequest, NextResponse } from 'next/server'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = createBirrBankAdminClient()
    const cleanEmail = email.toLowerCase().trim()

    const { data: existing } = await supabase
      .schema('birrbank')
      .from('email_subscribers')
      .select('id, is_active')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (!existing || !existing.is_active) {
      return NextResponse.json({ success: true, already: true })
    }

    const { error } = await supabase
      .schema('birrbank')
      .from('email_subscribers')
      .update({ is_active: false })
      .eq('email', cleanEmail)

    if (error) {
      console.error('Supabase unsubscribe error:', error)
      return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
    }

    // Send unsubscribe confirmation
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'BirrBank <info@accountingbody.com>',
            to: [cleanEmail],
            subject: 'You have been unsubscribed from BirrBank',
            html: `
              <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px;">
                <span style="font-weight: 800; font-size: 20px; color: #0f172a;">BirrBank</span>
                <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 24px 0 12px;">You have been unsubscribed.</h1>
                <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
                  You will no longer receive emails from BirrBank. You can resubscribe at any time from the website.
                </p>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hagerland.com'}/birrbank/banking" style="display: inline-block; background: #1D4ED8; color: #ffffff; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 9999px; text-decoration: none;">
                  Visit BirrBank
                </a>
              </div>
            `,
          }),
        })
      } catch (emailErr) {
        console.error('Unsubscribe confirmation email failed:', emailErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
