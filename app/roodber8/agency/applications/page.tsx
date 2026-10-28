import { getAdminSupabase } from '@/lib/supabase/admin'
import { APPLICATION_STATUSES, STATUS_LABEL } from '@/lib/agency'
import { formatDate } from '@/lib/format'
import { AgencyList, RefLink } from '@/components/admin/AgencyList'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Applications to rent' }

export default async function ApplicationsPage(props: { searchParams: Promise<{ status?: string }> }) {
  const sp = await props.searchParams
  const status = APPLICATION_STATUSES.find((s) => s === sp.status)
  let q = getAdminSupabase().from('rental_applications').select('id, reference, name, status, move_in_date, created_at, property:properties(title)').order('created_at', { ascending: false }).limit(300)
  if (status) q = q.eq('status', status)
  const { data } = must(await q)
  return (
    <AgencyList
      title="Applications to rent"
      description="Check references, record the landlord’s decision, then create the tenancy."
      base="/roodber8/agency/applications"
      statuses={APPLICATION_STATUSES}
      status={status}
      rows={data ?? []}
      empty="No applications yet. They arrive from “Apply to rent” on lets HagerLand markets."
      columns={[
        { key: 'ref', label: 'Reference', render: (r) => <RefLink href={`/roodber8/agency/applications/${r.id}`}>{r.reference}</RefLink> },
        { key: 'prop', label: 'Property', render: (r) => (Array.isArray(r.property) ? r.property[0]?.title : r.property?.title) ?? '' },
        { key: 'who', label: 'Applicant', render: (r) => r.name },
        { key: 'status', label: 'Status', render: (r) => STATUS_LABEL[r.status] },
        { key: 'move', label: 'Move in', render: (r) => (r.move_in_date ? formatDate(r.move_in_date) : '') },
        { key: 'added', label: 'Received', render: (r) => formatDate(r.created_at) },
      ]}
    />
  )
}
