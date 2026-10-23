import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { supplyReport } from '@/lib/supply/insights-data'
import { formatEtbExact, todayInAddis } from '@/lib/supply/shortlist'
import { unitLabel } from '@/lib/units'
import { AdminHeader, DataTable, KeyValue, Panel } from '@/components/admin/AdminUi'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'Supply report' }

function Csv({ month, table }: { month: string; table: string }) {
  return (
    <ButtonLink href={`/roodber8/reports/supply/export?month=${month}&table=${table}`} variant="secondary" size="sm" prefetch={false} className="print:hidden">
      CSV
    </ButtonLink>
  )
}

/** Owner only: one month of HagerLand Supply, ready to print. Money follows the Supply ledger and is cross-checked. */
export default async function SupplyReportPage(props: { searchParams: Promise<{ month?: string }> }) {
  await requireAdminPage()
  if (!(await isOwnerSession())) redirect('/roodber8?denied=1')
  const sp = await props.searchParams
  const month = sp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.month) ? sp.month : todayInAddis().slice(0, 7)
  const r = await supplyReport(month)
  const label = new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return (
    <div className="space-y-5">
      <AdminHeader title={`Supply report: ${label}`} description="Quotes, orders and money for HagerLand Supply in one month. Owner only. Use your browser’s Print to save it as a PDF." />
      <form action="/roodber8/reports/supply" method="get" className="flex flex-wrap items-end gap-2 print:hidden">
        <label className="flex flex-col text-caption font-semibold text-muted">
          Month
          <input type="month" name="month" defaultValue={month} className="h-10 rounded-sm border border-border-strong px-2 text-small text-ink" />
        </label>
        <button type="submit" className="h-10 rounded-md bg-ink px-4 text-small font-semibold text-white">
          Show
        </button>
        <Link href="/roodber8/reports" prefetch={false} className="inline-flex min-h-10 items-center px-2 text-small font-semibold text-green underline">
          All reports
        </Link>
      </form>
      <p className={`rounded-md px-3 py-2 text-small font-semibold ${r.reconciliation.reconciles ? 'bg-green-soft text-ink' : 'bg-error/10 text-error'}`}>
        Reconciles with ledger: {r.reconciliation.reconciles ? 'yes' : 'no'} (HagerLand earned {formatEtbExact(r.reconciliation.earnedCents)}; money in minus out {formatEtbExact(r.reconciliation.ledgerNetCents)})
      </p>
      <Panel title="Quotes and orders" actions={<Csv month={month} table="orders" />}>
        <KeyValue items={[['Quotes received', String(r.quotesReceived)], ['Quotes with suppliers asked or added', String(r.quotesWithSupplierLines)]]} />
        <div className="mt-3">
          <DataTable
            label="Orders by money model"
            rows={r.orders}
            rowKey={(o) => o.model}
            columns={[
              { key: 'model', label: 'Money model', render: (o) => (o.model === 'A' ? 'A (customer pays HagerLand)' : 'B (customer pays the supplier)') },
              { key: 'created', label: 'Created', render: (o) => o.created },
              { key: 'completed', label: 'Completed', render: (o) => o.completed },
              { key: 'cancelled', label: 'Cancelled', render: (o) => o.cancelled },
              { key: 'disputed', label: 'Problems reported', render: (o) => o.disputed },
              { key: 'value', label: 'Order value', render: (o) => <span>{formatEtbExact(o.valueCents)}<span className="block text-caption text-muted">{o.model === 'A' ? 'customer totals' : 'supplier totals'}</span></span> },
            ]}
          />
        </div>
      </Panel>
      <Panel title="Money (from the Supply ledger)" actions={<Csv month={month} table="money" />}>
        <KeyValue
          items={[
            ['HagerLand earned', formatEtbExact(r.earnedCents)],
            ['Customer payments', formatEtbExact(r.ledger.customerPaid)],
            ['Payments to suppliers', formatEtbExact(r.ledger.supplierPaid)],
            ['Refunds', formatEtbExact(r.ledger.refunds)],
            ['Service fees', formatEtbExact(r.ledger.serviceFees)],
            ['Commission recorded as due', formatEtbExact(r.ledger.commissionDue)],
            ['Commission received', formatEtbExact(r.ledger.commissionReceived)],
          ]}
        />
      </Panel>
      <Panel title="Commission still owed, by age" actions={<Csv month={month} table="ageing" />}>
        <DataTable label="Commission owed by age" rows={r.ageing} rowKey={(a) => a.bucket} columns={[{ key: 'b', label: 'Owed for', render: (a) => a.bucket }, { key: 'n', label: 'Orders', render: (a) => a.orders }, { key: 'c', label: 'Amount', render: (a) => formatEtbExact(a.cents) }]} />
        <p className="mt-2 text-caption text-muted">Counted from the date commission was recorded as due, up to the end of the month (or today).</p>
      </Panel>
      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Top items" actions={<Csv month={month} table="items" />}>
          {r.topItems.length ? (
            <ol className="list-decimal space-y-1 pl-5 text-small">
              {r.topItems.map((i) => (
                <li key={`${i.name}|${i.unit}`}>
                  {i.name}: {i.quantity.toLocaleString('en-US')} {unitLabel(i.unit, i.quantity)} ({i.requests} quote{i.requests === 1 ? '' : 's'})
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-small text-muted">No items requested this month.</p>
          )}
        </Panel>
        <Panel title="Top areas" actions={<Csv month={month} table="areas" />}>
          {r.topAreas.length ? (
            <ol className="list-decimal space-y-1 pl-5 text-small">
              {r.topAreas.map((a) => (
                <li key={a.area}>
                  {a.area}: {a.requests}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-small text-muted">No requests this month.</p>
          )}
        </Panel>
        <Panel title="Top partners" actions={<Csv month={month} table="partners" />}>
          {r.topPartners.length ? (
            <ol className="list-decimal space-y-1 pl-5 text-small">
              {r.topPartners.map((p) => (
                <li key={p.name}>
                  {p.name}: {p.orders} order{p.orders === 1 ? '' : 's'}, {formatEtbExact(p.supplierTotalCents)}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-small text-muted">No orders this month.</p>
          )}
        </Panel>
      </div>
    </div>
  )
}
