import Link from 'next/link'
import { Inbox } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { ChipLink } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/Layout'
import { ENQUIRY_STATUS, TARGET_LABEL } from '@/lib/enquiry-labels'
import { INTENT_LABELS } from '@/lib/enquiries'
import { relativeTime } from '@/lib/format'

export const metadata = { title: 'Enquiries' }

export default async function EnquiriesPage({ searchParams }: { searchParams: { status?: string; box?: string } }) {
  const user = await requireUser('/account/enquiries')
  const box = searchParams.box === 'sent' ? 'sent' : 'received'
  const status = searchParams.status && ENQUIRY_STATUS[searchParams.status] ? searchParams.status : null
  let query = getServerSupabase().from('enquiries').select('id, reference, name, message, status, intent, target_type, created_at, first_viewed_at').order('created_at', { ascending: false }).limit(200)
  query = box === 'sent' ? query.eq('sender_user_id', user.id) : query.neq('sender_user_id', user.id)
  if (status && box === 'received') query = query.eq('status', status as 'new')
  const { data } = await query
  const rows = data ?? []
  const href = (o: { status?: string | null; box?: string }) => {
    const p = new URLSearchParams()
    if (o.box && o.box !== 'received') p.set('box', o.box)
    if (o.status) p.set('status', o.status)
    const s = p.toString()
    return `/account/enquiries${s ? `?${s}` : ''}`
  }
  return (
    <div>
      <AccountPageHeader title="Enquiries" description="Leads from your listings and profile. Reply quickly: fast replies win more business." />
      <div className="mb-4 flex flex-wrap gap-2">
        <ChipLink href={href({ box: 'received' })} active={box === 'received'}>
          Received
        </ChipLink>
        <ChipLink href={href({ box: 'sent' })} active={box === 'sent'}>
          Sent by me
        </ChipLink>
      </div>
      {box === 'received' && (
        <nav aria-label="Filter by status" className="mb-6 flex flex-wrap gap-2">
          <ChipLink href={href({})} active={!status}>
            All
          </ChipLink>
          {Object.entries(ENQUIRY_STATUS).map(([k, v]) => (
            <ChipLink key={k} href={href({ status: k })} active={status === k}>
              {v.label}
            </ChipLink>
          ))}
        </nav>
      )}
      {rows.length === 0 ? (
        <EmptyState icon={<Inbox />} title={box === 'sent' ? "You haven't sent any enquiries while signed in" : 'No enquiries yet'} description={box === 'sent' ? undefined : 'When someone contacts you about a listing or your profile, it appears here and we email you.'} />
      ) : (
        <ul className="space-y-2">
          {rows.map((e) => {
            const s = ENQUIRY_STATUS[e.status]
            const unread = box === 'received' && !e.first_viewed_at
            return (
              <li key={e.id}>
                <Link href={`/account/enquiries/${e.id}`} className="flex flex-col gap-1 rounded-lg border border-border bg-white p-4 shadow-sm hover:border-green sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2">
                      {unread && <span className="size-2 rounded-full bg-green" aria-label="Unread" />}
                      <span className={unread ? 'font-bold' : 'font-semibold'}>{e.name}</span>
                      <span className="text-small text-muted">· {INTENT_LABELS[e.intent] ?? e.intent} · {TARGET_LABEL[e.target_type]}</span>
                    </p>
                    <p className="line-clamp-1 text-small text-muted">{e.message}</p>
                  </div>
                  <div className="flex items-center gap-3 text-small text-muted">
                    <span>{relativeTime(e.created_at)}</span>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
