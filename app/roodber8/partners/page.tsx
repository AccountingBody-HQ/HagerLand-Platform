import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { countryName } from '@/lib/countries'
import { PARTNER_TYPE_LABELS, type PartnerType } from '@/lib/content/verticals'
import { AdminHeader, DataTable, FilterBar, FilterField, StatusBadge, filterInput } from '@/components/admin/AdminUi'
import { LeadTool } from '@/components/admin/VerticalTools'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'Partner applications' }

const STATUSES = ['new', 'reviewing', 'approved', 'declined']

export default async function PartnersPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  requireAdminPage()
  const db = getAdminSupabase()
  const status = STATUSES.includes(searchParams.status ?? '') ? searchParams.status : undefined
  let q = db.from('partner_applications').select('*').order('created_at', { ascending: false }).limit(500)
  if (status) q = q.eq('status', status)
  const [{ data }, { data: verticals }] = await Promise.all([q, db.from('verticals').select('key, name')])
  const names = new Map((verticals ?? []).map((v) => [v.key, v.name]))
  return (
    <div>
      <AdminHeader
        title="Partner applications"
        description="Banks, lenders, insurers and brokers who applied to partner. Check their licences before agreeing anything."
        actions={
          <ButtonLink href="/roodber8/export/partners" variant="secondary" size="sm">
            Export CSV
          </ButtonLink>
        }
      />
      <FilterBar action="/roodber8/partners">
        <FilterField label="Status">
          <select name="status" defaultValue={status ?? ''} className={filterInput}>
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </FilterField>
      </FilterBar>
      <DataTable
        label="Partner applications"
        rows={data ?? []}
        rowKey={(r) => r.id}
        empty="No applications yet."
        columns={[
          { key: 'ref', label: 'Reference', render: (r) => <span className="font-mono text-caption">{r.reference}</span> },
          { key: 'date', label: 'Date', render: (r) => formatDate(r.created_at) },
          { key: 'v', label: 'For', render: (r) => names.get(r.vertical_key) ?? r.vertical_key },
          { key: 'org', label: 'Organisation', render: (r) => (<div><p className="font-semibold">{r.organisation_name}</p><p>{PARTNER_TYPE_LABELS[r.partner_type as PartnerType] ?? r.partner_type} · {countryName(r.country_code)}</p>{r.website && <p className="break-all">{r.website}</p>}</div>) },
          { key: 'who', label: 'Contact', render: (r) => (<div><p>{r.contact_name}</p><p>{r.email}</p>{r.phone && <p>{r.phone}</p>}</div>) },
          { key: 'lic', label: 'Licence', render: (r) => r.licence_details ?? '' },
          { key: 'msg', label: 'Message', render: (r) => <span className="line-clamp-3 max-w-xs">{r.message ?? ''}</span> },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'act', label: '', render: (r) => <LeadTool kind="partner" id={r.id} status={r.status} notes={r.admin_notes} statuses={STATUSES} /> },
        ]}
      />
    </div>
  )
}
