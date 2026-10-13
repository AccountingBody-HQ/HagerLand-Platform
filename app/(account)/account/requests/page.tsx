import Link from 'next/link'
import { Handshake } from 'lucide-react'
import { getActiveMembership, requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { formatDate } from '@/lib/format'
import { MATCH_STATUS_LABEL, URGENCY_LABEL } from '@/lib/service-requests/labels'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { EmptyState } from '@/components/ui/Layout'
import { Badge } from '@/components/ui/Badge'

export const metadata = { title: 'Customer requests' }

/** Requests HagerLand matched to the active business (spec 24.5). */
export default async function ProviderRequestsPage() {
  await requireUser('/account/requests')
  const active = await getActiveMembership()
  const { data } = active
    ? await getServerSupabase().from('service_requests_for_provider').select('match_id, match_status, offered_at, reference, title, service_name, location_display, location_text, urgency').eq('org_id', active.org.id).order('offered_at', { ascending: false }).limit(200)
    : { data: [] }
  const rows = data ?? []
  return (
    <div>
      <AccountPageHeader title="Customer requests" description="Jobs HagerLand matched to your business. Accept a request to see the customer's details, then send your quote." />
      {rows.length === 0 ? (
        <EmptyState icon={<Handshake />} title="No requests yet" description="When a customer asks for a service you offer in an area you cover, we may send it to you here and by email. A complete, verified profile helps." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-white">
          {rows.map((r) => (
            <li key={r.match_id}>
              <Link href={`/account/requests/${r.match_id}`} className="flex flex-col gap-1 p-4 hover:bg-stone-50 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  <span className="block font-semibold text-ink">{r.title}</span>
                  <span className="text-small text-muted">
                    {[r.reference, r.service_name, r.location_display ?? r.location_text, r.offered_at ? formatDate(r.offered_at) : null].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="flex gap-2">
                  {r.urgency === 'emergency' && <Badge tone="danger">{URGENCY_LABEL.emergency}</Badge>}
                  <Badge tone={r.match_status === 'offered' ? 'gold' : 'info'}>{MATCH_STATUS_LABEL[r.match_status ?? ''] ?? r.match_status}</Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
