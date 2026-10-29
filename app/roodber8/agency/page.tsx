import Link from 'next/link'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { agencyKpis } from '@/lib/admin/agency-reports'
import { getAgencyAvailability } from '@/lib/data/pillars'
import { formatDate, formatETB } from '@/lib/format'
import { OPEN_STAGES, STAGE_LABEL } from '@/lib/agency'
import { AdminHeader, Panel } from '@/components/admin/AdminUi'
import { Stat } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { TaskDone } from '@/components/admin/AgencyTools'
import { must } from '@/lib/admin/must'
import { isOwnerSession } from '@/lib/admin/guard'

export const metadata = { title: 'Agency' }

const PERIODS = [30, 90, 365] as const

/** Agency overview: pipeline, reports (spec 26.5, 26.14) and tasks due. */
export default async function AgencyOverview(props: { searchParams: Promise<{ days?: string }> }) {
  const sp = await props.searchParams
  const days = PERIODS.find((d) => String(d) === sp.days) ?? 90
  // Fix F-7 (C8): fee income is the owner's only; for other roles it is never read.
  const owner = await isOwnerSession()
  const [k, agency, { data: tasks }] = must(await Promise.all([
    agencyKpis(new Date(Date.now() - days * 86_400_000), { owner }),
    getAgencyAvailability(),
    getAdminSupabase().from('agency_tasks').select('id, title, due_on, assigned_to, entity_type, entity_id').eq('done', false).order('due_on', { nullsFirst: false }).limit(20),
  ]))
  const typePath: Record<string, string> = { contact: 'contacts', instruction: 'instructions', valuation: 'valuations', viewing: 'viewings', offer: 'offers', application: 'applications', tenancy: 'tenancies' }
  return (
    <div className="space-y-5">
      <AdminHeader
        title="Agency"
        description={
          <>
            HagerLand&rsquo;s own estate agency: sales follow Buy &amp; Sell Direct, lettings follow Rent &amp; Let Direct, and both follow the agency switch in{' '}
            <Link href="/roodber8/pillars" className="font-semibold text-green hover:underline">
              Pillars and modes
            </Link>
            . Now: sales {agency.sales ? 'on' : 'off'}, lettings {agency.lettings ? 'on' : 'off'}.
          </>
        }
        actions={
          <>
            <ButtonLink href={`/roodber8/export/agency-report?days=${days}`} variant="secondary" size="sm">
              Report CSV
            </ButtonLink>
            <ButtonLink href="/roodber8/export/agency-instructions" variant="secondary" size="sm">
              Instructions CSV
            </ButtonLink>
          </>
        }
      />
      <nav aria-label="Period" className="flex gap-2">
        {PERIODS.map((d) => (
          <Link key={d} href={`/roodber8/agency?days=${d}`} prefetch={false} aria-current={d === days ? 'page' : undefined} className={`inline-flex min-h-10 items-center rounded-full px-3 text-small font-semibold ${d === days ? 'bg-ink text-white' : 'bg-stone-100 text-ink'}`}>
            Last {d} days
          </Link>
        ))}
      </nav>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open instructions" value={k.openInstructions} />
        <Stat label="Valuations requested" value={k.valuations} hint={`${k.valuationsBooked} booked or done`} />
        <Stat label="Viewings requested" value={k.viewings} hint={`${k.viewingsUpcoming} confirmed and upcoming`} />
        <Stat label="Offers" value={k.offers} hint={`${k.offersAccepted} accepted`} />
        <Stat label="Applications to rent" value={k.applications} />
        <Stat label="Completions" value={k.completions} />
        <Stat label="Average days on market" value={k.avgDaysOnMarket ?? '–'} hint="Live to completed" />
        {k.feeIncomeEtb !== null && <Stat label="Fee income" value={formatETB(k.feeIncomeEtb)} hint={`Active tenancies: ${k.tenanciesActive}`} />}
      </div>
      <Panel title="Pipeline">
        <ul className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
          {OPEN_STAGES.map((s) => (
            <li key={s}>
              <Link href={`/roodber8/agency/instructions?stage=${s}`} prefetch={false} className="flex flex-col rounded-md border border-border p-3 hover:border-green">
                <span className="text-caption text-muted">{STAGE_LABEL[s]}</span>
                <span className="font-display text-h3 font-bold text-ink">{k.byStage[s] ?? 0}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Open tasks">
        {(tasks ?? []).length === 0 ? (
          <p className="text-small text-muted">No open tasks.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(tasks ?? []).map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-small">
                <Link href={`/roodber8/agency/${typePath[t.entity_type]}/${t.entity_id}`} prefetch={false} className="font-semibold text-ink hover:underline">
                  {t.title}
                </Link>
                <span className="flex items-center gap-3 text-muted">
                  {[t.due_on ? `Due ${formatDate(t.due_on)}` : null, t.assigned_to].filter(Boolean).join(' · ')}
                  <TaskDone id={t.id} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
