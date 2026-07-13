'use server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendInternalNotification, sendSubmitterAcknowledgment } from '@/lib/email'
import { verifyTurnstileToken, isHoneypotFilled } from '@/lib/turnstile'
import { redirect } from 'next/navigation'

export async function postCommunity(formData: FormData) {
  if (isHoneypotFilled(formData)) {
    redirect('/community?error=1')
  }

  const turnstileToken = formData.get('cf-turnstile-response') as string | null
  const isHuman = await verifyTurnstileToken(turnstileToken)
  if (!isHuman) {
    redirect('/community?error=1')
  }

  const name = formData.get('name') as string
  const category = formData.get('category') as string
  const description = formData.get('description') as string
  const location = formData.get('location') as string
  const contactName = formData.get('contact_name') as string
  const contactEmail = formData.get('contact_email') as string
  const contactPhone = formData.get('contact_phone') as string
  const website = formData.get('website') as string

  const { error } = await supabaseAdmin.from('community').insert({
    name,
    category: category || null,
    description: description || null,
    location: location || null,
    contact_name: contactName || null,
    contact_email: contactEmail || null,
    contact_phone: contactPhone || null,
    website: website || null,
    status: 'active',
  })

  if (error) throw new Error(error.message)

  if (contactEmail) {
    const detailsHtml = `
      <p><strong>Category:</strong> ${category || 'Not specified'}</p>
      <p><strong>Location:</strong> ${location || 'Not specified'}</p>
      <p><strong>Website:</strong> ${website || 'Not specified'}</p>
      <p><strong>Description:</strong> ${description || 'None provided'}</p>
    `
    await sendInternalNotification({ sectionLabel: 'Community listing', title: name, submitterName: contactName, submitterEmail: contactEmail, detailsHtml })
    await sendSubmitterAcknowledgment({ sectionLabel: 'Community listing', title: name, submitterEmail: contactEmail })
  }

  redirect('/community?success=true')
}
