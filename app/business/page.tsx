import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { SectionHeader } from '@/components/SectionHeader'
import { SubmissionBanner } from '@/components/SubmissionBanner'

export const metadata = {
  title: 'Ethiopian business directory',
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
      <SectionHeader
        title="Ethiopian-owned businesses"
        description="Discover and support businesses in the Ethiopian community."
        actions={[{ href: '/business/post', label: 'List your business' }]}
      />
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 flex-1 w-full">
        <SubmissionBanner />
        {cities.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <Link
              href="/business"
              className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
                !city ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'
              }`}
            >
              All cities
            </Link>
            {cities.map((c) => (
              <Link
                key={c}
                href={`/business?city=${encodeURIComponent(c)}`}
                className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
                  city === c ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'
                }`}
              >
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
        {error && (
          <p className="text-sm text-red-600 text-center mb-6">Error loading businesses: {error.message}</p>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {businesses && businesses.length > 0 ? (
            businesses.map((business) => (
              <Link
                key={business.id}
                href={`/business/${business.id}`}
                className="border border-border bg-white rounded-xl p-5 sm:p-6 hover:shadow-md transition-shadow block"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-full bg-green-soft flex items-center justify-center font-bold text-green">
                    {business.company_name.charAt(0)}
                  </div>
                  {business.is_verified && (
                    <span className="bg-gold-soft text-gold text-xs font-semibold px-2.5 py-1 rounded-full">
                      Verified
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-ink mb-1">{business.company_name}</h3>
                <p className="text-sm text-muted mb-3">
                  {[business.sic_description, business.trading_address_city].filter(Boolean).join(' · ')}
                </p>
                {business.phone && <p className="text-sm text-muted">{business.phone}</p>}
              </Link>
            ))
          ) : (
            <p className="text-muted col-span-full text-center py-12">
              {city ? `No businesses listed in ${city} yet.` : 'No businesses listed yet.'}
            </p>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            {page > 1 && (
              <Link href={paginationUrl(page - 1)} className="border border-border rounded-full px-5 py-2 text-sm hover:bg-section transition-colors">
                Previous
              </Link>
            )}
            <span className="text-sm text-muted">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <Link href={paginationUrl(page + 1)} className="border border-border rounded-full px-5 py-2 text-sm hover:bg-section transition-colors">
                Next
              </Link>
            )}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}
