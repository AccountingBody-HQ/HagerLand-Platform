'use server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendInternalNotification, sendSubmitterAcknowledgment } from '@/lib/email'
import { verifyTurnstileToken, isHoneypotFilled } from '@/lib/turnstile'
import { redirect } from 'next/navigation'

export async function postHousing(formData: FormData) {
  if (isHoneypotFilled(formData)) {
    redirect('/housing?error=1')
  }

  const turnstileToken = formData.get('cf-turnstile-response') as string | null
  const isHuman = await verifyTurnstileToken(turnstileToken)
  if (!isHuman) {
    redirect('/housing?error=1')
  }

  const title = formData.get('title') as string
  const listingType = formData.get('listing_type') as string
  const description = formData.get('description') as string
  const location = formData.get('location') as string
  const price = formData.get('price') as string
  const bedrooms = formData.get('bedrooms') as string
  const contactName = formData.get('contact_name') as string
  const contactEmail = formData.get('contact_email') as string
  const contactPhone = formData.get('contact_phone') as string

  const { error } = await supabaseAdmin.from('housing').insert({
    title,
    listing_type: listingType || null,
    description: description || null,
    location: location || null,
    price: price || null,
    bedrooms: bedrooms ? parseInt(bedrooms, 10) : null,
    contact_name: contactName || null,
    contact_email: contactEmail || null,
    contact_phone: contactPhone || null,
    status: 'active',
  })

  if (error) throw new Error(error.message)

  if (contactEmail) {
    const detailsHtml = `
      <p><strong>Type:</strong> ${listingType || 'Not specified'}</p>
      <p><strong>Location:</strong> ${location || 'Not specified'}</p>
      <p><strong>Price:</strong> ${price || 'Not specified'}</p>
      <p><strong>Bedrooms:</strong> ${bedrooms || 'Not specified'}</p>
      <p><strong>Description:</strong> ${description || 'None provided'}</p>
    `
    await sendInternalNotification({ sectionLabel: 'Housing listing', title, submitterName: contactName, submitterEmail: contactEmail, detailsHtml })
    await sendSubmitterAcknowledgment({ sectionLabel: 'Housing listing', title, submitterEmail: contactEmail })
  }

  redirect('/housing?success=true')
}
