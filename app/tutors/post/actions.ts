'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'

export async function postTutor(formData: FormData) {
  const name = formData.get('name') as string
  const subject = formData.get('subject') as string
  const description = formData.get('description') as string
  const location = formData.get('location') as string
  const deliveryMode = formData.get('delivery_mode') as string
  const rate = formData.get('rate') as string
  const contactEmail = formData.get('contact_email') as string

  const { error } = await supabaseAdmin.from('tutors').insert({
    name,
    subject,
    description: description || null,
    location: location || null,
    delivery_mode: deliveryMode || null,
    rate: rate || null,
    contact_email: contactEmail || null,
    status: 'active',
  })

  if (error) {
    throw new Error(error.message)
  }

  redirect('/tutors?success=true')
}
