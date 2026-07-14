import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { SearchBox } from '@/components/SearchBox'
import { HeroGraphic } from '@/components/HeroGraphic'

export const metadata = {
  title: 'HagerLand — The global network for Ethiopian business',
  description: 'Find verified Ethiopian-owned businesses, jobs, housing, events, and community across the diaspora.',
  openGraph: {
    title: 'HagerLand — The global network for Ethiopian business',
    description: 'The digital home of the Ethiopian diaspora.',
  },
}

const SECTIONS = [
  { href: '/business', label: 'Business directory', description: 'Find verified Ethiopian-owned businesses', emoji: '🏢', table: 'companies' },
  { href: '/jobs', label: 'Jobs', description: 'Work within the community', emoji: '💼', table: 'jobs' },
  { href: '/housing', label: 'Housing', description: 'Rooms, rentals, and homes', emoji: '🏠', table: 'housing' },
  { href: '/cars', label: 'Cars & taxi', description: 'Buy, sell, or find a driver', emoji: '🚗', table: 'cars' },
  { href: '/tutors', label: 'Tutors', description: 'Teaching and mentoring', emoji: '📚', table: 'tutors' },
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

  const { data: recentBusinesses } = await supabase
    .from('companies')
    .select('id, company_name, sic_description, trading_address_city, is_verified')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(4)

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 grid md:grid-cols-2 gap-10 items-center w-full">
        <div className="text-center md:text-left">
          <h1 className="text-3xl sm:text-5xl font-bold text-ink leading-tight tracking-tight">
            Welcome to the home of Ethiopian business worldwide
          </h1>
          <p className="text-muted text-base sm:text-lg mt-5 max-w-md mx-auto md:mx-0">
            Find verified Ethiopian-owned businesses across the diaspora, or list your own for free.
          </p>
          <SearchBox className="mt-6 max-w-md mx-auto md:mx-0" />
          <div className="flex flex-col sm:flex-row gap-3 mt-5 max-w-xs sm:max-w-sm mx-auto md:mx-0">
            <Link href="/business" className="flex-1 bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-2.5 transition-colors text-center">
              Explore the directory
            </Link>
            <Link href="/business/post" className="flex-1 border border-ink text-ink font-semibold rounded-full px-6 py-2.5 transition-colors hover:bg-section text-center">
              List your business
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-center order-first md:order-last">
          <HeroGraphic />
        </div>
      </section>
      <section className="bg-section border-y border-border py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-ink">{totalListings}</p>
            <p className="text-xs text-muted mt-0.5">Active listings</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-ink">7</p>
            <p className="text-xs text-muted mt-0.5">Sections</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-ink">Free</p>
            <p className="text-xs text-muted mt-0.5">To list</p>
          </div>
        </div>
      </section>
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 w-full">
        <h2 className="text-2xl font-bold text-ink mb-2">Everything in one place</h2>
        <p className="text-muted mb-8">The Ethiopian diaspora community, all in one platform.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="border border-border bg-white rounded-xl p-5 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl" aria-hidden="true">{section.emoji}</span>
                {counts[section.table] > 0 && (
                  <span className="text-xs font-semibold text-muted bg-section px-2.5 py-1 rounded-full">
                    {counts[section.table]} {counts[section.table] === 1 ? 'listing' : 'listings'}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-ink mb-1 group-hover:text-green transition-colors">{section.label}</h3>
              <p className="text-sm text-muted">{section.description}</p>
            </Link>
          ))}
        </div>
      </section>
      {recentBusinesses && recentBusinesses.length > 0 && (
        <section className="bg-section py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-ink">Recently added businesses</h2>
              <Link href="/business" className="text-sm text-green font-medium hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentBusinesses.map((business) => (
                <Link
                  key={business.id}
                  href={`/business/${business.id}`}
                  className="bg-white rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-full bg-green-soft flex items-center justify-center font-bold text-green text-sm">
                      {business.company_name.charAt(0)}
                    </div>
                    {business.is_verified && (
                      <span className="bg-gold-soft text-gold text-xs font-semibold px-2.5 py-1 rounded-full">Verified</span>
                    )}
                  </div>
                  <p className="font-semibold text-ink text-sm mb-0.5 truncate">{business.company_name}</p>
                  <p className="text-xs text-muted truncate">
                    {[business.sic_description, business.trading_address_city].filter(Boolean).join(' · ')}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 w-full">
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-border p-6">
            <p className="font-bold text-lg text-ink mb-2">Verified listings</p>
            <p className="text-sm text-muted">Every listing is reviewed before it goes live.</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-6">
            <p className="font-bold text-lg text-ink mb-2">Every industry</p>
            <p className="text-sm text-muted">From restaurants to accountants, find any Ethiopian-owned service.</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-6">
            <p className="font-bold text-lg text-ink mb-2">Every diaspora city</p>
            <p className="text-sm text-muted">Built for the whole community, wherever you are.</p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
