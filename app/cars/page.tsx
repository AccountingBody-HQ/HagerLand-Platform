import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { SubmissionBanner } from '@/components/SubmissionBanner'
import { FilterDropdown } from '@/components/FilterDropdown' // eslint-disable-line

export const metadata = {
  title: 'Cars & taxi services | HagerLand',
  description: 'Buy or sell a car, find a private hire service, or a trusted driver.',
}

const PAGE_SIZE = 20

export default async function CarsPage({ searchParams }: { searchParams: { type?: string; page?: string } }) {
  const listingType = searchParams.type
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase.from('cars').select('*', { count: 'exact' })
    .eq('status', 'active').order('created_at', { ascending: false }).range(from, to)
  if (listingType) query = query.eq('listing_type', listingType)
  const { data: listings, count, error } = await query

  const { data: typeRows } = await supabase.from('cars').select('listing_type')
    .eq('status', 'active').not('listing_type', 'is', null)
  const listingTypes = Array.from(new Set((typeRows ?? []).map((r) => r.listing_type).filter(Boolean) as string[])).sort()

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (listingType) params.set('type', listingType)
    params.set('page', String(p))
    return `/cars?${params.toString()}`
  }

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)'}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2.5 text-white/50 text-[11px] font-bold tracking-[0.18em] uppercase mb-8">ሃገር <span className="w-1 h-1 rounded-full bg-white/30" /> Homeland <span className="w-1 h-1 rounded-full bg-white/30" /> Cars & taxi</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">Cars & taxi<br /><span className="text-white/60">services,</span><br /><span className="text-white/60">worldwide.</span></h1>
            <p className="text-white/65 text-lg sm:text-xl max-w-xl mb-10 leading-relaxed">Buy or sell a car, find a private hire service, or a trusted driver.</p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 mb-10">
              {count != null && count > 0 && <div className="flex items-baseline gap-2"><span className="text-2xl font-bold text-white">{count.toLocaleString()}</span><span className="text-white/40 text-sm">listings</span></div>}
              <div className="flex items-baseline gap-2"><span className="text-2xl font-bold text-white">Free</span><span className="text-white/40 text-sm">to post</span></div>
            </div>
            <Link href="/cars/post" className="inline-flex items-center gap-2 bg-white text-green font-bold rounded-full px-7 py-3.5 text-sm hover:bg-green-soft transition-colors">Post a listing — free →</Link>
          </div>
        </div>
      </section>
      <section className="bg-section flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24">
          <SubmissionBanner />
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
            <div className="flex items-center gap-3">
              {listingTypes.length > 0 && <FilterDropdown options={listingTypes} value={listingType} basePath="/cars" paramName="type" allLabel="All types" />}
              {listingType && <Link href="/cars" className="text-xs font-semibold text-green hover:underline">Clear</Link>}
            </div>
            {count != null && <p className="text-sm text-muted ml-auto">{count.toLocaleString()} {count === 1 ? 'listing' : 'listings'}</p>}
          </div>
          {error && <p className="text-sm text-red-600 mb-4">Error loading listings.</p>}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings && listings.length > 0 ? listings.map((listing) => (
              <Link key={listing.id} href={`/cars/${listing.id}`}
                className="group flex flex-col bg-white border border-border rounded-2xl overflow-hidden hover:border-l-4 hover:border-l-green hover:border-green/30 hover:shadow-md transition-all duration-200">
                <div className="flex items-start gap-4 p-5 pb-4">
                  <div className="w-11 h-11 rounded-xl bg-green-soft flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-green"><rect x="1" y="8" width="22" height="10" rx="2"/><path d="M5 8l2-4h10l2 4"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-ink text-sm leading-snug truncate group-hover:text-green transition-colors">{listing.title}</h3>
                    <p className="text-xs text-muted mt-0.5 truncate">{[listing.listing_type, listing.location].filter(Boolean).join(' · ') || 'Community listing'}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted group-hover:text-green shrink-0 mt-0.5 transition-colors"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
                <div className="flex items-center gap-2 px-5 pb-4">
                  {listing.location && <span className="text-xs font-semibold text-muted bg-section border border-border px-2.5 py-1 rounded-full">{listing.location}</span>}
                  {listing.listing_type && <span className="text-xs font-semibold text-green bg-green-soft px-2.5 py-1 rounded-full">{listing.listing_type}</span>}
                  {listing.is_verified && <span className="inline-flex items-center gap-1 bg-gold-soft text-gold text-xs font-bold px-2.5 py-1 rounded-full ml-auto"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>Verified</span>}
                </div>
                <div className="flex items-center gap-4 px-5 py-3 border-t border-border bg-white mt-auto">
                  {listing.location && <span className="flex items-center gap-1.5 text-xs text-muted"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>{listing.location}</span>}
                  {listing.price && <span className="flex items-center gap-1.5 text-xs font-semibold text-green ml-auto">{listing.price}</span>}
                </div>
              </Link>
            )) : <p className="text-muted col-span-full text-center py-16">No listings posted yet.</p>}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              {page > 1 && <Link href={pageUrl(page - 1)} className="bg-white border border-border rounded-full px-5 py-2 text-sm hover:border-ink transition-colors">Previous</Link>}
              <span className="text-sm text-muted">Page {page} of {totalPages}</span>
              {page < totalPages && <Link href={pageUrl(page + 1)} className="bg-white border border-border rounded-full px-5 py-2 text-sm hover:border-ink transition-colors">Next</Link>}
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}