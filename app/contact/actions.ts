'use server'

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function submitContactForm(formData: FormData) {
  const name = (formData.get('name') as string || '').trim()
  const email = (formData.get('email') as string || '').trim()
  const subject = (formData.get('subject') as string || '').trim()
  const message = (formData.get('message') as string || '').trim()
  const honey = (formData.get('website') as string || '').trim()

  if (honey) return { error: 'Invalid submission.' }
  if (!name || !email || !subject || !message) return { error: 'All fields are required.' }
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) return { error: 'Please enter a valid email address.' }
  if (message.length < 10) return { error: 'Message is too short.' }

  try {
    await resend.emails.send({
      from: 'info@accountingbody.com',
      to: 'info@accountingbody.com',
      replyTo: email,
      subject: `[HagerLand Contact] ${subject}`,
      html: `
        <h2>New contact form submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space:pre-wrap">${message}</p>
      `,
    })

    await resend.emails.send({
      from: 'info@accountingbody.com',
      to: email,
      subject: 'We received your message — HagerLand',
      html: `
        <h2>Thank you, ${name}</h2>
        <p>We have received your message and will get back to you within 48 hours.</p>
        <p>Your message:</p>
        <blockquote style="border-left:3px solid #1C7C4C;padding-left:12px;color:#5B6472">${message}</blockquote>
        <p>— The HagerLand team</p>
      `,
    })

    return { success: true }
  } catch {
    return { error: 'Something went wrong. Please try again or email us directly.' }
  }
}