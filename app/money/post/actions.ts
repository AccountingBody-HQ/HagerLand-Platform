'use server'
import { supabase } from '@/lib/supabase'
import { Resend } from 'resend'
import { redirect } from 'next/navigation'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function submitMoney(formData: FormData) {
  const honey = (formData.get('website_url') as string || '').trim()
  if (honey) redirect('/money?error=1')

  const title = (formData.get('title') as string || '').trim()
  const service_type = (formData.get('service_type') as string || '').trim()
  const description = (formData.get('description') as string || '').trim()
  const location = (formData.get('location') as string || '').trim()
  const coverage = (formData.get('coverage') as string || '').trim()
  const contact_name = (formData.get('contact_name') as string || '').trim()
  const contact_email = (formData.get('contact_email') as string || '').trim()
  const contact_phone = (formData.get('contact_phone') as string || '').trim()
  const website = (formData.get('website') as string || '').trim()

  if (!title || !contact_email || !service_type) redirect('/money/post?error=1')

  const { error } = await supabase.from('money').insert({
    title, service_type, description, location, coverage,
    contact_name, contact_email, contact_phone, website,
    status: 'pending',
  })

  if (error) redirect('/money/post?error=1')

  try {
    await resend.emails.send({
      from: 'info@accountingbody.com',
      to: 'info@accountingbody.com',
      subject: `[HagerLand] New money service submission: ${title}`,
      html: `<h2>New money service submission</h2><p><strong>Title:</strong> ${title}</p><p><strong>Type:</strong> ${service_type}</p><p><strong>Contact:</strong> ${contact_name} — ${contact_email}</p>`,
    })
    await resend.emails.send({
      from: 'info@accountingbody.com',
      to: contact_email,
      subject: 'Your submission has been received — HagerLand',
      html: `<h2>Thank you, ${contact_name || 'there'}</h2><p>We have received your submission for <strong>${title}</strong>. It will be reviewed by our team within 48 hours.</p><p>— The HagerLand team</p>`,
    })
  } catch { /* email errors are non-fatal */ }

  redirect('/money?success=1')
}