import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { Breadcrumb } from '@/components/Breadcrumb'
import { ShareButton } from '@/components/ShareButton'
import { EnquireButton } from '@/components/EnquireButton'

type Props = { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await supabase
    .from('jobs')
    .select('title, company_name, location')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()
  if (!data) return { title: 'Job not found' }
  return {
    title: data.title,
    description: [data.company_name, data.location].filter(Boolean).join(' · '),
  }
}

export default async function JobDetailPage({ params }: Props) {
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
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex-1 w-full">
        <Breadcrumb
          crumbs={[
            { href: '/', label: 'Home' },
            { href: '/jobs', label: 'Jobs' },
            { href: `/jobs/${params.id}`, label: job.title },
          ]}
        />
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">{job.title}</h1>
            <p className="text-muted text-base mt-1">
              {[job.company_name, job.location].filter(Boolean).join(' · ')}
            </p>
          </div>
          <ShareButton title={job.title} />
        </div>
        <div className="flex flex-wrap gap-2 mb-8">
          {job.job_type && (
            <span className="bg-green-soft text-green text-xs font-semibold px-2.5 py-1 rounded-full">{job.job_type}</span>
          )}
          {job.is_verified && (
            <span className="bg-gold-soft text-gold text-xs font-semibold px-2.5 py-1 rounded-full">Verified employer</span>
          )}
        </div>
        {job.description && (
          <p className="text-base leading-relaxed text-ink/80 mb-8">{job.description}</p>
        )}
        <div className="border border-border rounded-xl overflow-hidden mb-8">
          {job.salary_range && (
            <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Salary</span>
              <span className="text-sm font-semibold text-ink">{job.salary_range}</span>
            </div>
          )}
          {job.job_type && (
            <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Job type</span>
              <span className="text-sm text-ink">{job.job_type}</span>
            </div>
          )}
          {job.location && (
            <div className="flex items-center gap-4 px-5 py-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Location</span>
              <span className="text-sm text-ink">{job.location}</span>
            </div>
          )}
        </div>
        {job.contact_email && (
          <div className="bg-section rounded-xl p-6">
            <p className="text-sm font-semibold text-ink mb-1">Apply for this role</p>
            <p className="text-sm text-muted mb-4">Click to reveal the contact email.</p>
            <EnquireButton
              email={job.contact_email}
              label="Apply now"
              subject={`Application via HagerLand — ${job.title}`}
            />
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}
