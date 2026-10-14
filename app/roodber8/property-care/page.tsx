import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { countryName } from '@/lib/countries'
import { CARE_SERVICE_LABEL, CARE_STATUSES, CARE_STATUS_LABEL } from '@/lib/property-care'
import { brand } from '@/lib/brand'
import { AdminHeader, DataTable, FilterBar, FilterField, StatusBadge, filterInput } from '@/components/admin/AdminUi'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'Property Care pipeline' }

/** HagerLand Property Care consultation pipeline (spec 24.6, 24.12). */
export default async function CarePipelinePage({ searchParams }: { searchParams: { status?: string } }) {
  requireAdminPage()
  const status = (CARE_STATUSES as readonly string[]).includes(searchParams.status ?? '') ? searchParams.status : undefined
  const db = getAdminSupabase()
  let q = db.from('property_care_requests').select('id, reference, created_at, name, country_code, city, property_type, services, status').order('created_at', { ascending: false }).limit(500)
  if (status) q = q.eq('status', status)
  const [{ data }, { data: all }] = await Promise.all([q, db.from('property_care_requests').select('status').limit(10000)])
  const counts = new Map<string, number>()
  for (const r of all ?? []) counts.set(r.status, (counts.get(r.status) ?? 0) + 1)
  return (
    <div>
      <AdminHeader
        title="Property Care pipeline"
        description={`Consultation requests for ${brand.divisions.propertyCare}. Move each lead through the stages; when one becomes a client, create its managed-property record.`}
        actions={
          <>
            <ButtonLink href="/roodber8/managed-properties" variant="secondary" size="sm">
              Managed properties
            </ButtonLink>
            <ButtonLink href="/roodber8/export/property-care" variant="secondary" size="sm">
              Export CSV
            </ButtonLink>
          </>
        }
      />
      <ul className="mb-4 flex flex-wrap gap-2 text-small">
        {CARE_STATUSES.map((s) => (
          <li key={s}>
            <Link href={`/roodber8/property-care?status=${s}`} aria-current={status === s ? 'page' : undefined} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-white px-3 font-semibold hover:bg-stone-100 aria-[current=page]:bg-ink aria-[current=page]:text-white">
              {CARE_STATUS_LABEL[s]} <span className="tabular-nums">{counts.get(s) ?? 0}</span>
            </Link>
          </li>
        ))}
      </ul>
      <FilterBar action="/roodber8/property-care">
        <FilterField label="Stage">
          <select name="status" defaultValue={status ?? ''} className={filterInput}>
            <option value="">All</option>
            {CARE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CARE_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>
      <DataTable
        label="Property Care requests"
        rows={data ?? []}
        rowKey={(r) => r.id}
        empty="No consultation requests yet."
        columns={[
          { key: 'ref', label: 'Reference', render: (r) => <Link href={`/roodber8/property-care/${r.id}`} className="font-mono text-caption font-semibold text-green hover:underline">{r.reference}</Link> },
          { key: 'date', label: 'Received', render: (r) => formatDate(r.created_at) },
          { key: 'who', label: 'Owner', render: (r) => r.name },
          { key: 'where', label: 'Lives in', render: (r) => [r.city, countryName(r.country_code)].filter(Boolean).join(', ') },
          { key: 'type', label: 'Property', render: (r) => r.property_type.replace('_', ' ') },
          { key: 'svc', label: 'Services', render: (r) => r.services.map((s) => CARE_SERVICE_LABEL[s] ?? s).join(', ') },
          { key: 'status', label: 'Stage', render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
    </div>
  )
}
