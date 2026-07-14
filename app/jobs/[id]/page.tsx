import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
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

      {/* HERO BAND */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)'}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <Link href="/jobs" className="inline-flex items-center gap-2 text-white/50 hover:text-white/80 text-sm mb-6 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Jobs
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight mb-2">
                {job.title}
              </h1>
              <p className="text-white/60 text-base">
                {[job.company_name, job.location].filter(Boolean).join(' · ')}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {job.job_type && (
                  <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">{job.job_type}</span>
                )}
                {job.is_verified && (
                  <span className="inline-flex items-center gap-1.5 bg-gold-soft text-gold text-xs font-semibold px-3 py-1 rounded-full">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Verified employer
                  </span>
                )}
              </div>
            </div>
            <ShareButton title={job.title} />
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="bg-section flex-1">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 pb-16">

          {job.description && (
            <p className="text-base leading-relaxed text-ink/80 mb-6">{job.description}</p>
          )}

          {/* DETAILS CARD */}
          <div className="bg-white border border-border rounded-2xl overflow-hidden mb-6">
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

          {/* ENQUIRE CARD */}
          {job.contact_email && (
            <div className="bg-white border border-border rounded-2xl p-6">
              <p className="text-sm font-bold text-ink mb-1">Apply for this role</p>
              <p className="text-sm text-muted mb-4">Click to reveal the contact email.</p>
              <EnquireButton email={job.contact_email} label="Apply now" subject={`Application via HagerLand — ${job.title}`} />
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}