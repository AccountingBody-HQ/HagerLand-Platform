import Link from 'next/link'
import { Briefcase, CalendarClock, MapPin } from 'lucide-react'
import type { JobListItem } from '@/lib/data/jobs'
import { EMPLOYMENT_TYPES, categoryLabel, formatSalary, labelFor } from '@/lib/jobs'
import { formatDateFor, relativeTimeFor } from '@/lib/i18n/dates'
import { fill } from '@/lib/i18n/translate'
import type { Locale } from '@/lib/i18n/config'
import { VerificationBadge } from '@/components/company/VerificationBadge'
import type { Translate } from '@/lib/i18n/translate'

/** One vacancy in the job board (spec 24.9). `hideEmployer` (company pages, Jobs Phase 6) leaves out the employer line, which would repeat the page's own name and badge. */
export function JobCard({ job, t = (s) => s, locale = 'en', href = (h) => h, hideEmployer = false }: { job: JobListItem; t?: Translate; locale?: Locale; href?: (h: string) => string; hideEmployer?: boolean }) {
  const salary = formatSalary(job.salary_min_minor, job.salary_max_minor, job.currency ?? 'ETB', job.salary_period, t)
  return (
    <article className="relative rounded-lg border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-small font-semibold text-green">{t(categoryLabel(job.category))}</p>
      <h3 className="mt-1 font-sans text-[1.0625rem] font-semibold text-ink">
        <Link href={href(`/jobs/${job.slug}`)} className="after:absolute after:inset-0">
          {job.title}
        </Link>
      </h3>
      {!hideEmployer && (
        <p className="mt-1 flex flex-wrap items-center gap-2 text-muted">
          {job.posted_for === 'private_client' ? t('Posted by HagerLand for a private client') : job.employer_name}
          {job.posted_for !== 'private_client' && job.employer_verification === 'verified' && <VerificationBadge level="verified" />}
        </p>
      )}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-small text-muted">
        <li className="inline-flex items-center gap-1.5">
          <MapPin className="size-4" aria-hidden /> {job.location_display}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <Briefcase className="size-4" aria-hidden /> {t(labelFor(EMPLOYMENT_TYPES, job.employment_type))}
        </li>
        {job.closing_date && (
          <li className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-4" aria-hidden /> {fill(t('Closes {date}'), { date: formatDateFor(job.closing_date, locale) })}
          </li>
        )}
      </ul>
      {salary && <p className="mt-3 font-semibold text-ink">{salary}</p>}
      <p className="mt-2 text-caption text-muted">{fill(t('Posted {when}'), { when: relativeTimeFor(job.published_at, locale, t) })}</p>
    </article>
  )
}
