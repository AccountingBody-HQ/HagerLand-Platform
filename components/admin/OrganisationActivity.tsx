import Link from 'next/link'
import type { OrganisationActivity } from '@/lib/supply/activity-data'
import type { OrgHiring } from '@/lib/jobs-signals-data'
import { StatusBadge } from './AdminUi'

function Section({ title, empty, rows }: { title: string; empty: string; rows: { key: string; href: string; label: string; status: string }[] }) {
  return (
    <div>
      <p className="font-semibold">{title}</p>
      {rows.length ? (
        <ul className="mt-1 space-y-1">
          {rows.map((r) => (
            <li key={r.key} className="flex flex-wrap items-center gap-2">
              <Link href={r.href} prefetch={false} className="text-green underline">
                {r.label}
              </Link>
              <StatusBadge status={r.status} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">{empty}</p>
      )}
    </div>
  )
}

/**
 * Read-only: the organisation's job posts, building projects, quotes and supplier activity, linked to their admin pages.
 * Jobs Phase 6 (W21): a hiring line first (open jobs, their trades and any open staffing request). No fee figures.
 */
export function ActivityList({ activity, hiring }: { activity: OrganisationActivity; hiring: OrgHiring }) {
  return (
    <div className="space-y-4 text-small">
      <p>
        Hiring: {hiring.openJobs} open jobs ({hiring.trades.length ? hiring.trades.join(', ') : 'none'}). Staffing request with HagerLand:{' '}
        {hiring.staffing ? (
          <Link href={hiring.staffing.href} prefetch={false} className="font-semibold text-green underline">
            open ({hiring.staffing.reference})
          </Link>
        ) : (
          'none'
        )}
        .
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Section title="Job posts" empty="No job posts." rows={activity.jobs.map((j) => ({ key: j.id, href: `/roodber8/jobs/${j.id}`, label: `${j.title} (${j.category})`, status: j.status }))} />
        <Section title="Building projects it was matched to" empty="No building projects." rows={activity.projects.map((p) => ({ key: p.id, href: `/roodber8/projects/${p.id}`, label: `${p.reference}: ${p.title}`, status: p.status }))} />
        <Section title="Materials quotes its people asked for" empty="No quotes from its members." rows={activity.quotes.map((q) => ({ key: q.id, href: `/roodber8/quotes/${q.id}`, label: q.reference, status: q.status }))} />
        <Section title={`As a supplier: ${activity.timesAsked} price request${activity.timesAsked === 1 ? '' : 's'}, orders`} empty="No supply orders." rows={activity.orders.map((o) => ({ key: o.id, href: `/roodber8/supply/orders/${o.id}`, label: o.reference, status: o.status }))} />
      </div>
    </div>
  )
}
