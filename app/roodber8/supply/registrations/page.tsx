import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { AdminHeader, DataTable, FilterBar, FilterField, StatusBadge, filterInput } from '@/components/admin/AdminUi'
import { ButtonLink } from '@/components/ui/Button'
import { must } from '@/lib/admin/must'
import { REGISTRATION_STATUSES, REGISTRATION_STATUS_LABEL, ROLE_LABEL, type PartnerRole } from '@/lib/supply/partner-rules'

export const metadata = { title: 'Partner registrations' }

/** S6-1: businesses that registered to supply HagerLand (public form or added by staff). Private: never published. */
export default async function PartnerRegistrationsPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams
  await requireAdminPage()
  const status = (REGISTRATION_STATUSES as readonly string[]).includes(searchParams.status ?? '') ? searchParams.status : undefined
  let q = getAdminSupabase().from('partner_registrations').select('id, reference, created_at, business_name, roles, contact_name, phone, status, source').order('created_at', { ascending: false }).limit(500)
  if (status) q = q.eq('status', status)
  const { data } = must(await q)
  return (
    <div>
      <AdminHeader
        title="Partner registrations"
        description="Manufacturers, importers, suppliers and shops who want to supply HagerLand. Their details stay private: they never get a public business page, and customers see HagerLand Supply only."
        actions={
          <ButtonLink href="/roodber8/supply/registrations/new" size="sm">
            Add registration
          </ButtonLink>
        }
      />
      <FilterBar action="/roodber8/supply/registrations">
        <FilterField label="Status">
          <select name="status" defaultValue={status ?? ''} className={filterInput}>
            <option value="">All</option>
            {REGISTRATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {REGISTRATION_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>
      <DataTable
        label="Partner registrations"
        rows={data ?? []}
        rowKey={(r) => r.id}
        empty="No registrations yet."
        columns={[
          { key: 'ref', label: 'Reference', render: (r) => <Link href={`/roodber8/supply/registrations/${r.id}`} className="font-mono text-caption underline">{r.reference}</Link> },
          { key: 'date', label: 'Date', render: (r) => formatDate(r.created_at) },
          { key: 'biz', label: 'Business', render: (r) => (<div><p className="font-semibold">{r.business_name}</p><p>{r.roles.map((x) => ROLE_LABEL[x as PartnerRole] ?? x).join(', ')}</p></div>) },
          { key: 'who', label: 'Contact', render: (r) => (<div><p>{r.contact_name}</p><p>{r.phone}</p></div>) },
          { key: 'src', label: 'From', render: (r) => (r.source === 'staff' ? 'Added by staff' : 'Public form') },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
    </div>
  )
}
