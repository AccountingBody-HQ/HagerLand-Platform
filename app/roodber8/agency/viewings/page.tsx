import { getAdminSupabase } from '@/lib/supabase/admin'
import { STATUS_LABEL, VIEWING_MODE_LABEL, VIEWING_STATUSES } from '@/lib/agency'
import { formatAppointment, formatDate } from '@/lib/format'
import { AgencyList, RefLink } from '@/components/admin/AgencyList'

export const metadata = { title: 'Viewings' }

export default async function ViewingsPage(props: { searchParams: Promise<{ status?: string }> }) {
  const sp = await props.searchParams
  const status = VIEWING_STATUSES.find((s) => s === sp.status)
  let q = getAdminSupabase().from('agency_viewings').select('id, reference, name, mode, status, scheduled_at, assigned_agent, preferred_times, created_at, property:properties(title)').order('created_at', { ascending: false }).limit(300)
  if (status) q = q.eq('status', status)
  const { data } = await q
  return (
    <AgencyList
      title="Viewings"
      description="Confirm a time (the visitor is emailed), send a reminder the day before (automatic) and record feedback."
      base="/roodber8/agency/viewings"
      statuses={VIEWING_STATUSES}
      status={status}
      rows={data ?? []}
      empty="No viewings yet. They arrive from “Book a viewing” on listings HagerLand markets."
      columns={[
        { key: 'ref', label: 'Reference', render: (r) => <RefLink href={`/roodber8/agency/viewings/${r.id}`}>{r.reference}</RefLink> },
        { key: 'prop', label: 'Property', render: (r) => (Array.isArray(r.property) ? r.property[0]?.title : r.property?.title) ?? '' },
        { key: 'who', label: 'Visitor', render: (r) => r.name },
        { key: 'how', label: 'How', render: (r) => VIEWING_MODE_LABEL[r.mode as 'video'] },
        { key: 'status', label: 'Status', render: (r) => STATUS_LABEL[r.status] },
        { key: 'when', label: 'When', render: (r) => (r.scheduled_at ? formatAppointment(r.scheduled_at) : `Asked: ${r.preferred_times ?? ''}`) },
        { key: 'agent', label: 'Agent', render: (r) => r.assigned_agent ?? '' },
        { key: 'added', label: 'Requested', render: (r) => formatDate(r.created_at) },
      ]}
    />
  )
}
