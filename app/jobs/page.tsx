import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { SubmissionBanner } from '@/components/SubmissionBanner'

export const metadata = {
  title: 'Jobs in the Ethiopian community | HagerLand',
  description: 'Find work or hire from within the Ethiopian diaspora.',
}

const PAGE_SIZE = 20

export default async function JobsPage({ searchParams }: { searchParams: { type?: string; page?: string } }) {
  const jobType = searchParams.type
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase.from('jobs').select('*', { count: 'exact' })
    .eq('status', 'active').order('created_at', { ascending: false }).range(from, to)
  if (jobType) query = query.eq('job_type', jobType)
  const { data: jobs, count, error } = await query

  const { data: typeRows } = await supabase.from('jobs').select('job_type')
    .eq('status', 'active').not('job_type', 'is', null)
  const jobTypes = Array.from(new Set((typeRows ?? []).map((r) => r.job_type).filter(Boolean) as string[])).sort()

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (jobType) params.set('type', jobType)
    params.set('page', String(p))
    return `/jobs?${params.toString()}`
  }

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)'}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2.5 text-white/50 text-[11px] font-bold tracking-[0.18em] uppercase mb-4">ሃገር <span className="w-1 h-1 rounded-full bg-white/30" /> Jobs</p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-[1.05] tracking-tight mb-3">Jobs in the Ethiopian community</h1>
              <p className="text-white/65 text-base sm:text-lg leading-relaxed">Find work, or hire from within your community.{count != null && count > 0 && <span className="ml-2 text-white/40">{count.toLocaleString()} listed.</span>}</p>
            </div>
            <Link href="/jobs/post" className="shrink-0 bg-white text-green font-bold rounded-full px-6 py-3 text-sm hover:bg-green-soft transition-colors">Post a job →</Link>
          </div>
        </div>
      </section>
      <section className="bg-section flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-16">
          <SubmissionBanner />
          {jobTypes.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              <Link href="/jobs" className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${!jobType ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'}`}>All types</Link>
              {jobTypes.map((t) => (<Link key={t} href={`/jobs?type=${encodeURIComponent(t)}`} className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${jobType === t ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'}`}>{t}</Link>))}
            </div>
          )}
          {error && <p className="text-sm text-red-600 mb-4">Error loading jobs.</p>}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs && jobs.length > 0 ? jobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`}
                className="group flex flex-col bg-white border border-border rounded-2xl overflow-hidden hover:border-l-4 hover:border-l-green hover:border-green/30 hover:shadow-md transition-all duration-200">
                <div className="flex items-start gap-4 p-5 pb-4">
                  <div className="w-11 h-11 rounded-xl bg-green-soft flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-green"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-ink text-sm leading-snug truncate group-hover:text-green transition-colors">{job.title}</h3>
                    <p className="text-xs text-muted mt-0.5 truncate">{job.company_name || 'Ethiopian community'}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted group-hover:text-green shrink-0 mt-0.5 transition-colors"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
                <div className="flex items-center gap-2 px-5 pb-4">
                  {job.location && <span className="text-xs font-semibold text-muted bg-section border border-border px-2.5 py-1 rounded-full">{job.location}</span>}
                  {job.job_type && <span className="text-xs font-semibold text-green bg-green-soft px-2.5 py-1 rounded-full">{job.job_type}</span>}
                  {job.is_verified && <span className="inline-flex items-center gap-1 bg-gold-soft text-gold text-xs font-bold px-2.5 py-1 rounded-full ml-auto"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>Verified</span>}
                </div>
                <div className="flex items-center gap-4 px-5 py-3 border-t border-border bg-section mt-auto">
                  {job.salary_range && <span className="flex items-center gap-1.5 text-xs font-semibold text-green"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>{job.salary_range}</span>}
                  <span className="ml-auto text-xs font-semibold text-green">View job →</span>
                </div>
              </Link>
            )) : <p className="text-muted col-span-full text-center py-16">No jobs posted yet.</p>}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              {page > 1 && <Link href={pageUrl(page - 1)} className="bg-white border border-border rounded-full px-5 py-2 text-sm hover:border-ink transition-colors">Previous</Link>}
              <span className="text-sm text-muted">Page {page} of {totalPages}</span>
              {page < totalPages && <Link href={pageUrl(page + 1)} className="bg-white border border-border rounded-full px-5 py-2 text-sm hover:border-ink transition-colors">Next</Link>}
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}