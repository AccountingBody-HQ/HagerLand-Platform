import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { SectionHeader } from '@/components/SectionHeader'
import { SubmissionBanner } from '@/components/SubmissionBanner'

export const metadata = {
  title: 'Jobs in the Ethiopian community',
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
      <SectionHeader
        title="Jobs in the Ethiopian community"
        description="Find work, or hire from within your community."
        actions={[{ href: '/jobs/post', label: 'Post a job' }]}
      />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 flex-1 w-full">
        <SubmissionBanner />
        {jobTypes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <Link
              href="/jobs"
              className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
                !jobType ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'
              }`}
            >
              All types
            </Link>
            {jobTypes.map((t) => (
              <Link
                key={t}
                href={`/jobs?type=${encodeURIComponent(t)}`}
                className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
                  jobType === t ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'
                }`}
              >
                {t}
              </Link>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-red-600 text-center mb-4">Error loading jobs.</p>}
        <div className="grid gap-4">
          {jobs && jobs.length > 0 ? (
            jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="block border border-border bg-white rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="font-bold text-ink text-lg">{job.title}</h3>
                  {job.job_type && (
                    <span className="bg-green-soft text-green text-xs font-semibold px-2.5 py-1 rounded-full shrink-0">{job.job_type}</span>
                  )}
                </div>
                <p className="text-sm text-muted mb-3">
                  {[job.company_name, job.location].filter(Boolean).join(' · ')}
                </p>
                {job.description && <p className="text-sm text-ink/80 mb-3 line-clamp-2">{job.description}</p>}
                {job.salary_range && <p className="text-sm text-muted">{job.salary_range}</p>}
              </Link>
            ))
          ) : (
            <p className="text-muted text-center py-12">No jobs posted yet.</p>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            {page > 1 && (
              <Link href={pageUrl(page - 1)} className="border border-border rounded-full px-5 py-2 text-sm hover:bg-section transition-colors">Previous</Link>
            )}
            <span className="text-sm text-muted">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <Link href={pageUrl(page + 1)} className="border border-border rounded-full px-5 py-2 text-sm hover:bg-section transition-colors">Next</Link>
            )}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}
