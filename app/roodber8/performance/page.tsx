import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { pillarKpis } from '@/lib/admin/performance'
import { agencyKpis } from '@/lib/admin/agency-reports'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatETB } from '@/lib/format'
import { AdminHeader, DataTable, Panel } from '@/components/admin/AdminUi'
import { Stat } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Performance' }

const PERIODS = [30, 90, 365] as const

/** Pillar KPIs (spec 26.14) with the agency KPIs (26.5). */
export default async function PerformancePage(props: { searchParams: Promise<{ days?: string }> }) {
  await requireAdminPage()
  const sp = await props.searchParams
  const days = PERIODS.find((d) => String(d) === sp.days) ?? 90
  const since = new Date(Date.now() - days * 86_400_000)
  const [rows, agency, { data: pillars }] = must(await Promise.all([pillarKpis(since), agencyKpis(since), getAdminSupabase().from('pillars').select('key, name').order('number')]))
  const name = (k: string) => pillars?.find((p) => p.key === k)?.name ?? k
  return (
    <div className="space-y-5">
      <AdminHeader
        title="Performance"
        description="Leads, how fast they are answered, how many are won, revenue from the deals ledger, live listings and live providers, per pillar."
        actions={
          <ButtonLink href={`/roodber8/export/performance?days=${days}`} variant="secondary" size="sm">
            CSV
          </ButtonLink>
        }
      />
      <nav aria-label="Period" className="flex flex-wrap gap-2">
        {PERIODS.map((d) => (
          <Link key={d} href={`/roodber8/performance?days=${d}`} prefetch={false} aria-current={d === days ? 'page' : undefined} className={`inline-flex min-h-10 items-center rounded-full px-3 text-small font-semibold ${d === days ? 'bg-ink text-white' : 'bg-stone-100 text-ink'}`}>
            Last {d} days
          </Link>
        ))}
      </nav>
      <Panel title="By pillar">
        <DataTable
          label="Pillar KPIs"
          rows={rows}
          rowKey={(r) => r.pillar}
          columns={[
            { key: 'p', label: 'Pillar', render: (r) => name(r.pillar) },
            { key: 'leads', label: 'Leads', render: (r) => String(r.leads) },
            { key: 'resp', label: 'Median first response', render: (r) => (r.medianFirstResponseHours === null ? '–' : `${r.medianFirstResponseHours} h`) },
            { key: 'won', label: 'Won', render: (r) => String(r.won) },
            { key: 'conv', label: 'Conversion', render: (r) => (r.conversion === null ? '–' : `${r.conversion}%`) },
            { key: 'rev', label: 'Revenue', render: (r) => formatETB(r.revenueEtb) },
            { key: 'list', label: 'Live listings', render: (r) => (r.activeListings === null ? '–' : String(r.activeListings)) },
            { key: 'prov', label: 'Live providers / partners', render: (r) => String(r.providers) },
          ]}
        />
        <p className="mt-2 text-small text-muted">Recruitment fees are kept in their own record and are not in &quot;Revenue&quot;: see the Jobs report.</p>
      </Panel>
      <Panel title="Estate agency">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Open instructions" value={agency.openInstructions} />
          <Stat label="Valuations" value={agency.valuations} />
          <Stat label="Viewings" value={agency.viewings} />
          <Stat label="Offers (accepted)" value={`${agency.offers} (${agency.offersAccepted})`} />
          <Stat label="Completions" value={agency.completions} />
          <Stat label="Average days on market" value={agency.avgDaysOnMarket ?? '–'} />
          <Stat label="Fee income" value={formatETB(agency.feeIncomeEtb)} />
          <Stat label="Active tenancies" value={agency.tenanciesActive} />
        </div>
      </Panel>
    </div>
  )
}
