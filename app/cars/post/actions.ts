'use server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendInternalNotification, sendSubmitterAcknowledgment } from '@/lib/email'
import { verifyTurnstileToken, isHoneypotFilled } from '@/lib/turnstile'
import { redirect } from 'next/navigation'

export async function postCar(formData: FormData) {
  if (isHoneypotFilled(formData)) {
    redirect('/cars?error=1')
  }

  const turnstileToken = formData.get('cf-turnstile-response') as string | null
  const isHuman = await verifyTurnstileToken(turnstileToken)
  if (!isHuman) {
    redirect('/cars?error=1')
  }

  const title = formData.get('title') as string
  const listingType = formData.get('listing_type') as string
  const description = formData.get('description') as string
  const location = formData.get('location') as string
  const price = formData.get('price') as string
  const contactName = formData.get('contact_name') as string
  const contactEmail = formData.get('contact_email') as string
  const contactPhone = formData.get('contact_phone') as string

  const { error } = await supabaseAdmin.from('cars').insert({
    title,
    listing_type: listingType,
    description: description || null,
    location: location || null,
    price: price || null,
    contact_name: contactName || null,
    contact_email: contactEmail || null,
    contact_phone: contactPhone || null,
    status: 'active',
  })

  if (error) throw new Error(error.message)

  if (contactEmail) {
    const detailsHtml = `
      <p><strong>Type:</strong> ${listingType}</p>
      <p><strong>Location:</strong> ${location || 'Not specified'}</p>
      <p><strong>Price:</strong> ${price || 'Not specified'}</p>
      <p><strong>Description:</strong> ${description || 'None provided'}</p>
    `
    await sendInternalNotification({ sectionLabel: 'Car listing', title, submitterName: contactName, submitterEmail: contactEmail, detailsHtml })
    await sendSubmitterAcknowledgment({ sectionLabel: 'Car listing', title, submitterEmail: contactEmail })
  }

  redirect('/cars?success=true')
}
