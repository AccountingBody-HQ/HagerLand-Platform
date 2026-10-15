import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { modeStatus, type PillarMode } from '@/lib/pillars'
import { AdminHeader, DataTable, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { ModeSwitch, PillarEditor } from '@/components/admin/PillarTools'

export const metadata = { title: 'Pillars and modes' }

const MODES: PillarMode[] = ['direct', 'aggregate', 'interest']

/** The ten pillars with their Direct / Aggregate / Interest modes and stage gates (spec 26.2, 26.3). */
export default async function PillarsPage() {
  await requireAdminPage()
  const db = getAdminSupabase()
  const [{ data: pillars }, { data: services }, { data: checks }, { data: settings }] = await Promise.all([
    db.from('pillars').select('*').order('number'),
    db.from('pillar_services').select('*').order('sort'),
    db.from('pillar_gate_checks').select('id, pillar_key, service_key, mode, owner_name, providers_active, providers_required, regulatory_note, regulatory_date, terms_pricing_set, actor, created_at').order('created_at', { ascending: false }).limit(20),
    db.from('site_settings').select('key, value').in('key', ['stage_gate_min_providers', 'regulatory_clearance_note']),
  ])
  const setting = (k: string) => settings?.find((s) => s.key === k)?.value
  const required = Number(setting('stage_gate_min_providers') ?? 3)
  const regNote = typeof setting('regulatory_clearance_note') === 'string' ? String(setting('regulatory_clearance_note')) : ''
  const counts = await Promise.all((pillars ?? []).map(async (p) => [p.key, (await db.rpc('pillar_active_providers', { p_pillar: p.key })).data ?? 0] as const))
  const active = new Map<string, number>(counts.map(([k, n]) => [k, typeof n === 'number' ? n : 0]))
  return (
    <div className="space-y-5">
      <AdminHeader
        title="Pillars and modes"
        description={
          <>
            Each pillar has three modes. <strong>Direct</strong>: HagerLand delivers it (“Provided by HagerLand”). <strong>Aggregate</strong>: vetted providers or partners (“Trusted partners”). <strong>Interest capture</strong>: a register-your-interest form. A pillar shows when any mode is on; with only Interest on it is “Coming soon”; with all off it is hidden. Switching Direct or Aggregate on needs a short checklist; switching off does not. Aggregate needs at least {required} verified providers (change this in{' '}
            <Link href="/roodber8/settings#gates" className="font-semibold text-green hover:underline">
              Settings
            </Link>
            ).
          </>
        }
      />
      <ul className="space-y-4">
        {(pillars ?? []).map((p) => {
          const own = (services ?? []).filter((s) => s.pillar_key === p.key)
          const status = modeStatus({ direct: p.direct_enabled, aggregate: p.aggregate_enabled, interest: p.interest_enabled })
          return (
            <li key={p.key}>
              <Panel title={`${p.number}. ${p.name}`} actions={<StatusBadge status={status} />}>
                <p className="mb-3 text-small text-muted">
                  Hub: <Link href={`/${p.slug}`} className="font-semibold text-green hover:underline">/{p.slug}</Link> · Verified providers or partners: {active.get(p.key) ?? 0}
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {MODES.map((m) => (
                    <ModeSwitch key={m} pillar={p.key} service={null} mode={m} on={p[`${m}_enabled`]} label={p.name} providersActive={active.get(p.key) ?? 0} providersRequired={required} regulatoryNote={regNote} ownerDefault={p.direct_owner ?? ''} />
                  ))}
                </div>
                {own.map((s) => (
                  <div key={s.key} className="mt-4 rounded-md border border-border p-3">
                    <p className="font-semibold text-ink">{s.name}</p>
                    <p className="mb-2 text-caption text-muted">{s.description}</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {MODES.map((m) => (
                        <ModeSwitch key={m} pillar={p.key} service={s.key} mode={m} on={s[`${m}_enabled`]} label={s.name} providersActive={active.get(p.key) ?? 0} providersRequired={required} regulatoryNote={regNote} ownerDefault={p.direct_owner ?? ''} />
                      ))}
                    </div>
                  </div>
                ))}
                <details className="mt-4">
                  <summary className="cursor-pointer text-small font-semibold text-ink">Edit text</summary>
                  <div className="mt-3">
                    <PillarEditor p={p} />
                  </div>
                </details>
              </Panel>
            </li>
          )
        })}
      </ul>
      <Panel title="Recent stage-gate checklists">
        <DataTable
          label="Stage-gate checklists"
          rows={checks ?? []}
          rowKey={(r) => r.id}
          empty="No checklist completed yet. The launch modes were set by migration 0027."
          columns={[
            { key: 'when', label: 'When', render: (r) => formatDate(r.created_at) },
            { key: 'what', label: 'Pillar / service', render: (r) => `${r.pillar_key}${r.service_key ? ` › ${r.service_key}` : ''}` },
            { key: 'mode', label: 'Mode', render: (r) => r.mode },
            { key: 'owner', label: 'Owner', render: (r) => r.owner_name },
            { key: 'prov', label: 'Providers', render: (r) => (r.mode === 'aggregate' ? `${r.providers_active} of ${r.providers_required}` : '–') },
            { key: 'reg', label: 'Regulatory', render: (r) => `${r.regulatory_note} (${formatDate(r.regulatory_date)})` },
            { key: 'terms', label: 'Terms set', render: (r) => (r.terms_pricing_set ? 'Yes' : 'No') },
            { key: 'by', label: 'By', render: (r) => r.actor },
          ]}
        />
      </Panel>
    </div>
  )
}
