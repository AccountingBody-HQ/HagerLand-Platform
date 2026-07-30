export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase-admin'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata = {
  title: 'Ethiopian Property Agencies | HagerLand',
  description: 'Find verified Ethiopian real estate agencies worldwide.',
  openGraph: {
    title: 'Ethiopian Property Agencies | HagerLand',
    description: 'Find verified Ethiopian real estate agencies worldwide.',
  },
}

const COUNTRY_FILTERS = [
  { key: 'ethiopia', label: 'Ethiopia', value: 'Ethiopia' },
  { key: 'uk', label: 'UK', value: 'United Kingdom' },
  { key: 'us', label: 'US', value: 'United States' },
] as const

function confidenceClasses(level: string | null | undefined) {
  if (level === 'high') return 'bg-green text-white'
  if (level === 'medium') return 'bg-gold-soft text-gold'
  if (level === 'low') return 'bg-red-100 text-red-600'
  return 'bg-section text-muted'
}

export default async function PropertyPage({
  searchParams,
}: {
  searchParams: { country?: string }
}) {
  const countryKey = searchParams.country
  const activeFilter = COUNTRY_FILTERS.find((f) => f.key === countryKey)

  let query = supabaseAdmin
    .from('properties')
    .select('id, company_name, city, country, google_rating, google_review_count, agent_confidence')
    .eq('status', 'active')
    .order('company_name', { ascending: true })
  if (activeFilter) query = query.eq('country', activeFilter.value)

  const { data: agencies, error } = await query

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />

      {/* HERO */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)' }} />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2.5 text-white/50 text-[11px] font-bold tracking-[0.18em] uppercase mb-8">
              ሃገር
              <span className="w-1 h-1 rounded-full bg-white/30" translate="no" />
              Homeland
              <span className="w-1 h-1 rounded-full bg-white/30" translate="no" />
              Property
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">
              Ethiopian Property Agencies
            </h1>
            <p className="text-white/65 text-lg sm:text-xl max-w-xl leading-relaxed">
              Find verified Ethiopian real estate agencies worldwide
            </p>
          </div>
        </div>
      </section>

      {/* LISTINGS */}
      <section className="bg-section flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24">

          {/* FILTER PILLS */}
          <div className="flex flex-wrap items-center gap-2 mb-8">
            <Link
              href="/property"
              className={`text-xs font-medium px-3 py-2 rounded-full border transition-colors whitespace-nowrap ${!activeFilter ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'}`}
            >
              All
            </Link>
            {COUNTRY_FILTERS.map((f) => (
              <Link
                key={f.key}
                href={`/property?country=${f.key}`}
                className={`text-xs font-medium px-3 py-2 rounded-full border transition-colors whitespace-nowrap ${activeFilter?.key === f.key ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'}`}
              >
                {f.label}
              </Link>
            ))}
          </div>

          {error && <p className="text-sm text-red-600 mb-6">Error loading agencies: {error.message}</p>}

          {/* CARDS */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agencies && agencies.length > 0 ? agencies.map((agency) => (
              <Link
                key={agency.id}
                href={`/property/${agency.id}`}
                className="group flex flex-col bg-white border border-border rounded-2xl overflow-hidden hover:border-l-4 hover:border-l-green hover:border-green/30 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start gap-4 p-5 pb-4">
                  <div className="w-11 h-11 rounded-xl bg-green-soft flex items-center justify-center font-black text-green text-lg shrink-0">
                    {agency.company_name?.charAt(0) ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-ink text-sm leading-snug truncate group-hover:text-green transition-colors">{agency.company_name}</h3>
                    <p className="text-xs text-muted mt-0.5 truncate">{[agency.city, agency.country].filter(Boolean).join(', ') || 'Real estate agency'}</p>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted group-hover:text-green shrink-0 mt-0.5 transition-colors"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </div>
                <div className="flex items-center gap-2 px-5 pb-4 flex-wrap">
                  {agency.city && <span className="text-xs font-semibold text-muted bg-section border border-border px-2.5 py-1 rounded-full">{agency.city}</span>}
                  {agency.google_rating != null && (
                    <span className="inline-flex items-center gap-1 bg-gold-soft text-gold text-xs font-bold px-2.5 py-1 rounded-full">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                      {agency.google_rating}{agency.google_review_count ? ` (${agency.google_review_count})` : ''}
                    </span>
                  )}
                  {agency.agent_confidence && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${confidenceClasses(agency.agent_confidence)}`}>
                      {agency.agent_confidence} confidence
                    </span>
                  )}
                </div>
              </Link>
            )) : (
              <p className="text-muted col-span-full text-center py-16">
                {activeFilter ? `No agencies listed in ${activeFilter.label} yet.` : 'No agencies listed yet.'}
              </p>
            )}
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
