import Link from 'next/link'
import { Briefcase, CalendarClock, MapPin } from 'lucide-react'
import type { JobListItem } from '@/lib/data/jobs'
import { EMPLOYMENT_TYPES, categoryLabel, formatSalary, labelFor } from '@/lib/jobs'
import { formatDate, relativeTime } from '@/lib/format'
import { VerificationBadge } from '@/components/company/VerificationBadge'

/** One vacancy in the job board (spec 24.9). */
export function JobCard({ job }: { job: JobListItem }) {
  const salary = formatSalary(job.salary_min_minor, job.salary_max_minor, job.currency ?? 'ETB', job.salary_period)
  return (
    <article className="relative rounded-lg border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-small font-semibold text-green">{categoryLabel(job.category)}</p>
      <h3 className="mt-1 font-sans text-[1.0625rem] font-semibold text-ink">
        <Link href={`/jobs/${job.slug}`} className="after:absolute after:inset-0">
          {job.title}
        </Link>
      </h3>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-muted">
        {job.employer_name}
        {job.employer_verification === 'verified' && <VerificationBadge level="verified" />}
      </p>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-small text-muted">
        <li className="inline-flex items-center gap-1.5">
          <MapPin className="size-4" aria-hidden /> {job.location_display}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <Briefcase className="size-4" aria-hidden /> {labelFor(EMPLOYMENT_TYPES, job.employment_type)}
        </li>
        {job.closing_date && (
          <li className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-4" aria-hidden /> Closes {formatDate(job.closing_date)}
          </li>
        )}
      </ul>
      {salary && <p className="mt-3 font-semibold text-ink">{salary}</p>}
      <p className="mt-2 text-caption text-muted">Posted {relativeTime(job.published_at)}</p>
    </article>
  )
}
