import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const { data: job, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()

  if (error || !job) notFound()

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-2xl sm:text-4xl font-bold text-ink tracking-tight">{job.title}</h1>
          {job.is_verified && (
            <span className="bg-gold-soft text-gold text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">Verified</span>
          )}
        </div>
        <p className="text-muted text-base mb-8">{job.company_name} &middot; {job.location}</p>
        {job.description && <p className="text-base leading-relaxed text-ink/80 mb-8">{job.description}</p>}
        <div className="border-t border-border pt-6 space-y-3">
          {job.job_type && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-xs font-semibold uppercase text-muted w-28">Job type</span>
              <span>{job.job_type}</span>
            </div>
          )}
          {job.salary_range && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-xs font-semibold uppercase text-muted w-28">Salary range</span>
              <span>{job.salary_range}</span>
            </div>
          )}
          {job.contact_email && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-xs font-semibold uppercase text-muted w-28">Contact</span>
              <span>{job.contact_email}</span>
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
