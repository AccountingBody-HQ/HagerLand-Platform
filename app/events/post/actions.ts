'use server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendInternalNotification, sendSubmitterAcknowledgment } from '@/lib/email'
import { verifyTurnstileToken, isHoneypotFilled } from '@/lib/turnstile'
import { redirect } from 'next/navigation'

export async function postEvent(formData: FormData) {
  if (isHoneypotFilled(formData)) {
    redirect('/events?error=1')
  }

  const turnstileToken = formData.get('cf-turnstile-response') as string | null
  const isHuman = await verifyTurnstileToken(turnstileToken)
  if (!isHuman) {
    redirect('/events?error=1')
  }

  const title = formData.get('title') as string
  const category = formData.get('category') as string
  const description = formData.get('description') as string
  const location = formData.get('location') as string
  const eventDate = formData.get('event_date') as string
  const eventTime = formData.get('event_time') as string
  const organiserName = formData.get('organiser_name') as string
  const contactEmail = formData.get('contact_email') as string

  const { error } = await supabaseAdmin.from('events').insert({
    title,
    category: category || null,
    description: description || null,
    location: location || null,
    event_date: eventDate || null,
    event_time: eventTime || null,
    organiser_name: organiserName || null,
    contact_email: contactEmail || null,
    status: 'pending', // awaiting admin review — see /roodber8/review
  })

  if (error) throw new Error(error.message)

  if (contactEmail) {
    const detailsHtml = `
      <p><strong>Category:</strong> ${category || 'Not specified'}</p>
      <p><strong>Date:</strong> ${eventDate || 'Not specified'}</p>
      <p><strong>Time:</strong> ${eventTime || 'Not specified'}</p>
      <p><strong>Location:</strong> ${location || 'Not specified'}</p>
      <p><strong>Description:</strong> ${description || 'None provided'}</p>
    `
    await sendInternalNotification({ sectionLabel: 'Event', title, submitterName: organiserName, submitterEmail: contactEmail, detailsHtml })
    await sendSubmitterAcknowledgment({ sectionLabel: 'Event', title, submitterEmail: contactEmail })
  }

  redirect('/events?success=true')
}
