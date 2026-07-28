import { NextRequest, NextResponse } from 'next/server'
import { createBirrBankAdminClient } from '@/lib/supabase-birrbank'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    const supabase = createBirrBankAdminClient()
    const { error } = await supabase
      .schema('birrbank')
      .from('email_subscribers')
      .upsert(
        { email: email.toLowerCase().trim(), is_active: true },
        { onConflict: 'email' }
      )
    if (error) {
      console.error('Subscribe error:', error)
      return NextResponse.json({ error: 'Could not save subscription.' }, { status: 500 })
    }

    // Send welcome email via Resend
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
            to: [email.toLowerCase().trim()],
            subject: 'Welcome to BirrBank — Ethiopia financial intelligence',
            html: `
              <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; background: #ffffff;">
                <div style="margin-bottom: 32px;">
                  <div style="margin-bottom: 24px;">
                    <span style="font-weight: 800; font-size: 20px; color: #0f172a; letter-spacing: -0.5px;">BirrBank</span>
                  </div>
                  <h1 style="font-size: 26px; font-weight: 700; color: #0f172a; margin: 0 0 12px; letter-spacing: -0.5px;">
                    You are subscribed.
                  </h1>
                  <p style="color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">
                    Thank you for subscribing to BirrBank — Ethiopia's independent financial intelligence platform. You will receive updates on savings rates, FX movements, ESX listings, ECX commodity prices and new guides.
                  </p>
                  <div style="background: #f8fafc; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
                    <p style="color: #1D4ED8; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 8px;">What we cover</p>
                    <p style="color: #475569; font-size: 13px; margin: 0; line-height: 1.8;">
                      Banking rates &amp; FX &nbsp;&bull;&nbsp; Insurance comparison &nbsp;&bull;&nbsp; ESX equities &nbsp;&bull;&nbsp; ECX commodities &nbsp;&bull;&nbsp; NBE regulations &nbsp;&bull;&nbsp; Diaspora guides
                    </p>
                  </div>
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hagerland.com'}/birrbank/banking" style="display: inline-block; background: #1D4ED8; color: #ffffff; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 9999px; text-decoration: none;">
                    Explore BirrBank
                  </a>
                </div>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                <p style="color: #94a3b8; font-size: 12px; line-height: 1.7; margin: 0;">
                  You are receiving this because you subscribed on BirrBank at HagerLand.
                </p>
              </div>
            `,
          }),
        })
      } catch (emailErr) {
        console.error('Welcome email failed:', emailErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Subscribe route error:', err)
    return NextResponse.json({ error: 'Server error.' }, { status: 500 })
  }
}
