import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { demandData } from '@/lib/supply/insights-data'
import { unitLabel } from '@/lib/units'
import { AdminHeader, DataTable, Panel } from '@/components/admin/AdminUi'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'Supply demand' }

const PERIODS = [30, 90, 365] as const

/** What customers ask HagerLand Supply for, how far each request gets, and what nobody can supply yet. */
export default async function SupplyDemandPage(props: { searchParams: Promise<{ days?: string; cancelled?: string }> }) {
  await requireAdminPage()
  const sp = await props.searchParams
  const custom = Number(sp.days)
  const days = PERIODS.find((d) => String(d) === sp.days) ?? (Number.isInteger(custom) && custom >= 1 && custom <= 1825 ? custom : 90)
  const includeCancelled = sp.cancelled === '1'
  const d = await demandData(days, includeCancelled)
  const href = (p: { days?: number; cancelled?: boolean }) => `/roodber8/demand/supplies?days=${p.days ?? days}${(p.cancelled ?? includeCancelled) ? '&cancelled=1' : ''}`
  const steps: [string, number][] = [
    ['Requested', d.funnel.requested],
    ['Suppliers asked', d.funnel.asked],
    ['Reply received', d.funnel.replied],
    ['Supplier chosen', d.funnel.chosen],
    ['Ordered', d.funnel.ordered],
    ['Completed', d.funnel.completed],
  ]
  return (
    <div className="space-y-5">
      <AdminHeader title="Demand: supplies" description="What customers ask for in materials quotes, how far each request gets, and what nobody can supply yet. Worked out from quotes, supplier lines, orders and price lists." />
      <nav aria-label="Demand" className="flex flex-wrap gap-2 text-small">
        <Link href="/roodber8/demand" prefetch={false} className="inline-flex min-h-10 items-center rounded-full bg-stone-100 px-3 font-semibold text-ink">
          All demand
        </Link>
        <span aria-current="page" className="inline-flex min-h-10 items-center rounded-full bg-ink px-3 font-semibold text-white">
          Supplies
        </span>
      </nav>
      <form action="/roodber8/demand/supplies" method="get" className="flex flex-wrap items-end gap-2">
        {PERIODS.map((p) => (
          <Link key={p} href={href({ days: p })} prefetch={false} aria-current={p === days ? 'page' : undefined} className={`inline-flex min-h-10 items-center rounded-full px-3 text-small font-semibold ${p === days ? 'bg-ink text-white' : 'bg-stone-100 text-ink'}`}>
            Last {p} days
          </Link>
        ))}
        <label className="flex flex-col text-caption font-semibold text-muted">
          Custom (days)
          <input name="days" type="number" min={1} max={1825} defaultValue={PERIODS.some((p) => p === days) ? '' : days} className="h-10 w-24 rounded-sm border border-border-strong px-2 text-small text-ink" />
        </label>
        {includeCancelled && <input type="hidden" name="cancelled" value="1" />}
        <button type="submit" className="h-10 rounded-md bg-ink px-4 text-small font-semibold text-white">
          Show
        </button>
        <Link href={href({ cancelled: !includeCancelled })} prefetch={false} className="inline-flex min-h-10 items-center px-2 text-small font-semibold text-green underline">
          {includeCancelled ? 'Leave out cancelled quotes' : 'Include cancelled quotes'}
        </Link>
      </form>
      {d.quotes === 0 ? (
        <Panel title="No supply requests in this period">
          <p className="text-small">Once customers send quote lists or materials lists, the most requested items, areas and what nobody can supply will show here.</p>
        </Panel>
      ) : (
        <>
          <Panel title={`From request to delivery (${d.quotes} quote${d.quotes === 1 ? '' : 's'})`}>
            <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {steps.map(([label, n], i) => (
                <li key={label} className="rounded-md bg-stone-50 p-3">
                  <p className="text-caption text-muted">{label}</p>
                  <p className="font-display text-h3 font-bold tabular-nums">{n}</p>
                  {i > 0 && steps[0][1] > 0 && <p className="text-caption text-muted">{Math.round((n / steps[0][1]) * 100)}% of items</p>}
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title={`Nobody can supply yet (${d.unmet.length})`}>
            {d.unmet.length === 0 ? (
              <p className="text-small text-muted">Every requested item has a partner with a current price delivering there.</p>
            ) : (
              <ul className="space-y-2 text-small">
                {d.unmet.map((u) => (
                  <li key={u.group.key} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
                    <span>
                      <strong>{u.group.name}</strong> ({unitLabel(u.group.unit, 2)}, {u.group.requests} request{u.group.requests === 1 ? '' : 's'}): {u.reason}.
                    </span>
                    <ButtonLink href="/roodber8/organisations/new?supplier=1" size="sm" variant="secondary" prefetch={false}>
                      Add a supplier for this
                    </ButtonLink>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Most requested items">
            <DataTable
              label="Most requested items"
              rows={d.groups.slice(0, 50)}
              rowKey={(g) => g.key}
              columns={[
                { key: 'item', label: 'Item', render: (g) => <span className="font-semibold">{g.name}</span> },
                { key: 'cat', label: 'Category', render: (g) => g.categoryName ?? 'Not chosen' },
                { key: 'qty', label: 'Total asked', render: (g) => <span className="tabular-nums">{g.quantity.toLocaleString('en-US')} {unitLabel(g.unit, g.quantity)}</span> },
                { key: 'req', label: 'Quotes', render: (g) => g.requests },
              ]}
            />
          </Panel>
          <Panel title="Requests by area">
            <DataTable label="Requests by area" rows={d.areas} rowKey={(a) => a.area} columns={[{ key: 'area', label: 'Area', render: (a) => a.area }, { key: 'req', label: 'Quotes', render: (a) => a.requests }, { key: 'items', label: 'Items', render: (a) => a.items }]} />
          </Panel>
        </>
      )}
      <Panel title="Other signals: jobs and building projects">
        <div className="grid gap-4 sm:grid-cols-2 text-small">
          <div>
            <p className="font-semibold">Open job posts by kind of work</p>
            {d.signals.openJobs.length ? (
              <ul className="mt-1 space-y-0.5">
                {d.signals.openJobs.map((j) => (
                  <li key={j.category}>
                    {j.category}: {j.count}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No open job posts.</p>
            )}
          </div>
          <div>
            <p className="font-semibold">Building projects asking for materials, by area</p>
            {d.signals.projects.length ? (
              <ul className="mt-1 space-y-0.5">
                {d.signals.projects.map((p) => (
                  <li key={p.area}>
                    {p.area}: {p.count}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No open building projects asking for materials in this period.</p>
            )}
          </div>
        </div>
      </Panel>
    </div>
  )
}
