import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { jobsInsights } from '@/lib/jobs-insights-data'
import { PERIOD_CHOICES, periodDays, periodSince } from '@/lib/jobs-insights'
import { AdminHeader } from '@/components/admin/AdminUi'
import { JobsInsightsPanels } from '@/components/admin/JobsInsightsPanels'

export const metadata = { title: 'Demand: jobs' }

/** Jobs Phase 6: Jobs figures for the Owner and Operations. Counts only: no names, contact details or money. */
export default async function JobsDemandPage(props: { searchParams: Promise<{ days?: string }> }) {
  await requireAdminPage()
  const sp = await props.searchParams
  const days = periodDays(sp.days)
  const d = await jobsInsights(periodSince(days), null)
  return (
    <div className="space-y-5">
      <AdminHeader title="Demand: jobs" description="How jobs move from posting to closing, where applications come from, what nobody is applying for yet, reports, call-backs and the recruitment desk. Counts only: no names or contact details, and no money." />
      <nav aria-label="Demand" className="flex flex-wrap gap-2 text-small">
        <Link href="/roodber8/demand" prefetch={false} className="inline-flex min-h-10 items-center rounded-full bg-stone-100 px-3 font-semibold text-ink">
          All demand
        </Link>
        <Link href="/roodber8/demand/supplies" prefetch={false} className="inline-flex min-h-10 items-center rounded-full bg-stone-100 px-3 font-semibold text-ink">
          Supplies
        </Link>
        <span aria-current="page" className="inline-flex min-h-10 items-center rounded-full bg-ink px-3 font-semibold text-white">
          Jobs
        </span>
      </nav>
      <form action="/roodber8/demand/jobs" method="get" className="flex flex-wrap items-end gap-2">
        {PERIOD_CHOICES.map((p) => (
          <Link key={p} href={`/roodber8/demand/jobs?days=${p}`} prefetch={false} aria-current={p === days ? 'page' : undefined} className={`inline-flex min-h-10 items-center rounded-full px-3 text-small font-semibold ${p === days ? 'bg-ink text-white' : 'bg-stone-100 text-ink'}`}>
            Last {p} days
          </Link>
        ))}
        <label className="flex flex-col text-caption font-semibold text-muted">
          Custom (days)
          <input name="days" type="number" min={1} max={1825} defaultValue={PERIOD_CHOICES.some((p) => p === days) ? '' : days} className="h-10 w-24 rounded-sm border border-border-strong px-2 text-small text-ink" />
        </label>
        <button type="submit" className="h-10 rounded-md bg-ink px-4 text-small font-semibold text-white">
          Show
        </button>
      </form>
      <JobsInsightsPanels d={d} csv={(table) => `/roodber8/demand/jobs/export?days=${days}&table=${table}`} />
    </div>
  )
}
