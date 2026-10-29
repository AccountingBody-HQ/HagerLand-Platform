import Link from 'next/link'
import { Wrench } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { formatDate } from '@/lib/format'
import { customerStatusLabel } from '@/lib/service-requests/form-copy'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { EmptyState } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export const metadata = { title: 'My service requests' }

export default async function MyServiceRequestsPage() {
  const user = await requireUser('/account/service-requests')
  const { data } = await getServerSupabase().from('service_requests').select('id, reference, title, status, urgency, created_at, category:service_categories(slug)').eq('requester_user_id', user.id).order('created_at', { ascending: false }).limit(100)
  const rows = data ?? []
  return (
    <div>
      <AccountPageHeader title="My service requests" description="Requests you sent for building work, repairs and other services, with the quotes you received." action={<ButtonLink href="/request-service">Request a service</ButtonLink>} />
      {rows.length === 0 ? (
        <EmptyState icon={<Wrench />} title="No requests yet" description="Need a plumber, a builder or an architect? Describe the job once and get quotes from up to three providers at a time." actions={<ButtonLink href="/request-service">Request a service</ButtonLink>} />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-white">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/account/service-requests/${r.id}`} className="flex flex-col gap-1 p-4 hover:bg-stone-50 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  <span className="block font-semibold text-ink">{r.title}</span>
                  <span className="text-small text-muted">
                    {r.reference} · {formatDate(r.created_at)}
                  </span>
                </span>
                <span className="flex gap-2">
                  {r.urgency === 'emergency' && <Badge tone="danger">Emergency</Badge>}
                  <Badge tone="info">{customerStatusLabel(r.category?.slug, r.status)}</Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
