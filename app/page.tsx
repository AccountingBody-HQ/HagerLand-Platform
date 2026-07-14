import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { SearchBox } from '@/components/SearchBox'

export const metadata = {
  title: 'HagerLand — The global network for Ethiopian business',
  description: 'Find verified Ethiopian-owned businesses, jobs, housing, events, and community across the diaspora.',
}

const SECTIONS = [
  { href: '/business', label: 'Businesses', description: 'Verified Ethiopian-owned businesses worldwide', table: 'companies' },
  { href: '/jobs', label: 'Jobs', description: 'Work within the Ethiopian community', table: 'jobs' },
  { href: '/housing', label: 'Housing', description: 'Rooms, rentals, and properties', table: 'housing' },
  { href: '/cars', label: 'Cars & taxi', description: 'Buy, sell, or find a trusted driver', table: 'cars' },
  { href: '/tutors', label: 'Tutors', description: 'Expert teaching and mentoring', table: 'tutors' },
  { href: '/community', label: 'Community', description: 'Churches, associations, and groups', table: 'community' },
  { href: '/events', label: 'Events', description: 'Celebrations and networking', table: 'events' },
] as const

const TRUST = [
  { stat: '100%', label: 'Verified listings', body: 'Every submission reviewed by our team before going live.' },
  { stat: 'Free', label: 'Always free to list', body: 'No fees, no subscriptions. Community first, always.' },
  { stat: '7', label: 'Categories', body: 'Businesses, jobs, housing, cars, tutors, community and events.' },
  { stat: 'Global', label: 'Diaspora-wide', body: 'Serving the Ethiopian community wherever in the world you are.' },
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
    companies: b.count ?? 0, jobs: j.count ?? 0, housing: h.count ?? 0,
    cars: c.count ?? 0, tutors: t.count ?? 0, community: co.count ?? 0, events: e.count ?? 0,
  }
  const totalListings = Object.values(counts).reduce((a, b) => a + b, 0)

  const { data: recentBusinesses } = await supabase
    .from('companies').select('id, company_name, sic_description, trading_address_city, is_verified')
    .eq('status', 'active').order('created_at', { ascending: false }).limit(4)

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />

      {/* ══════════════════════ HERO */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)'}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2.5 text-white/55 text-[11px] font-bold tracking-[0.18em] uppercase mb-8">
              ሃገር
              <span className="w-1 h-1 rounded-full bg-white/30" />
              Homeland
              <span className="w-1 h-1 rounded-full bg-white/30" />
              The Ethiopian diaspora network
            </p>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight mb-6">
              Find Ethiopian
              <br />
              <span className="text-white/60">business,</span>
              <br />
              <span className="text-white/60">worldwide.</span>
            </h1>
            <p className="text-white/65 text-lg sm:text-xl max-w-xl mb-10 leading-relaxed">
              The verified directory of Ethiopian-owned businesses, jobs, housing, community, and events — serving the diaspora everywhere.
            </p>
            <div className="max-w-xl mb-10">
              <SearchBox className="shadow-2xl shadow-black/20" />
            </div>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              {[
                { value: totalListings.toLocaleString(), label: 'active listings' },
                { value: counts.companies.toLocaleString(), label: 'businesses' },
                { value: '7', label: 'categories' },
                { value: 'Free', label: 'to list' },
              ].map((s) => (
                <div key={s.label} className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{s.value}</span>
                  <span className="text-white/40 text-sm">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ SECTIONS GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">Browse the platform</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight">Everything the<br className="hidden sm:block"/> Ethiopian diaspora needs</h2>
          </div>
          <Link href="/business/post" className="hidden sm:inline-flex items-center gap-2 border border-border text-ink text-sm font-semibold rounded-full px-5 py-2.5 hover:border-ink hover:bg-section transition-all shrink-0">
            List your business →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {SECTIONS.map((section, i) => (
            <Link key={section.href} href={section.href}
              className="group bg-white border border-border rounded-2xl p-6 hover:border-green/50 hover:shadow-xl transition-all duration-200">
              <div className="flex items-start justify-between mb-8">
                <span className="text-xs font-bold text-muted/40 tracking-widest tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                {counts[section.table] > 0 && (
                  <span className="text-xs font-semibold text-green bg-green-soft px-2.5 py-1 rounded-full">
                    {counts[section.table].toLocaleString()}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-ink mb-2 group-hover:text-green transition-colors">{section.label}</h3>
              <p className="text-sm text-muted leading-relaxed mb-8">{section.description}</p>
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted/40 group-hover:text-green group-hover:gap-2.5 transition-all">
                Browse
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════════════════ HOW IT WORKS */}
      <section className="bg-section border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-green mb-4">How it works</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight mb-6">Simple. Trusted.<br/>Community-first.</h2>
              <p className="text-muted leading-relaxed text-base mb-8">HagerLand connects the Ethiopian diaspora with trusted, verified listings. Every business, job, and event is reviewed by our team before it goes live — no spam, no fakes.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/business" className="inline-flex items-center justify-center gap-2 bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-3 transition-colors text-sm">
                  Browse businesses
                </Link>
                <Link href="/how-it-works" className="inline-flex items-center justify-center gap-2 border border-border text-ink font-semibold rounded-full px-6 py-3 hover:border-ink transition-colors text-sm">
                  Learn more →
                </Link>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { n: '01', title: 'Search or browse', body: 'Find what you need by name, category, or city. All 7 sections are fully searchable.' },
                { n: '02', title: 'Connect directly', body: 'Click to reveal contact details. Reach the listing owner directly — no middleman, no fees.' },
                { n: '03', title: 'List for free', body: 'Submit your listing in under 2 minutes. Reviewed by our team and live within 48 hours.' },
              ].map((step) => (
                <div key={step.n} className="group flex gap-5 p-5 bg-white rounded-2xl border border-border hover:border-green/40 hover:shadow-md transition-all">
                  <span className="text-xs font-bold text-green mt-0.5 shrink-0 w-6 tabular-nums">{step.n}</span>
                  <div>
                    <h3 className="font-bold text-ink mb-1 text-sm">{step.title}</h3>
                    <p className="text-sm text-muted leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ RECENTLY ADDED */}
      {recentBusinesses && recentBusinesses.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 w-full">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">Just added</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-ink">Recently listed businesses</h2>
            </div>
            <Link href="/business" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-ink hover:text-green transition-colors">
              View all
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recentBusinesses.map((business) => (
              <Link key={business.id} href={`/business/${business.id}`}
                className="group bg-white border border-border rounded-2xl p-5 hover:border-green/40 hover:shadow-lg transition-all duration-200">
                <div className="flex items-center justify-between mb-5">
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
                <p className="font-bold text-ink text-sm mb-1 truncate group-hover:text-green transition-colors">{business.company_name}</p>
                <p className="text-xs text-muted leading-relaxed line-clamp-2">
                  {[business.sic_description, business.trading_address_city].filter(Boolean).join(' · ')}
                </p>
              </Link>
            ))}
          </div>
          <div className="sm:hidden mt-6">
            <Link href="/business" className="text-sm font-semibold text-green">View all businesses →</Link>
          </div>
        </section>
      )}

      {/* ══════════════════════ TRUST STATS */}
      <section className="bg-green">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-4">Why HagerLand</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Built for trust.<br/>Built for the community.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TRUST.map((item) => (
              <div key={item.label} className="bg-white/10 border border-white/10 rounded-2xl p-7">
                <p className="text-3xl font-bold text-white mb-1">{item.stat}</p>
                <p className="text-sm font-semibold text-white mb-3">{item.label}</p>
                <p className="text-sm text-white/55 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ CTA */}
      <section className="bg-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">List your business for free</h2>
            <p className="text-white/40 text-sm">Join the growing Ethiopian business network. Takes under 2 minutes.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
            <Link href="/business/post" className="bg-green hover:bg-green-dark text-white font-bold rounded-full px-8 py-3.5 transition-colors text-center text-sm">
              Get listed — free
            </Link>
            <Link href="/business" className="border border-white/20 hover:border-white/50 text-white font-semibold rounded-full px-8 py-3.5 transition-colors text-center text-sm">
              Browse businesses
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
