import Link from 'next/link'
import { Eye, House, Inbox, Plus } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { ListingActions } from '@/components/account/ListingActions'
import { ButtonLink } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Layout'
import { MediaImage } from '@/components/media/MediaImage'
import { LISTING_STATUS_LABELS } from '@/lib/labels'
import { formatETB } from '@/lib/format'
import { canRenew } from '@/lib/listing-rules'
import { LoadFailed } from '@/components/account/LoadFailed'
import { log } from '@/lib/log'

export const metadata = { title: 'My listings' }

function daysLeft(expires: string | null): number | null {
  if (!expires) return null
  return Math.ceil((new Date(expires).getTime() - Date.now()) / 86_400_000)
}

export default async function MyListingsPage() {
  await requireUser('/account/listings')
  const supabase = getServerSupabase()
  const { data: rows, error } = await supabase
    .from('properties')
    .select('id, slug, title, status, purpose, price_etb, price_on_request, expires_at, views_count, enquiries_count, updated_at, pending_changes, rejection_reason')
    .neq('status', 'removed')
    .order('updated_at', { ascending: false })
  if (error) log.error('account', 'listings failed to load', error)
  const listings = rows ?? []
  const ids = listings.map((l) => l.id)
  const { data: covers } = ids.length
    ? await supabase.from('media').select('entity_id, storage_path, is_cover, sort').eq('entity_type', 'property').eq('kind', 'image').in('entity_id', ids).order('is_cover', { ascending: false }).order('sort')
    : { data: [] }
  const coverOf = (id: string) => covers?.find((c) => c.entity_id === id)?.storage_path ?? null

  return (
    <div>
      <AccountPageHeader
        title="My listings"
        description="Edit, pause, renew or archive your properties."
        action={
          <ButtonLink href="/account/listings/new">
            <Plus /> List a property
          </ButtonLink>
        }
      />
      {error ? (
        <LoadFailed what="your listings" />
      ) : listings.length === 0 ? (
        <EmptyState icon={<House />} title="You haven't listed a property yet" description="List a home, plot or commercial space. We review it and send enquiries straight to you." actions={<ButtonLink href="/account/listings/new">List your first property</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {listings.map((l) => {
            const status = LISTING_STATUS_LABELS[l.status]
            const left = l.status === 'published' ? daysLeft(l.expires_at) : null
            const renewable = canRenew(l, Date.now())
            const cover = coverOf(l.id)
            return (
              <li key={l.id} className="flex flex-col gap-4 rounded-lg border border-border bg-white p-4 shadow-sm sm:flex-row">
                <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-md bg-stone-100 sm:w-40">{cover && <MediaImage path={cover} alt="" fill sizes="160px" className="object-cover" />}</div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={status.tone}>{status.label}</Badge>
                    {l.pending_changes && <Badge tone="info">Changes in review</Badge>}
                    {left !== null && left <= 7 && <Badge tone="warning">Expires in {left} day{left === 1 ? '' : 's'}</Badge>}
                  </div>
                  <p className="font-semibold text-ink">
                    {l.status === 'published' ? (
                      <Link href={`/property/${l.slug}`} className="hover:underline">
                        {l.title}
                      </Link>
                    ) : (
                      l.title
                    )}
                  </p>
                  <p className="text-small text-muted">
                    {l.price_on_request ? 'Price on request' : formatETB(l.price_etb)}
                    {l.purpose === 'rent' && !l.price_on_request ? ' /month' : ''}
                    {left !== null && left > 7 ? ` · Live for ${left} more days` : ''}
                  </p>
                  {l.status === 'rejected' && l.rejection_reason && <p className="text-small text-error">{l.rejection_reason}</p>}
                  <p className="flex gap-4 text-small text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="size-4" aria-hidden /> {l.views_count} views
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Inbox className="size-4" aria-hidden /> {l.enquiries_count} enquiries
                    </span>
                  </p>
                  <ListingActions id={l.id} status={l.status} canRenew={renewable} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
