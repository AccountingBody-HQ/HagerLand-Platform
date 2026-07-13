import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SearchBox } from '@/components/SearchBox'

export default async function CarsPage() {
  const { data: listings, error } = await supabase
    .from('cars')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-bg">
      <SiteNav />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-ink tracking-tight">
          Cars &amp; taxi services
        </h1>
        <p className="text-muted text-base sm:text-lg mt-4">
          Buy or sell a car, find a private hire service, or a trusted garage.
        </p>
        <SearchBox className="mt-6 max-w-lg mx-auto" />
        <div className="flex flex-col sm:flex-row gap-3 mt-6 max-w-xs sm:max-w-none mx-auto justify-center">
          <Link href="/cars/post" className="flex-1 bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-3 transition-colors text-center">
            Post a listing
          </Link>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        {error && (
          <p className="text-sm text-red-600 text-center">Error loading listings: {error.message}</p>
        )}

        <div className="grid gap-4">
          {listings && listings.length > 0 ? (
            listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/cars/${listing.id}`}
                className="block border border-border bg-white rounded-xl p-5 sm:p-6 hover:border-green/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="font-bold text-ink text-lg">{listing.title}</h3>
                  {listing.listing_type && (
                    <span className="bg-green-soft text-green text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                      {listing.listing_type}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted mb-3">{listing.location}</p>
                {listing.description && (
                  <p className="text-sm text-ink/80 mb-3">{listing.description}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                  {listing.price && <span className="font-semibold text-ink">{listing.price}</span>}
                  {listing.contact_email && <span>{listing.contact_email}</span>}
                </div>
              </Link>
            ))
          ) : (
            <p className="text-muted text-center py-12">No listings posted yet.</p>
          )}
        </div>
      </section>
    </main>
  )
}
