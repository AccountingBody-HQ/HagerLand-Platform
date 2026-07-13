'use server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendInternalNotification, sendSubmitterAcknowledgment } from '@/lib/email'
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

  // Fire both emails. These never throw (see lib/email.ts) so a failed
  // send can never block or fail the actual database submission.
  if (contactEmail) {
    const detailsHtml = `
      <p><strong>Company:</strong> ${companyName}</p>
      <p><strong>Location:</strong> ${location || 'Not specified'}</p>
      <p><strong>Job type:</strong> ${jobType || 'Not specified'}</p>
      <p><strong>Salary range:</strong> ${salaryRange || 'Not specified'}</p>
      <p><strong>Description:</strong> ${description || 'None provided'}</p>
    `
    await sendInternalNotification({
      sectionLabel: 'Job',
      title,
      submitterName: companyName,
      submitterEmail: contactEmail,
      detailsHtml,
    })
    await sendSubmitterAcknowledgment({
      sectionLabel: 'Job',
      title,
      submitterEmail: contactEmail,
    })
  }

  redirect('/jobs?success=true')
}
