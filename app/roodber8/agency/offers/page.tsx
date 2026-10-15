import { getAdminSupabase } from '@/lib/supabase/admin'
import { OFFER_STATUSES, STATUS_LABEL } from '@/lib/agency'
import { formatDate, formatETB } from '@/lib/format'
import { AgencyList, RefLink } from '@/components/admin/AgencyList'

export const metadata = { title: 'Offers' }

export default async function OffersPage(props: { searchParams: Promise<{ status?: string }> }) {
  const sp = await props.searchParams
  const status = OFFER_STATUSES.find((s) => s === sp.status)
  let q = getAdminSupabase().from('agency_offers').select('id, reference, name, amount_etb, status, created_at, decided_at, property:properties(title)').order('created_at', { ascending: false }).limit(300)
  if (status) q = q.eq('status', status)
  const { data } = await q
  return (
    <AgencyList
      title="Offers"
      description="Offers are expressions of interest. Record each owner decision; accepting one starts the sale progression checklist."
      base="/roodber8/agency/offers"
      statuses={OFFER_STATUSES}
      status={status}
      rows={data ?? []}
      empty="No offers yet."
      columns={[
        { key: 'ref', label: 'Reference', render: (r) => <RefLink href={`/roodber8/agency/offers/${r.id}`}>{r.reference}</RefLink> },
        { key: 'prop', label: 'Property', render: (r) => (Array.isArray(r.property) ? r.property[0]?.title : r.property?.title) ?? '' },
        { key: 'who', label: 'Buyer', render: (r) => r.name },
        { key: 'amount', label: 'Offer', render: (r) => formatETB(r.amount_etb) },
        { key: 'status', label: 'Status', render: (r) => STATUS_LABEL[r.status] },
        { key: 'added', label: 'Received', render: (r) => formatDate(r.created_at) },
        { key: 'decided', label: 'Decided', render: (r) => (r.decided_at ? formatDate(r.decided_at) : '') },
      ]}
    />
  )
}
