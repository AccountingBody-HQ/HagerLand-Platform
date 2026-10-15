import { getAdminSupabase } from '@/lib/supabase/admin'
import { STATUS_LABEL, VALUATION_STATUSES } from '@/lib/agency'
import { formatAppointment, formatDate } from '@/lib/format'
import { AgencyList, RefLink } from '@/components/admin/AgencyList'

export const metadata = { title: 'Valuations' }

export default async function ValuationsPage(props: { searchParams: Promise<{ status?: string }> }) {
  const sp = await props.searchParams
  const status = VALUATION_STATUSES.find((s) => s === sp.status)
  let q = getAdminSupabase().from('agency_valuations').select('id, reference, purpose, status, outcome, appointment_at, assigned_agent, created_at, contact:agency_contacts(name)').order('created_at', { ascending: false }).limit(300)
  if (status) q = q.eq('status', status)
  const { data } = await q
  return (
    <AgencyList
      title="Valuations"
      description="Book the visit, record the range and report, then the outcome."
      base="/roodber8/agency/valuations"
      statuses={VALUATION_STATUSES}
      status={status}
      rows={data ?? []}
      empty="No valuations yet. They arrive from “Book a valuation”."
      columns={[
        { key: 'ref', label: 'Reference', render: (r) => <RefLink href={`/roodber8/agency/valuations/${r.id}`}>{r.reference}</RefLink> },
        { key: 'who', label: 'Owner', render: (r) => (Array.isArray(r.contact) ? r.contact[0]?.name : r.contact?.name) ?? '' },
        { key: 'for', label: 'For', render: (r) => (r.purpose === 'sale' ? 'Sale' : 'Letting') },
        { key: 'status', label: 'Status', render: (r) => STATUS_LABEL[r.status] },
        { key: 'when', label: 'Appointment', render: (r) => (r.appointment_at ? formatAppointment(r.appointment_at) : '') },
        { key: 'agent', label: 'Agent', render: (r) => r.assigned_agent ?? '' },
        { key: 'outcome', label: 'Outcome', render: (r) => STATUS_LABEL[r.outcome] },
        { key: 'added', label: 'Requested', render: (r) => formatDate(r.created_at) },
      ]}
    />
  )
}
