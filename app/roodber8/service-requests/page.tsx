import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { countryName } from '@/lib/countries'
import { URGENCY_LABEL } from '@/lib/service-requests/labels'
import { isVerticalKey } from '@/lib/verticals'
import { AdminHeader, DataTable, FilterBar, FilterField, SimplePager, StatusBadge, filterInput } from '@/components/admin/AdminUi'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'Service requests' }

const PAGE = 50
const STATUSES = ['submitted', 'triaged', 'matched', 'quoted', 'won', 'lost', 'cancelled']

/** Triage queue (spec 24.5, 24.12): emergencies first, then the newest. */
export default async function ServiceRequestsPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams
  await requireAdminPage()
  const db = getAdminSupabase()
  const status = searchParams.status === 'open' || !searchParams.status ? 'open' : STATUSES.includes(searchParams.status) ? searchParams.status : 'open'
  const vertical = isVerticalKey(searchParams.vertical) ? searchParams.vertical : undefined
  const urgency = ['emergency', 'within_week', 'flexible'].includes(searchParams.urgency ?? '') ? searchParams.urgency : undefined
  const page = Math.max(1, Number(searchParams.page) || 1)
  let q = db.from('service_requests').select('id, reference, title, status, urgency, vertical_key, country_code, location_text, location_id, created_at, name, service_category_id').order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE)
  q = status === 'open' ? q.in('status', ['submitted', 'triaged', 'matched', 'quoted']) : q.eq('status', status)
  if (vertical) q = q.eq('vertical_key', vertical)
  if (urgency) q = q.eq('urgency', urgency)
  const [{ data }, { data: verticals }, { data: cats }] = await Promise.all([q, db.from('verticals').select('key, name').order('sort'), db.from('service_categories').select('id, name')])
  const rows = (data ?? []).slice(0, PAGE).sort((a, b) => Number(b.urgency === 'emergency') - Number(a.urgency === 'emergency'))
  const catName = new Map((cats ?? []).map((c) => [c.id, c.name]))
  const vName = new Map((verticals ?? []).map((v) => [v.key, v.name]))
  const qs = new URLSearchParams(Object.entries({ status, vertical, urgency }).filter((e): e is [string, string] => Boolean(e[1])))
  return (
    <div>
      <AdminHeader
        title="Service requests"
        description="Requests from customers for building work, repairs and other services. Match each one with up to three providers. Emergencies are listed first."
        actions={
          <ButtonLink href={`/roodber8/export/service-requests?${qs.toString()}`} variant="secondary" size="sm">
            Export CSV
          </ButtonLink>
        }
      />
      <FilterBar action="/roodber8/service-requests">
        <FilterField label="Status">
          <select name="status" defaultValue={status} className={filterInput}>
            <option value="open">Open</option>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Vertical">
          <select name="vertical" defaultValue={vertical ?? ''} className={filterInput}>
            <option value="">All</option>
            {(verticals ?? []).map((v) => (
              <option key={v.key} value={v.key}>
                {v.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="How soon">
          <select name="urgency" defaultValue={urgency ?? ''} className={filterInput}>
            <option value="">All</option>
            {Object.entries(URGENCY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>
      <DataTable
        label="Service requests"
        rows={rows}
        rowKey={(r) => r.id}
        empty="No requests match."
        columns={[
          { key: 'ref', label: 'Reference', render: (r) => <Link href={`/roodber8/service-requests/${r.id}`} className="font-mono text-caption font-semibold text-green hover:underline">{r.reference}</Link> },
          { key: 'date', label: 'Received', render: (r) => formatDate(r.created_at) },
          { key: 'urg', label: 'How soon', render: (r) => (r.urgency === 'emergency' ? <Badge tone="danger">Emergency</Badge> : URGENCY_LABEL[r.urgency]) },
          { key: 'what', label: 'Request', render: (r) => (<div><p className="font-semibold">{r.title}</p><p className="text-muted">{[catName.get(r.service_category_id ?? ''), vName.get(r.vertical_key)].filter(Boolean).join(' · ')}</p></div>) },
          { key: 'who', label: 'Customer', render: (r) => r.name },
          { key: 'where', label: 'Country', render: (r) => countryName(r.country_code) },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
      <SimplePager page={page} hasMore={(data ?? []).length > PAGE} hrefFor={(p) => `/roodber8/service-requests?${qs.toString()}&page=${p}`} />
    </div>
  )
}
