import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { countryName } from '@/lib/countries'
import { AdminHeader, DataTable, StatusBadge } from '@/components/admin/AdminUi'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'Managed properties' }

/** Property Care clients' properties (spec 24.6). The owner portal is Phase 2; these records are staff-only. */
export default async function ManagedPropertiesPage() {
  requireAdminPage()
  const { data } = await getAdminSupabase().from('managed_properties').select('id, reference, title, owner_name, owner_country_code, status, start_date, created_at').order('created_at', { ascending: false }).limit(500)
  return (
    <div>
      <AdminHeader title="Managed properties" description="Properties HagerLand Property Care looks after: inspections with photos, rent statements and the maintenance log. Owners cannot see these yet (the owner portal is planned for Phase 2)." actions={<ButtonLink href="/roodber8/managed-properties/new" size="sm">Add a property</ButtonLink>} />
      <DataTable
        label="Managed properties"
        rows={data ?? []}
        rowKey={(r) => r.id}
        empty="No managed properties yet."
        columns={[
          { key: 'title', label: 'Property', render: (r) => <Link href={`/roodber8/managed-properties/${r.id}`} className="font-semibold text-green hover:underline">{r.title}</Link> },
          { key: 'ref', label: 'Reference', render: (r) => r.reference },
          { key: 'owner', label: 'Owner', render: (r) => [r.owner_name, countryName(r.owner_country_code)].filter(Boolean).join(' · ') },
          { key: 'start', label: 'Since', render: (r) => (r.start_date ? formatDate(r.start_date) : '') },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
    </div>
  )
}
