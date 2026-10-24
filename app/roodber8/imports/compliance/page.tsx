import Link from 'next/link'
import { isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { must } from '@/lib/supply/insights-data'
import { deadlineText, FIELD_LABEL, STATE_LABEL, WARN_DAYS, type ComplianceState } from '@/lib/imports/compliance'
import { getCleanupMode, loadImported, MODE_LABEL, type CleanupSummary } from '@/lib/imports/compliance-data'
import { AdminHeader, DataTable, FilterBar, FilterField, Panel, filterInput } from '@/components/admin/AdminUi'
import { CleanupModeControl, DryRunButton, MakePrivateButton } from '@/components/admin/ImportsCompliance'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'Imports compliance' }

const STATES: ComplianceState[] = ['expired', 'within', 'lead', 'confirmed']

/** Owner and Operations: businesses imported from Google, what the 30-day rule would clear, and the clean-up runs. */
export default async function ImportsCompliancePage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await props.searchParams
  await requireAdminPage()
  const owner = await isOwnerSession()
  const [rows, mode, { data: runs }] = await Promise.all([
    loadImported(),
    getCleanupMode(),
    getAdminSupabase().from('import_cleanup_runs').select('id, mode, started_at, counts, run_by').order('started_at', { ascending: false }).limit(10).then(must),
  ])
  const state = STATES.find((s) => s === sp.state)
  const vis = sp.vis === 'public' || sp.vis === 'private' ? sp.vis : undefined
  const shown = rows
    .filter((r) => (!state || r.c.state === state) && (!vis || (vis === 'public') === r.c.isPublic))
    .sort((a, b) => (a.c.daysLeft ?? 999) - (b.c.daysLeft ?? 999) || a.name.localeCompare(b.name))
  const decisions = rows.filter((r) => r.c.plan.action === 'decision')
  const count = (s: ComplianceState, pub: boolean) => rows.filter((r) => r.c.state === s && r.c.isPublic === pub).length
  const csvQuery = new URLSearchParams(Object.entries({ state, vis }).filter((e): e is [string, string] => Boolean(e[1]))).toString()

  return (
    <div className="space-y-5">
      <AdminHeader
        title="Imports compliance"
        description="Businesses imported from Google. Google’s terms allow keeping only the place ID: other Google details must be confirmed with the business or cleared after 30 days. Nothing public changes unless you press a button."
        actions={
          owner && (
            <ButtonLink href={`/roodber8/imports/compliance/export${csvQuery ? `?${csvQuery}` : ''}`} variant="secondary" size="sm" prefetch={false}>
              Download CSV
            </ButtonLink>
          )
        }
      />
      <Panel title="Clean-up" actions={<DryRunButton />}>
        <p className="mb-3 text-small">
          Mode: <strong>{MODE_LABEL[mode]}</strong>. The daily job {mode === 'live' ? 'clears expired Google data of private businesses and lists public ones for your decision.' : 'only reports what it would clear.'}
        </p>
        {owner ? <CleanupModeControl mode={mode} /> : <p className="text-small text-muted">Only the owner can change the mode.</p>}
        {(runs ?? []).length > 0 && (
          <div className="mt-4">
            <DataTable
              label="Clean-up runs"
              rows={runs ?? []}
              rowKey={(r) => r.id}
              columns={[
                { key: 'when', label: 'When', render: (r) => formatDate(r.started_at) },
                { key: 'mode', label: 'Mode', render: (r) => (r.mode === 'live' ? 'Live' : 'Dry run') },
                {
                  key: 'result',
                  label: 'Result',
                  render: (r) => {
                    const c = r.counts as unknown as CleanupSummary
                    return r.mode === 'live'
                      ? `${c.orgsCleared} cleared (${c.fieldsCleared} details), ${c.importLogNamesCleared} names cleared from the import history, ${c.publicDecisions} need your decision`
                      : `${c.orgsToClear} would be cleared (${c.fieldsToClear} details), ${c.importLogNames} names in the import history, ${c.publicDecisions} need your decision`
                  },
                },
                { key: 'by', label: 'Run by', render: (r) => r.run_by },
              ]}
            />
          </div>
        )}
      </Panel>

      <Panel title={`Public — needs your decision (${decisions.length})`}>
        {decisions.length === 0 ? (
          <p className="text-small text-muted">No public or claimed business has Google data past 30 days.</p>
        ) : (
          <ul className="divide-y divide-border text-small">
            {decisions.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                <Link href={`/roodber8/organisations/${r.id}#google-data`} prefetch={false} className="font-semibold text-green underline">
                  {r.name}
                </Link>
                <span className="text-muted">
                  {r.c.isPublic ? 'Public' : 'Claimed by the business'} · would clear: {r.c.plan.fields.map((f) => FIELD_LABEL[f]).join(', ')}
                </span>
                {owner && (
                  <span className="flex flex-wrap gap-x-4">
                    <MakePrivateButton orgId={r.id} />
                    <Link href={`/roodber8/organisations/${r.id}#google-data`} prefetch={false} className="inline-flex min-h-11 items-center font-semibold text-green underline">
                      Confirmed with business
                    </Link>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Imported businesses">
        <table className="mb-3 w-full max-w-xl text-left text-small">
          <thead className="text-caption uppercase text-muted">
            <tr>
              <th scope="col" className="py-1">State</th>
              <th scope="col" className="py-1">Private</th>
              <th scope="col" className="py-1">Public</th>
            </tr>
          </thead>
          <tbody>
            {STATES.map((s) => (
              <tr key={s}>
                <td className="py-1">{STATE_LABEL[s]}</td>
                <td className="py-1 tabular-nums">{count(s, false)}</td>
                <td className="py-1 tabular-nums">{count(s, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <FilterBar action="/roodber8/imports/compliance">
          <FilterField label="State">
            <select name="state" defaultValue={state ?? ''} className={filterInput}>
              <option value="">All</option>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {STATE_LABEL[s]}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Visibility">
            <select name="vis" defaultValue={vis ?? ''} className={filterInput}>
              <option value="">All</option>
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </FilterField>
        </FilterBar>
        <DataTable
          label="Imported businesses"
          rows={shown}
          rowKey={(r) => r.id}
          empty={state || vis ? 'No imported business matches these filters.' : 'No business has been imported from Google.'}
          columns={[
            {
              key: 'name',
              label: 'Business',
              render: (r) => (
                <Link href={`/roodber8/organisations/${r.id}#google-data`} prefetch={false} className="font-semibold hover:underline">
                  {r.name}
                </Link>
              ),
            },
            { key: 'vis', label: 'Visibility', render: (r) => [r.c.isPublic ? 'Public' : 'Private', r.claimed && 'claimed', r.supplyPartner && 'supply partner'].filter(Boolean).join(' · ') },
            { key: 'state', label: 'State', render: (r) => STATE_LABEL[r.c.state] },
            { key: 'left', label: 'Days left', render: (r) => <span className={r.c.daysLeft !== null && r.c.daysLeft <= WARN_DAYS ? 'font-semibold text-error' : ''}>{deadlineText(r.c.daysLeft)}</span> },
            {
              key: 'clear',
              label: 'Would be cleared',
              render: (r) =>
                r.c.plan.action === 'none' ? '' : `${r.c.plan.fields.map((f) => FIELD_LABEL[f]).join(', ')}${r.c.plan.action === 'decision' ? ' (your decision)' : r.c.plan.rename ? ' · renamed to “Unconfirmed lead”' : ''}`,
            },
            { key: 'imported', label: 'Imported', render: (r) => formatDate(r.importedAt) },
          ]}
        />
      </Panel>
    </div>
  )
}
