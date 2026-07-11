'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'

export async function postHousing(formData: FormData) {
  const title = formData.get('title') as string
  const listingType = formData.get('listing_type') as string
  const description = formData.get('description') as string
  const location = formData.get('location') as string
  const price = formData.get('price') as string
  const bedrooms = formData.get('bedrooms') as string
  const contactName = formData.get('contact_name') as string
  const contactEmail = formData.get('contact_email') as string

  const { error } = await supabaseAdmin.from('housing').insert({
    title,
    listing_type: listingType || null,
    description: description || null,
    location: location || null,
    price: price || null,
    bedrooms: bedrooms ? parseInt(bedrooms) : null,
    contact_name: contactName || null,
    contact_email: contactEmail || null,
    status: 'active',
  })

  if (error) {
    throw new Error(error.message)
  }

  redirect('/housing?success=true')
}
