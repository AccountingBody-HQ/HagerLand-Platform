import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { SubmissionBanner } from '@/components/SubmissionBanner'

export const metadata = {
  title: 'Ethiopian business directory | HagerLand',
  description: 'Find verified Ethiopian-owned businesses across the UK and worldwide.',
  openGraph: {
    title: 'Ethiopian business directory | HagerLand',
    description: 'Find verified Ethiopian-owned businesses worldwide.',
  },
}

const PAGE_SIZE = 20

export default async function BusinessPage({
  searchParams,
}: {
  searchParams: { city?: string; page?: string }
}) {
  const city = searchParams.city
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('companies')
    .select('id, company_name, sic_description, trading_address_city, phone, is_verified', { count: 'exact' })
    .eq('status', 'active')
    .order('company_name', { ascending: true })
    .range(from, to)

  if (city) query = query.eq('trading_address_city', city)

  const { data: businesses, count, error } = await query

  const { data: cityRows } = await supabase
    .from('companies')
    .select('trading_address_city')
    .eq('status', 'active')
    .not('trading_address_city', 'is', null)

  const cities = Array.from(
    new Set(
      (cityRows ?? []).map((r) => r.trading_address_city).filter(Boolean) as string[]
    )
  ).sort()

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  function paginationUrl(p: number) {
    const params = new URLSearchParams()
    if (city) params.set('city', city)
    params.set('page', String(p))
    return `/business?${params.toString()}`
  }

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />

      {/* HERO BAND */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)'}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2.5 text-white/50 text-[11px] font-bold tracking-[0.18em] uppercase mb-4">
                ሃገር
                <span className="w-1 h-1 rounded-full bg-white/30" />
                Business directory
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-[1.05] tracking-tight mb-3">
                Ethiopian-owned businesses
              </h1>
              <p className="text-white/65 text-base sm:text-lg leading-relaxed">
                Discover and support verified businesses in the Ethiopian community.
                {count != null && count > 0 && (
                  <span className="ml-2 text-white/40">{count.toLocaleString()} listed.</span>
                )}
              </p>
            </div>
            <Link href="/business/post"
              className="shrink-0 bg-white text-green font-bold rounded-full px-6 py-3 text-sm hover:bg-green-soft transition-colors">
              List your business →
            </Link>
          </div>
        </div>
      </section>

      {/* LISTINGS */}
      <section className="bg-section flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-16">
          <SubmissionBanner />

          {/* FILTERS */}
          {cities.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              <Link href="/business"
                className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
                  !city ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'
                }`}>
                All cities
              </Link>
              {cities.map((c) => (
                <Link key={c} href={`/business?city=${encodeURIComponent(c)}`}
                  className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
                    city === c ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'
                  }`}>
                  {c}
                </Link>
              ))}
            </div>
          )}
          {city && (
            <div className="flex items-center gap-2 mb-4 text-sm text-muted">
              <span>Showing businesses in {city}</span>
              <Link href="/business" className="text-green hover:underline">Clear filter</Link>
            </div>
          )}
          {error && <p className="text-sm text-red-600 mb-6">Error loading businesses: {error.message}</p>}

          {/* CARDS */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {businesses && businesses.length > 0 ? (
              businesses.map((business) => (
                <Link key={business.id} href={`/business/${business.id}`}
                  className="group bg-white border border-border rounded-2xl p-5 hover:border-green/50 hover:shadow-lg transition-all duration-200 block">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-green-soft flex items-center justify-center font-bold text-green text-lg">
                      {business.company_name.charAt(0)}
                    </div>
                    {business.is_verified && (
                      <span className="inline-flex items-center gap-1.5 bg-gold-soft text-gold text-xs font-semibold px-2.5 py-1 rounded-full">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                        Verified
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-ink mb-1 group-hover:text-green transition-colors truncate">{business.company_name}</h3>
                  <p className="text-sm text-muted line-clamp-2">
                    {[business.sic_description, business.trading_address_city].filter(Boolean).join(' · ')}
                  </p>
                  {business.phone && <p className="text-xs text-muted mt-2">{business.phone}</p>}
                </Link>
              ))
            ) : (
              <p className="text-muted col-span-full text-center py-16">
                {city ? `No businesses listed in ${city} yet.` : 'No businesses listed yet.'}
              </p>
            )}
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              {page > 1 && (
                <Link href={paginationUrl(page - 1)} className="bg-white border border-border rounded-full px-5 py-2 text-sm hover:border-ink transition-colors">
                  Previous
                </Link>
              )}
              <span className="text-sm text-muted">Page {page} of {totalPages}</span>
              {page < totalPages && (
                <Link href={paginationUrl(page + 1)} className="bg-white border border-border rounded-full px-5 py-2 text-sm hover:border-ink transition-colors">
                  Next
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}