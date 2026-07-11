'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'

export async function postCar(formData: FormData) {
  const title = formData.get('title') as string
  const listingType = formData.get('listing_type') as string
  const description = formData.get('description') as string
  const location = formData.get('location') as string
  const price = formData.get('price') as string
  const contactName = formData.get('contact_name') as string
  const contactEmail = formData.get('contact_email') as string

  const { error } = await supabaseAdmin.from('cars').insert({
    title,
    listing_type: listingType,
    description: description || null,
    location: location || null,
    price: price || null,
    contact_name: contactName || null,
    contact_email: contactEmail || null,
    status: 'active',
  })

  if (error) {
    throw new Error(error.message)
  }

  redirect('/cars?success=true')
}
