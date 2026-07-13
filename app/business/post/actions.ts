'use server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendInternalNotification, sendSubmitterAcknowledgment } from '@/lib/email'
import { verifyTurnstileToken, isHoneypotFilled } from '@/lib/turnstile'
import { redirect } from 'next/navigation'

export async function postBusiness(formData: FormData) {
  if (isHoneypotFilled(formData)) {
    redirect('/business?error=1')
  }

  const turnstileToken = formData.get('cf-turnstile-response') as string | null
  const isHuman = await verifyTurnstileToken(turnstileToken)
  if (!isHuman) {
    redirect('/business?error=1')
  }

  const companyName = formData.get('company_name') as string
  const tradingAddressCity = formData.get('trading_address_city') as string
  const phone = formData.get('phone') as string
  const website = formData.get('website') as string
  const sicDescription = formData.get('sic_description') as string
  const contactEmail = formData.get('contact_email') as string

  const { data: country } = await supabaseAdmin
    .from('countries')
    .select('id')
    .eq('code', 'GB')
    .single()

  const { error } = await supabaseAdmin.from('companies').insert({
    company_name: companyName,
    company_number: `SELFSERVE-${Date.now()}`,
    country_id: country?.id,
    trading_address_city: tradingAddressCity || null,
    phone: phone || null,
    website: website || null,
    sic_description: sicDescription || null,
    contact_email: contactEmail || null,
    status: 'pending',
    tier_classification: 1,
    profile_published: false,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (contactEmail) {
    const detailsHtml = `
      <p><strong>City:</strong> ${tradingAddressCity || 'Not specified'}</p>
      <p><strong>Phone:</strong> ${phone || 'Not specified'}</p>
      <p><strong>Website:</strong> ${website || 'Not specified'}</p>
      <p><strong>Category:</strong> ${sicDescription || 'Not specified'}</p>
    `
    await sendInternalNotification({
      sectionLabel: 'Business',
      title: companyName,
      submitterName: companyName,
      submitterEmail: contactEmail,
      detailsHtml,
    })
    await sendSubmitterAcknowledgment({
      sectionLabel: 'Business',
      title: companyName,
      submitterEmail: contactEmail,
    })
  }

  redirect('/business?success=true')
}
