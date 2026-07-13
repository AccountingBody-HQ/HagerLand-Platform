'use server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendInternalNotification, sendSubmitterAcknowledgment } from '@/lib/email'
import { redirect } from 'next/navigation'

export async function postTutor(formData: FormData) {
  const name = formData.get('name') as string
  const subject = formData.get('subject') as string
  const description = formData.get('description') as string
  const location = formData.get('location') as string
  const deliveryMode = formData.get('delivery_mode') as string
  const rate = formData.get('rate') as string
  const contactEmail = formData.get('contact_email') as string
  const contactPhone = formData.get('contact_phone') as string

  const { error } = await supabaseAdmin.from('tutors').insert({
    name,
    subject,
    description: description || null,
    location: location || null,
    delivery_mode: deliveryMode || null,
    rate: rate || null,
    contact_email: contactEmail || null,
    contact_phone: contactPhone || null,
    status: 'active',
  })

  if (error) throw new Error(error.message)

  if (contactEmail) {
    const detailsHtml = `
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Location:</strong> ${location || 'Not specified'}</p>
      <p><strong>Delivery mode:</strong> ${deliveryMode || 'Not specified'}</p>
      <p><strong>Rate:</strong> ${rate || 'Not specified'}</p>
      <p><strong>Description:</strong> ${description || 'None provided'}</p>
    `
    await sendInternalNotification({ sectionLabel: 'Tutor listing', title: name, submitterName: name, submitterEmail: contactEmail, detailsHtml })
    await sendSubmitterAcknowledgment({ sectionLabel: 'Tutor listing', title: name, submitterEmail: contactEmail })
  }

  redirect('/tutors?success=true')
}
