import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { SearchBox } from '@/components/SearchBox'

export const metadata = {
  title: 'HagerLand — The global network for Ethiopian business',
  description: 'Find verified Ethiopian-owned businesses, jobs, housing, events, and community across the diaspora.',
  openGraph: {
    title: 'HagerLand — The global network for Ethiopian business',
    description: 'The digital home of the Ethiopian diaspora.',
  },
}

const SECTIONS = [
  { href: '/business', label: 'Businesses', description: 'Verified Ethiopian-owned businesses', emoji: '🏢', table: 'companies' },
  { href: '/jobs', label: 'Jobs', description: 'Work within the community', emoji: '💼', table: 'jobs' },
  { href: '/housing', label: 'Housing', description: 'Rooms, rentals, and homes', emoji: '🏠', table: 'housing' },
  { href: '/cars', label: 'Cars & taxi', description: 'Buy, sell, or find a driver', emoji: '🚗', table: 'cars' },
  { href: '/tutors', label: 'Tutors', description: 'Expert teaching and mentoring', emoji: '📚', table: 'tutors' },
  { href: '/community', label: 'Community', description: 'Churches, associations, and groups', emoji: '🤝', table: 'community' },
  { href: '/events', label: 'Events', description: 'Celebrations and networking', emoji: '🎉', table: 'events' },
] as const

export default async function HomePage() {
  const [b, j, h, c, t, co, e] = await Promise.all([
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('housing').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('cars').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('tutors').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('community').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ])

  const counts: Record<string, number> = {
    companies: b.count ?? 0,
    jobs: j.count ?? 0,
    housing: h.count ?? 0,
    cars: c.count ?? 0,
    tutors: t.count ?? 0,
    community: co.count ?? 0,
    events: e.count ?? 0,
  }

  const totalListings = Object.values(counts).reduce((a, b) => a + b, 0)
  const totalBusinesses = counts.companies

  const { data: recentBusinesses } = await supabase
    .from('companies')
    .select('id, company_name, sic_description, trading_address_city, is_verified')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(4)

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-green">
        {/* subtle texture overlay */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          {/* eyebrow */}
          <div className="inline-flex items-center gap-2 bg-white/15 text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-8 tracking-wide uppercase">
            ሃገር — Homeland
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-6">
            The home of Ethiopian
            <br />
            <span className="text-white/80">business worldwide</span>
          </h1>
          <p className="text-white/75 text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
            Discover and support verified Ethiopian-owned businesses, jobs, housing, and community — all in one place.
          </p>
          {/* search */}
          <div className="max-w-xl mx-auto mb-8">
            <div className="relative">
              <SearchBox className="shadow-xl shadow-green-dark/30" />
            </div>
          </div>
          {/* quick links */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-white/50">Browse:</span>
            {SECTIONS.slice(0, 5).map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="text-white/80 hover:text-white border border-white/20 hover:border-white/50 rounded-full px-3 py-1 transition-colors"
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center justify-center sm:justify-between gap-6">
          <div className="flex items-center gap-8 sm:gap-12">
            {[
              { value: totalListings.toLocaleString(), label: 'Active listings' },
              { value: totalBusinesses.toLocaleString(), label: 'Businesses' },
              { value: '7', label: 'Categories' },
              { value: 'Free', label: 'To list' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-ink">{stat.value}</p>
                <p className="text-xs text-muted mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
          <Link href="/business/post" className="hidden sm:inline-flex items-center gap-2 bg-green hover:bg-green-dark text-white text-sm font-semibold rounded-full px-5 py-2.5 transition-colors">
            List your business
          </Link>
        </div>
      </section>

      {/* ── SECTIONS GRID ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 w-full">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-green mb-2">Everything in one place</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-ink">The Ethiopian diaspora community,<br className="hidden sm:block" /> all in one platform</h2>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group relative bg-white border border-border rounded-2xl p-6 hover:border-green/40 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-green-soft flex items-center justify-center text-xl">
                  {section.emoji}
                </div>
                {counts[section.table] > 0 && (
                  <span className="text-xs font-semibold text-muted bg-section px-2.5 py-1 rounded-full">
                    {counts[section.table]}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-ink mb-1 group-hover:text-green transition-colors">{section.label}</h3>
              <p className="text-sm text-muted leading-relaxed">{section.description}</p>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-green opacity-0 group-hover:opacity-100 transition-opacity">
                Browse
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── RECENTLY ADDED ── */}
      {recentBusinesses && recentBusinesses.length > 0 && (
        <section className="bg-section border-y border-border py-14">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-green mb-1">Just added</p>
                <h2 className="text-xl sm:text-2xl font-bold text-ink">Recently listed businesses</h2>
              </div>
              <Link href="/business" className="text-sm font-semibold text-green hover:text-green-dark flex items-center gap-1 transition-colors">
                View all
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentBusinesses.map((business) => (
                <Link
                  key={business.id}
                  href={`/business/${business.id}`}
                  className="bg-white rounded-2xl border border-border p-5 hover:shadow-md hover:border-green/30 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-green-soft flex items-center justify-center font-bold text-green">
                      {business.company_name.charAt(0)}
                    </div>
                    {business.is_verified && (
                      <span className="bg-gold-soft text-gold text-xs font-semibold px-2.5 py-1 rounded-full">Verified</span>
                    )}
                  </div>
                  <p className="font-bold text-ink text-sm mb-1 truncate group-hover:text-green transition-colors">{business.company_name}</p>
                  <p className="text-xs text-muted truncate">
                    {[business.sic_description, business.trading_address_city].filter(Boolean).join(' · ')}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── TRUST SIGNALS ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 w-full">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-green mb-2">Why HagerLand</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-ink">Built for trust. Built for the community.</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              icon: '✓',
              title: 'Every listing verified',
              body: 'Our team reviews every submission before it goes live. No spam, no fake listings.',
            },
            {
              icon: '🌐',
              title: 'Diaspora-wide coverage',
              body: 'From London to Toronto to Sydney — HagerLand serves the Ethiopian community wherever they are.',
            },
            {
              icon: '💎',
              title: 'Free for everyone',
              body: 'Listing your business, job, or event is completely free. Community first, always.',
            },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-2xl border border-border p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-green-soft flex items-center justify-center text-xl mx-auto mb-4">{item.icon}</div>
              <h3 className="font-bold text-ink mb-2">{item.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <section className="bg-ink py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Ready to list your business?</h2>
          <p className="text-white/60 mb-8 leading-relaxed">Join the growing directory of Ethiopian-owned businesses. It takes less than 2 minutes and is completely free.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/business/post" className="bg-green hover:bg-green-dark text-white font-semibold rounded-full px-8 py-3 transition-colors">
              List your business — free
            </Link>
            <Link href="/business" className="border border-white/20 text-white hover:border-white/50 font-semibold rounded-full px-8 py-3 transition-colors">
              Browse the directory
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
