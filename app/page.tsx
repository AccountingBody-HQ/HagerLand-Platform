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
  { href: '/jobs', label: 'Jobs', description: 'Work within the community', emoji: '💼', table: 'jobs' },
  { href: '/housing', label: 'Housing', description: 'Rooms, rentals, and homes', emoji: '🏠', table: 'housing' },
  { href: '/cars', label: 'Cars & taxi', description: 'Buy, sell, or find a driver', emoji: '🚗', table: 'cars' },
  { href: '/tutors', label: 'Tutors', description: 'Expert teaching and mentoring', emoji: '📚', table: 'tutors' },
  { href: '/community', label: 'Community', description: 'Churches and associations', emoji: '🤝', table: 'community' },
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
    .limit(3)

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />

      {/* ── HERO ── */}
      <section className="relative bg-green overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 50%, #1a7a4a 100%)' }} />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '28px 28px' }} />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
          <p className="inline-flex items-center gap-2 text-white/60 text-xs font-semibold tracking-widest uppercase mb-8">
            ሃገር &nbsp;·&nbsp; Homeland
          </p>
          <h1 className="text-5xl sm:text-7xl font-bold text-white tracking-tight leading-[1.05] mb-6">
            Ethiopian business,
            <br/><span style={{ color: 'rgba(255,255,255,0.65)' }}>found here.</span>
          </h1>
          <p className="text-white/65 text-base sm:text-lg max-w-lg mx-auto mb-10 leading-relaxed">
            The verified directory of Ethiopian-owned businesses, jobs, housing, and community — worldwide.
          </p>
          <div className="max-w-lg mx-auto">
            <SearchBox className="shadow-2xl" />
          </div>
          <p className="text-white/40 text-xs mt-5">{totalListings} active listings across 7 categories</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-bg" style={{ clipPath: 'ellipse(55% 100% at 50% 100%)' }} />
      </section>

      {/* ── DIRECTORY FEATURE ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-10 w-full">
        <div className="grid lg:grid-cols-5 gap-5">

          {/* Business directory — featured large */}
          <Link href="/business" className="lg:col-span-2 group relative bg-green rounded-2xl p-8 flex flex-col justify-between min-h-[280px] overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl mb-6">🏢</div>
              <h2 className="text-2xl font-bold text-white mb-2">Business directory</h2>
              <p className="text-white/70 text-sm leading-relaxed">Discover and support verified Ethiopian-owned businesses across the UK and worldwide.</p>
            </div>
            <div className="relative flex items-center justify-between mt-8">
              <div>
                <p className="text-3xl font-bold text-white">{counts.companies}</p>
                <p className="text-white/60 text-xs mt-0.5">businesses listed</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/20 group-hover:bg-white/30 flex items-center justify-center transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </div>
          </Link>

          {/* 6 other sections — 2 col grid */}
          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {SECTIONS.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="group bg-white border border-border rounded-2xl p-5 hover:border-green/50 hover:shadow-md transition-all duration-200 flex flex-col"
              >
                <div className="w-10 h-10 rounded-xl bg-green-soft flex items-center justify-center text-lg mb-4">{section.emoji}</div>
                <h3 className="font-bold text-ink text-sm mb-1 group-hover:text-green transition-colors">{section.label}</h3>
                <p className="text-xs text-muted leading-relaxed flex-1">{section.description}</p>
                {counts[section.table] > 0 && (
                  <p className="text-xs font-semibold text-green mt-3">{counts[section.table]} listings</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 w-full">
        <div className="bg-section rounded-3xl px-8 py-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-green mb-2 text-center">Simple by design</p>
          <h2 className="text-2xl font-bold text-ink text-center mb-12">How HagerLand works</h2>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-12 relative">
            <div className="hidden sm:block absolute top-5 left-[calc(16.7%+1rem)] right-[calc(16.7%+1rem)] h-px bg-border" />
            {[
              { n: '01', title: 'Search or browse', body: 'Find businesses, jobs, housing, or events by name, category, or city.' },
              { n: '02', title: 'Connect directly', body: 'Click to reveal contact details and reach out to the listing owner directly.' },
              { n: '03', title: 'List for free', body: 'Submit your own listing in under 2 minutes. Every submission is reviewed before going live.' },
            ].map((step) => (
              <div key={step.n} className="relative text-center">
                <div className="w-10 h-10 rounded-full bg-white border-2 border-border flex items-center justify-center text-xs font-bold text-green mx-auto mb-4 relative z-10">{step.n}</div>
                <h3 className="font-bold text-ink mb-2">{step.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RECENTLY ADDED ── */}
      {recentBusinesses && recentBusinesses.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-14 w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-ink">Recently added</h2>
            <Link href="/business" className="text-sm font-semibold text-green hover:text-green-dark flex items-center gap-1 transition-colors">
              View all
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {recentBusinesses.map((business) => (
              <Link
                key={business.id}
                href={`/business/${business.id}`}
                className="bg-white rounded-2xl border border-border p-5 hover:shadow-md hover:border-green/30 transition-all duration-200 group flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-green-soft flex items-center justify-center font-bold text-green text-lg shrink-0">
                  {business.company_name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-ink text-sm truncate group-hover:text-green transition-colors">{business.company_name}</p>
                    {business.is_verified && (
                      <span className="bg-gold-soft text-gold text-xs font-semibold px-2 py-0.5 rounded-full shrink-0">✓</span>
                    )}
                  </div>
                  <p className="text-xs text-muted truncate">
                    {[business.sic_description, business.trading_address_city].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── CTA BAND ── */}
      <section className="bg-ink mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">List your business for free</h2>
            <p className="text-white/50 text-sm">Join the directory. Takes less than 2 minutes.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link href="/business/post" className="bg-green hover:bg-green-dark text-white font-semibold rounded-full px-7 py-3 transition-colors text-center">
              Get listed — free
            </Link>
            <Link href="/business" className="border border-white/20 hover:border-white/40 text-white font-semibold rounded-full px-7 py-3 transition-colors text-center">
              Browse businesses
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
