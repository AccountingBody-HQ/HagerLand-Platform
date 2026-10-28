import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { demandReport, SOURCE_LABEL, type DemandSource } from '@/lib/admin/demand'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { AdminHeader, DataTable, Panel } from '@/components/admin/AdminUi'
import { BarChart } from '@/components/admin/BarChart'
import { ButtonLink } from '@/components/ui/Button'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Demand' }

const PERIODS = [7, 30, 90, 365] as const
const SOURCES: DemandSource[] = ['interest', 'request', 'unmatched', 'declined', 'search', 'enquiry']

/** Demand intelligence and activation recommendations (spec 26.13). */
export default async function DemandPage(props: { searchParams: Promise<{ days?: string }> }) {
  await requireAdminPage()
  const sp = await props.searchParams
  const days = PERIODS.find((d) => String(d) === sp.days) ?? 30
  const [r, { data: pillars }] = must(await Promise.all([demandReport(new Date(Date.now() - days * 86_400_000)), getAdminSupabase().from('pillars').select('key, name').order('number')]))
  const name = (k: string | null) => (k ? (pillars?.find((p) => p.key === k)?.name ?? k) : 'Not linked to a pillar')
  const month = new Date().toISOString().slice(0, 7)
  return (
    <div className="space-y-5">
      <AdminHeader
        title="Demand"
        description="What people ask for, and where nobody served them: interest registrations, service requests that found no provider or were declined by all, searches with no results, and enquiries. Use the recommendations to decide what to switch on next."
        actions={
          <ButtonLink href={`/roodber8/export/demand?month=${month}`} variant="secondary" size="sm">
            CSV for {month}
          </ButtonLink>
        }
      />
      <nav aria-label="Demand" className="flex flex-wrap gap-2 text-small">
        <span aria-current="page" className="inline-flex min-h-10 items-center rounded-full bg-ink px-3 font-semibold text-white">
          All demand
        </span>
        <Link href="/roodber8/demand/supplies" prefetch={false} className="inline-flex min-h-10 items-center rounded-full bg-stone-100 px-3 font-semibold text-ink">
          Supplies
        </Link>
        <Link href="/roodber8/demand/jobs" prefetch={false} className="inline-flex min-h-10 items-center rounded-full bg-stone-100 px-3 font-semibold text-ink">
          Jobs
        </Link>
      </nav>
      <nav aria-label="Period" className="flex flex-wrap gap-2">
        {PERIODS.map((d) => (
          <Link key={d} href={`/roodber8/demand?days=${d}`} prefetch={false} aria-current={d === days ? 'page' : undefined} className={`inline-flex min-h-10 items-center rounded-full px-3 text-small font-semibold ${d === days ? 'bg-ink text-white' : 'bg-stone-100 text-ink'}`}>
            Last {d} days
          </Link>
        ))}
      </nav>
      <Panel title="By pillar">
        <DataTable
          label="Demand by pillar"
          rows={r.byPillar.filter((p) => p.total > 0)}
          rowKey={(p) => p.pillar ?? 'none'}
          empty="No demand recorded in this period yet."
          columns={[{ key: 'pillar', label: 'Pillar', render: (p) => name(p.pillar) }, ...SOURCES.map((s) => ({ key: s, label: SOURCE_LABEL[s], render: (p: (typeof r.byPillar)[number]) => String(p.counts[s]) })), { key: 'total', label: 'Total', render: (p) => <strong>{p.total}</strong> }]}
        />
      </Panel>
      <Panel title="Trend (requests, interest and enquiries per week)">
        <BarChart data={r.weekly} label="Demand per week" />
      </Panel>
      <Panel title="Activation recommendations">
        <p className="mb-3 text-small text-muted">Ranked by demand against live verified providers or partners in the pillar (unmet demand counts double). Open the pillar to run its stage-gate checklist.</p>
        <DataTable
          label="Activation recommendations"
          rows={r.recommendations}
          rowKey={(x) => `${x.pillar}-${x.category}-${x.place}`}
          empty="No unmet demand yet."
          columns={[
            { key: 'pillar', label: 'Pillar', render: (x) => name(x.pillar) },
            { key: 'cat', label: 'Category', render: (x) => x.category },
            { key: 'place', label: 'Place', render: (x) => x.place },
            { key: 'demand', label: 'Demand', render: (x) => String(x.demand) },
            { key: 'supply', label: 'Live providers', render: (x) => String(x.supply) },
            { key: 'score', label: 'Score', render: (x) => String(x.score) },
            { key: 'go', label: '', render: (x) => <Link href={`/roodber8/pillars#pillar-${x.pillar}`} prefetch={false} className="font-semibold text-green underline">Stage gate</Link> },
          ]}
        />
      </Panel>
      <div className="grid gap-5 lg:grid-cols-3">
        {(
          [
            ['By category', r.byCategory],
            ['By place', r.byPlace],
            ['By country', r.byCountry],
          ] as const
        ).map(([title, rows]) => (
          <Panel key={title} title={title}>
            <DataTable label={title} rows={rows.slice(0, 15)} rowKey={(x) => x.key} empty="Nothing yet." columns={[{ key: 'k', label: title.replace('By ', ''), render: (x) => x.key }, { key: 't', label: 'Demand', render: (x) => String(x.total) }]} />
          </Panel>
        ))}
      </div>
    </div>
  )
}
