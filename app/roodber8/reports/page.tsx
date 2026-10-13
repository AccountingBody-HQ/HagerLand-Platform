import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { enquiriesPerOrg, listingReport, periodFrom, quoteReport, searchMisses, signupSeries } from '@/lib/admin/reports'
import { formatDate, formatETBCents, formatNumber } from '@/lib/format'
import { AdminHeader, DataTable, Panel } from '@/components/admin/AdminUi'
import { BarChart } from '@/components/admin/BarChart'
import { ButtonLink } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

export const metadata = { title: 'Reports' }

function Csv({ kind, period }: { kind: string; period?: string }) {
  return (
    <ButtonLink href={`/roodber8/export/${kind}${period ? `?period=${period}` : ''}`} variant="secondary" size="sm">
      CSV
    </ButtonLink>
  )
}

function CountTable({ rows, label, empty }: { rows: { key: string; count: number }[]; label: string; empty: string }) {
  return (
    <DataTable
      rows={rows}
      rowKey={(r) => r.key}
      empty={empty}
      columns={[
        { key: 'k', label, render: (r) => r.key.replace(/_/g, ' ') },
        { key: 'c', label: 'Count', render: (r) => formatNumber(r.count), className: 'tabular-nums text-right' },
      ]}
    />
  )
}

export default async function ReportsPage({ searchParams }: { searchParams: { period?: string } }) {
  requireAdminPage()
  const period = periodFrom(searchParams.period)
  const [listings, perOrg, quotes, growth, misses] = await Promise.all([listingReport(), enquiriesPerOrg(period.since), quoteReport(period.since), signupSeries(12), searchMisses()])
  const short = (w: string) => formatDate(w).replace(/ \d{4}$/, '')
  return (
    <div className="space-y-5">
      <AdminHeader title="Reports" description="Simple numbers from the live data. Every table can be downloaded as CSV." />
      <nav aria-label="Period" className="flex gap-2">
        {(['30', '90', '365'] as const).map((p) => (
          <Link key={p} href={`/roodber8/reports?period=${p}`} aria-current={period.key === p ? 'page' : undefined} className={cn('rounded-md px-3 py-2 text-small font-semibold', period.key === p ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-stone-100')}>
            Last {p} days
          </Link>
        ))}
      </nav>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Sign-ups per week (12 weeks)" actions={<Csv kind="report-signups" />}>
          <BarChart label="Sign-ups per week" empty="No sign-ups in the last 12 weeks." data={growth.signups.map((s) => ({ label: short(s.week), value: s.count }))} />
          <p className="mt-2 text-small text-muted">
            {formatNumber(growth.total)} new accounts, {formatNumber(growth.business)} of them business accounts.
          </p>
        </Panel>
        <Panel title="Enquiries per week (12 weeks)">
          <BarChart label="Enquiries per week" empty="No enquiries in the last 12 weeks." data={growth.enquiries.map((s) => ({ label: short(s.week), value: s.count }))} />
        </Panel>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Properties by status" actions={<Csv kind="report-listings" />}>
          <CountTable rows={listings.byStatus} label="Status" empty="No properties yet." />
        </Panel>
        <Panel title="Live properties by type">
          <CountTable rows={listings.byType} label="Type" empty="No live properties." />
        </Panel>
        <Panel title="Live properties by location">
          <CountTable rows={listings.byLocation.slice(0, 25)} label="Location" empty="No live properties." />
        </Panel>
      </div>
      <Panel title={`Enquiries per recipient (last ${period.days} days)`} actions={<Csv kind="report-enquiries-per-org" period={period.key} />}>
        <DataTable
          rows={perOrg.slice(0, 50)}
          rowKey={(r) => r.organisation}
          empty="No enquiries in this period."
          columns={[
            { key: 'o', label: 'Recipient', render: (r) => r.organisation },
            { key: 'e', label: 'Enquiries', render: (r) => formatNumber(r.enquiries), className: 'tabular-nums text-right' },
            { key: 'w', label: 'Marked won', render: (r) => formatNumber(r.won), className: 'tabular-nums text-right' },
          ]}
        />
      </Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={`Quotes (last ${period.days} days)`} actions={<Csv kind="report-quotes" period={period.key} />}>
          <dl className="mb-4 grid grid-cols-3 gap-3 text-small">
            <div>
              <dt className="text-muted">Requests</dt>
              <dd className="font-display text-h3 font-bold tabular-nums">{formatNumber(quotes.requests)}</dd>
            </div>
            <div>
              <dt className="text-muted">Value quoted</dt>
              <dd className="font-display text-h3 font-bold tabular-nums">{formatETBCents(quotes.quotedCents)}</dd>
            </div>
            <div>
              <dt className="text-muted">Accepted</dt>
              <dd className="font-display text-h3 font-bold tabular-nums">{formatETBCents(quotes.acceptedCents)}</dd>
            </div>
          </dl>
          <CountTable rows={quotes.byStatus} label="Status" empty="No quote requests in this period." />
        </Panel>
        <Panel title="Quoted value by month">
          <DataTable
            rows={quotes.byMonth}
            rowKey={(r) => r.key}
            empty="No quotes issued in this period."
            columns={[
              { key: 'm', label: 'Month', render: (r) => r.key },
              { key: 'n', label: 'Quotes', render: (r) => r.count, className: 'tabular-nums text-right' },
              { key: 't', label: 'Total', render: (r) => formatETBCents(r.total), className: 'tabular-nums text-right' },
            ]}
          />
        </Panel>
      </div>
      <Panel title="Searches with no results" actions={<Csv kind="search-misses" />}>
        <p className="mb-3 text-small text-muted">What people looked for and did not find. Use it to decide what to add next.</p>
        <DataTable
          rows={misses}
          rowKey={(r) => `${r.vertical}:${r.q_normalised}`}
          empty="No failed searches recorded yet."
          columns={[
            { key: 'q', label: 'Search', render: (r) => r.q_normalised },
            { key: 'v', label: 'Section', render: (r) => r.vertical },
            { key: 'c', label: 'Times', render: (r) => formatNumber(r.count), className: 'tabular-nums text-right' },
            { key: 'l', label: 'Last seen', render: (r) => formatDate(r.last_seen_at) },
          ]}
        />
      </Panel>
    </div>
  )
}
