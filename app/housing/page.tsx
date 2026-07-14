import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { SectionHeader } from '@/components/SectionHeader'
import { SubmissionBanner } from '@/components/SubmissionBanner'

export const metadata = {
  title: 'Housing in the Ethiopian community',
  description: 'Rooms, rentals, and homes for sale from trusted community members.',
}

const PAGE_SIZE = 20

export default async function HousingPage({
  searchParams,
}: {
  searchParams: { type?: string; page?: string }
}) {
  const listingType = searchParams.type
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('housing')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (listingType) query = query.eq('listing_type', listingType)

  const { data: listings, count, error } = await query

  const { data: typeRows } = await supabase
    .from('housing')
    .select('listing_type')
    .eq('status', 'active')
    .not('listing_type', 'is', null)

  const listingTypes = Array.from(
    new Set((typeRows ?? []).map((r) => r.listing_type).filter(Boolean) as string[])
  ).sort()

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (listingType) params.set('type', listingType)
    params.set('page', String(p))
    return `/housing?${params.toString()}`
  }

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <SectionHeader
        title="Housing in the Ethiopian community"
        description="Rooms, rentals, and homes for sale from a trusted community."
        actions={[{ href: '/housing/post', label: 'Post a listing' }]}
      />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 flex-1 w-full">
        <SubmissionBanner />
        {listingTypes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <Link
              href="/housing"
              className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
                !listingType ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'
              }`}
            >
              All types
            </Link>
            {listingTypes.map((t) => (
              <Link
                key={t}
                href={`/housing?type=${encodeURIComponent(t)}`}
                className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
                  listingType === t ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'
                }`}
              >
                {t}
              </Link>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-red-600 text-center mb-4">Error loading listings.</p>}
        <div className="grid gap-4">
          {listings && listings.length > 0 ? (
            listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/housing/${listing.id}`}
                className="block border border-border bg-white rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="font-bold text-ink text-lg">{listing.title}</h3>
                  {listing.listing_type && (
                    <span className="bg-green-soft text-green text-xs font-semibold px-2.5 py-1 rounded-full shrink-0">{listing.listing_type}</span>
                  )}
                </div>
                <p className="text-sm text-muted mb-3">
                  {[listing.location, listing.bedrooms ? `${listing.bedrooms} bed` : null].filter(Boolean).join(' · ')}
                </p>
                {listing.description && <p className="text-sm text-ink/80 mb-3 line-clamp-2">{listing.description}</p>}
                {listing.price && <p className="text-sm font-semibold text-ink">{listing.price}</p>}
              </Link>
            ))
          ) : (
            <p className="text-muted text-center py-12">No listings posted yet.</p>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            {page > 1 && (
              <Link href={pageUrl(page - 1)} className="border border-border rounded-full px-5 py-2 text-sm hover:bg-section transition-colors">Previous</Link>
            )}
            <span className="text-sm text-muted">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <Link href={pageUrl(page + 1)} className="border border-border rounded-full px-5 py-2 text-sm hover:bg-section transition-colors">Next</Link>
            )}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}
