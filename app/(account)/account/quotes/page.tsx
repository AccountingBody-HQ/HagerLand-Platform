import { ClipboardList } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { ButtonLink } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Layout'
import { formatDate, formatETBCents } from '@/lib/format'

export const metadata = { title: 'My quotes' }

const STATUS: Record<string, { label: string; tone: 'neutral' | 'info' | 'green' | 'warning' | 'danger' }> = {
  submitted: { label: 'Received', tone: 'neutral' },
  in_review: { label: 'Being prepared', tone: 'info' },
  quoted: { label: 'Quote ready', tone: 'green' },
  accepted: { label: 'Accepted', tone: 'green' },
  declined: { label: 'Declined', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'warning' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}

export default async function MyQuotesPage() {
  const user = await requireUser('/account/quotes')
  const { data } = await getServerSupabase().from('quote_requests').select('id, reference, status, created_at, quoted_total_etb_cents, quoted_at, source').eq('requester_user_id', user.id).order('created_at', { ascending: false })
  const quotes = data ?? []
  return (
    <div>
      <AccountPageHeader title="My quotes" description="Quote requests you sent to HagerLand Supply while signed in." action={<ButtonLink href="/supplies/materials-list">Request a quote</ButtonLink>} />
      {quotes.length === 0 ? (
        <EmptyState icon={<ClipboardList />} title="No quote requests yet" description="Build a quote list from the catalogue, or send us your materials list." actions={<ButtonLink href="/supplies">Browse supplies</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {quotes.map((q) => {
            const s = STATUS[q.status] ?? STATUS.submitted
            return (
              <li key={q.id} className="flex flex-col gap-2 rounded-lg border border-border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold tabular-nums">{q.reference}</p>
                  <p className="text-small text-muted">
                    Sent {formatDate(q.created_at)} · {q.source === 'materials_list' ? 'Materials list' : 'Quote list'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {q.quoted_total_etb_cents !== null && <span className="font-display font-bold tabular-nums">{formatETBCents(q.quoted_total_etb_cents)}</span>}
                  <Badge tone={s.tone}>{s.label}</Badge>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
