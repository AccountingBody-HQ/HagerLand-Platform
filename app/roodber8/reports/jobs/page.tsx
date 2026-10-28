import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { jobsInsights } from '@/lib/jobs-insights-data'
import { jobsFeeReport } from '@/lib/jobs-fee-report-data'
import { monthRange } from '@/lib/jobs-insights'
import type { CurrencyTotals } from '@/lib/jobs-fee-report'
import { formatMoney } from '@/lib/format'
import { AdminHeader, DataTable, Panel } from '@/components/admin/AdminUi'
import { JobsInsightsPanels } from '@/components/admin/JobsInsightsPanels'
import { ButtonLink } from '@/components/ui/Button'
import { PrintButton } from '@/components/admin/PrintButton'

export const metadata = { title: 'Jobs report' }

const money = (minor: number, currency: string) => formatMoney(minor / 100, currency, { decimals: minor % 100 ? 2 : 0 })

function Totals({ rows, label, empty }: { rows: CurrencyTotals[]; label: string; empty: string }) {
  return (
    <DataTable
      label={label}
      rows={rows}
      rowKey={(t) => t.currency}
      empty={empty}
      columns={[
        { key: 'c', label: 'Currency', render: (t) => t.currency },
        { key: 'd', label: 'Fee due', render: (t) => money(t.due, t.currency), className: 'tabular-nums text-right' },
        { key: 'r', label: 'Received', render: (t) => money(t.received, t.currency), className: 'tabular-nums text-right' },
        { key: 'w', label: 'Waived', render: (t) => money(t.waived, t.currency), className: 'tabular-nums text-right' },
        { key: 'o', label: 'Outstanding', render: (t) => <strong className={t.outstanding < 0 ? 'text-error' : undefined}>{money(t.outstanding, t.currency)}</strong>, className: 'tabular-nums text-right' },
      ]}
    />
  )
}

/** Owner only: one month of Jobs, the recruitment desk and recruitment fees, ready to print. */
export default async function JobsReportPage(props: { searchParams: Promise<{ month?: string }> }) {
  await requireAdminPage()
  if (!(await isOwnerSession())) redirect('/roodber8?denied=1')
  const sp = await props.searchParams
  const range = monthRange(sp.month)
  // The fee figures are loaded only here, after the owner check (and the loader checks the owner again).
  const [d, fees] = await Promise.all([jobsInsights(range.startTs, range.nextTs), jobsFeeReport(range)])
  const label = new Date(`${range.month}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const csv = (table: string) => `/roodber8/reports/jobs/export?month=${range.month}&table=${table}`
  const Csv = ({ table }: { table: string }) => (
    <ButtonLink href={csv(table)} variant="secondary" size="sm" prefetch={false} className="hl-no-print">
      CSV
    </ButtonLink>
  )
  const rec = fees.reconciliation
  return (
    <div className="hl-print-page space-y-5">
      <AdminHeader title={`Jobs report: ${label}`} description="Jobs, the recruitment desk and recruitment fees for one month. Owner only. Fees are shown per currency, as recorded in the fee record." />
      <form action="/roodber8/reports/jobs" method="get" className="hl-no-print flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-caption font-semibold text-muted">
          Month
          <input type="month" name="month" defaultValue={range.month} className="h-10 rounded-sm border border-border-strong px-2 text-small text-ink" />
        </label>
        <button type="submit" className="h-10 rounded-md bg-ink px-4 text-small font-semibold text-white">
          Show
        </button>
        <Link href="/roodber8/reports" prefetch={false} className="inline-flex min-h-10 items-center px-2 text-small font-semibold text-green underline">
          All reports
        </Link>
        <PrintButton />
      </form>
      <p className={`rounded-md px-3 py-2 text-small font-semibold ${rec.reconciles ? 'bg-green-soft text-ink' : 'bg-error/10 text-error'}`}>
        Reconciles with fee ledger: {rec.reconciles ? 'yes (all 5 checks passed)' : `no (These fee records need a look: ${rec.references.join(', ')}.)`}
      </p>
      {!rec.reconciles && (
        <Panel title="What needs a look" actions={<Csv table="fee-reconciliation" />}>
          <ul className="list-disc space-y-1 pl-5 text-small">
            {rec.problems.map((p, i) => (
              <li key={`${p.reference}-${p.check}-${i}`}>
                {p.reference}: {p.problem} (check {p.check}).
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <Panel title="Recruitment fees this month" actions={<Csv table="fees-month" />}>
        <Totals rows={fees.month} label="Fees this month" empty="No fee entries this month." />
        <p className="mt-2 text-caption text-muted">Entries dated in this month. A reversal counts in the month it was made.</p>
      </Panel>
      <Panel title={`Recruitment fees to date (as of ${range.asOf})`} actions={<Csv table="fees-to-date" />}>
        <Totals rows={fees.toDate} label="Fees to date" empty="No fee entries yet." />
      </Panel>
      <Panel title="Fees still owed, by age" actions={<Csv table="fee-ageing" />}>
        <DataTable
          label="Fees owed by age"
          rows={fees.ageing}
          rowKey={(a) => `${a.bucket}|${a.currency}`}
          empty="Nothing owed."
          columns={[
            { key: 'b', label: 'Owed for', render: (a) => a.bucket },
            { key: 'c', label: 'Currency', render: (a) => a.currency },
            { key: 'n', label: 'Placements', render: (a) => a.placements, className: 'tabular-nums text-right' },
            { key: 'a', label: 'Amount', render: (a) => money(a.amount, a.currency), className: 'tabular-nums text-right' },
          ]}
        />
        <p className="mt-2 text-caption text-muted">Counted from the date the fee was first recorded as due, up to the end of the month (or today).</p>
      </Panel>
      <Panel title="Fee records" actions={<Csv table="fee-records" />}>
        <DataTable
          label="Fee records"
          rows={fees.records}
          rowKey={(x) => x.reference}
          empty="No fee records yet."
          columns={[
            { key: 'r', label: 'Placement', render: (x) => x.reference },
            { key: 's', label: 'Status', render: (x) => x.status },
            { key: 'd', label: 'Fee due', render: (x) => money(x.due, x.currency), className: 'tabular-nums text-right' },
            { key: 'rc', label: 'Received', render: (x) => money(x.received, x.currency), className: 'tabular-nums text-right' },
            { key: 'w', label: 'Waived', render: (x) => money(x.waived, x.currency), className: 'tabular-nums text-right' },
            { key: 'o', label: 'Outstanding', render: (x) => money(x.outstanding, x.currency), className: 'tabular-nums text-right' },
          ]}
        />
      </Panel>
      <JobsInsightsPanels d={d} csv={(table) => csv(table)} />
    </div>
  )
}
