'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'

export async function postCommunity(formData: FormData) {
  const name = formData.get('name') as string
  const category = formData.get('category') as string
  const description = formData.get('description') as string
  const location = formData.get('location') as string
  const contactName = formData.get('contact_name') as string
  const contactEmail = formData.get('contact_email') as string

  const { error } = await supabaseAdmin.from('community').insert({
    name,
    category: category || null,
    description: description || null,
    location: location || null,
    contact_name: contactName || null,
    contact_email: contactEmail || null,
    status: 'active',
  })

  if (error) {
    throw new Error(error.message)
  }

  redirect('/community?success=true')
}
