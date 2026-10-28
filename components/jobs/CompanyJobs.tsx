import Link from 'next/link'
import type { JobListItem } from '@/lib/data/jobs'
import { fill, type Translate } from '@/lib/i18n/translate'
import { JobCard } from '@/components/jobs/JobCard'

/** Jobs Phase 6: how many open jobs a company page shows before linking to the full list on /jobs. */
export const COMPANY_JOBS_SHOWN = 6

/** The company page's section-bar label for the jobs section. */
export function companyJobsTab(t: Translate = (s) => s): string {
  return t('Jobs')
}

/**
 * Jobs Phase 6: a business's open jobs on its company page (newest approved first, up to 6). The page shows nothing
 * when there are none (no section, no tab). Jobs come from companyJobs(), which never returns jobs HagerLand posts for
 * a private client and nothing for HagerLand's own businesses.
 */
export function CompanyJobs({ company, slug, jobs, total, t = (s) => s }: { company: string; slug: string; jobs: JobListItem[]; total: number; t?: Translate }) {
  if (!total || !jobs.length) return null
  return (
    <section id="jobs" aria-labelledby="jobs-heading" className="scroll-mt-24">
      <h2 id="jobs-heading" className="hl-h3 mb-1">
        {fill(t('Open jobs ({n})'), { n: total })}
      </h2>
      <p className="mb-4 text-small text-muted">{fill(t("Jobs at {company}, approved by HagerLand before they went live. Apply on each job's page."), { company })}</p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {jobs.slice(0, COMPANY_JOBS_SHOWN).map((j) => (
          <li key={j.id}>
            <JobCard job={j} t={t} hideEmployer />
          </li>
        ))}
      </ul>
      {total > COMPANY_JOBS_SHOWN && (
        <Link href={`/jobs?company=${encodeURIComponent(slug)}`} className="mt-4 inline-flex min-h-11 items-center font-semibold text-green hover:underline">
          {fill(t('See all {n} jobs'), { n: total })}
        </Link>
      )}
    </section>
  )
}
