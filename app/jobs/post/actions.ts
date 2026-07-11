'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'

export async function postJob(formData: FormData) {
  const title = formData.get('title') as string
  const companyName = formData.get('company_name') as string
  const description = formData.get('description') as string
  const location = formData.get('location') as string
  const jobType = formData.get('job_type') as string
  const salaryRange = formData.get('salary_range') as string
  const contactEmail = formData.get('contact_email') as string

  const { error } = await supabaseAdmin.from('jobs').insert({
    title,
    company_name: companyName,
    description: description || null,
    location: location || null,
    job_type: jobType || null,
    salary_range: salaryRange || null,
    contact_email: contactEmail || null,
    status: 'active',
  })

  if (error) {
    throw new Error(error.message)
  }

  redirect('/jobs?success=true')
}
