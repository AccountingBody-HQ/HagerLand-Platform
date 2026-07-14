import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { SubmissionBanner } from '@/components/SubmissionBanner'

export const metadata = {
  title: 'Jobs in the Ethiopian community | HagerLand',
  description: 'Find work or hire from within the Ethiopian diaspora. Jobs posted by Ethiopian-owned businesses.',
}

const PAGE_SIZE = 20

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { type?: string; page?: string }
}) {
  const jobType = searchParams.type
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('jobs')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (jobType) query = query.eq('job_type', jobType)

  const { data: jobs, count, error } = await query

  const { data: typeRows } = await supabase
    .from('jobs')
    .select('job_type')
    .eq('status', 'active')
    .not('job_type', 'is', null)

  const jobTypes = Array.from(
    new Set((typeRows ?? []).map((r) => r.job_type).filter(Boolean) as string[])
  ).sort()

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

      {/* HERO BAND */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)'}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2.5 text-white/50 text-[11px] font-bold tracking-[0.18em] uppercase mb-4">
                ሃገር
                <span className="w-1 h-1 rounded-full bg-white/30" />
                Jobs
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-[1.05] tracking-tight mb-3">
                Jobs in the Ethiopian community
              </h1>
              <p className="text-white/65 text-base sm:text-lg leading-relaxed">
                Find work, or hire from within your community.
                {count != null && count > 0 && (
                  <span className="ml-2 text-white/40">{count.toLocaleString()} listed.</span>
                )}
              </p>
            </div>
            <Link href="/jobs/post"
              className="shrink-0 bg-white text-green font-bold rounded-full px-6 py-3 text-sm hover:bg-green-soft transition-colors">
              Post a job →
            </Link>
          </div>
        </div>
      </section>

      {/* LISTINGS */}
      <section className="bg-section flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pb-16">
          <SubmissionBanner />

          {/* FILTERS */}
          {jobTypes.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              <Link href="/jobs"
                className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
                  !jobType ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'
                }`}>
                All types
              </Link>
              {jobTypes.map((t) => (
                <Link key={t} href={`/jobs?type=${encodeURIComponent(t)}`}
                  className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
                    jobType === t ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'
                  }`}>
                  {t}
                </Link>
              ))}
            </div>
          )}
          {error && <p className="text-sm text-red-600 mb-4">Error loading jobs.</p>}

          {/* CARDS */}
          <div className="grid gap-4">
            {jobs && jobs.length > 0 ? (
              jobs.map((job) => (
                <Link key={job.id} href={`/jobs/${job.id}`}
                  className="group bg-white border border-border rounded-2xl p-6 hover:border-green/50 hover:shadow-lg transition-all duration-200 block">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="font-bold text-ink text-lg group-hover:text-green transition-colors">{job.title}</h3>
                    {job.job_type && (
                      <span className="bg-green-soft text-green text-xs font-semibold px-2.5 py-1 rounded-full shrink-0">{job.job_type}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted mb-3">
                    {[job.company_name, job.location].filter(Boolean).join(' · ')}
                  </p>
                  {job.description && <p className="text-sm text-ink/80 mb-3 line-clamp-2">{job.description}</p>}
                  {job.salary_range && <p className="text-sm font-semibold text-green">{job.salary_range}</p>}
                </Link>
              ))
            ) : (
              <p className="text-muted text-center py-16">No jobs posted yet.</p>
            )}
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              {page > 1 && (
                <Link href={pageUrl(page - 1)} className="bg-white border border-border rounded-full px-5 py-2 text-sm hover:border-ink transition-colors">Previous</Link>
              )}
              <span className="text-sm text-muted">Page {page} of {totalPages}</span>
              {page < totalPages && (
                <Link href={pageUrl(page + 1)} className="bg-white border border-border rounded-full px-5 py-2 text-sm hover:border-ink transition-colors">Next</Link>
              )}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}