'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'

export async function postEvent(formData: FormData) {
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
    status: 'active',
  })

  if (error) {
    throw new Error(error.message)
  }

  redirect('/events?success=true')
}
