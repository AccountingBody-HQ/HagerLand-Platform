import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { SearchBox } from '@/components/SearchBox'

export const revalidate = 60

export const metadata = {
  title: 'HagerLand — Where Ethiopia Does Business',
  description: "Financial markets, verified businesses, products made in Ethiopia, and opportunities across the diaspora. Ethiopia's business and financial platform — built for Ethiopia, open to the world.",
  openGraph: {
    title: 'HagerLand — Where Ethiopia Does Business',
    description: "Financial markets, verified businesses, products made in Ethiopia, and opportunities across the diaspora. Ethiopia's business and financial platform — built for Ethiopia, open to the world.",
    url: 'https://hagerland.com',
    siteName: 'HagerLand',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HagerLand — Where Ethiopia Does Business',
    description: "Financial markets, verified businesses, products made in Ethiopia, and opportunities across the diaspora.",
  },
}

const PILLARS = [
  { href: '/made-in-ethiopia', label: 'Made in Ethiopia', description: 'Products grown, made, and crafted in Ethiopia — verified at source', table: 'made_in_ethiopia',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.59 13.41L13.42 20.58a2 2 0 01-2.83 0L2.59 12.58A2 2 0 012 11.17V4a2 2 0 012-2h7.17a2 2 0 011.42.59l8 8a2 2 0 010 2.82z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>` },
  { href: '/birrbank', label: 'BirrBank', description: 'Ethiopian financial intelligence — rates, markets, institutions, and investment', table: null,
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>` },
  { href: '/housing', label: 'Property', description: 'Ethiopian real estate — listings, intelligence, and market insight', table: 'housing',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>` },
  { href: '/diaspora', label: 'Diaspora Businesses', description: 'The Ethiopian economy abroad — businesses, jobs, housing, money, and more', table: null,
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 3v18M16 3v18M2 9h20M2 15h20"/></svg>` },
  { href: '/community', label: 'Diaspora Network', description: 'The institutional layer — associations, churches, charities, and civic organisations', table: 'community',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>` },
  { href: '/events', label: 'Events', description: 'The Ethiopian business calendar — trade missions, summits, and commercial events', table: 'events',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>` },
] as const

const TRUST = [
  { stat: '100%', label: 'Verified listings', body: 'Every submission reviewed by our team before going live.' },
  { stat: 'Free', label: 'Always free to list', body: 'No fees, no subscriptions — built to last.' },
  { stat: '6', label: 'Pillars', body: 'Made in Ethiopia, BirrBank, Property, Diaspora Businesses, Diaspora Network, and Events.' },
  { stat: 'Global', label: 'Worldwide', body: 'Built for Ethiopia. Open to the world.' },
] as const

export default async function HomePage() {
  const [b, j, h, c, t, co, e, m, d, mie] = await Promise.all([
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('housing').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('cars').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('tutors').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('community').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('money').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('delivery').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('made_in_ethiopia').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ])
  const counts: Record<string, number> = {
    companies: b.count ?? 0, jobs: j.count ?? 0, housing: h.count ?? 0,
    cars: c.count ?? 0, tutors: t.count ?? 0, community: co.count ?? 0, events: e.count ?? 0, money: m.count ?? 0,
    delivery: d.count ?? 0, made_in_ethiopia: mie.count ?? 0,
  }
  const totalListings = Object.values(counts).reduce((a, b) => a + b, 0)
  const { data: recentBusinesses } = await supabase
    .from('companies').select('id, company_name, sic_description, trading_address_city, is_verified')
    .eq('status', 'active').order('created_at', { ascending: false }).limit(4)

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />

      {/* ══ HERO */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)'}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2.5 text-white/50 text-[11px] font-bold tracking-[0.18em] uppercase mb-8">
              ሃገር
              <span className="w-1 h-1 rounded-full bg-white/30" translate="no" />
              Homeland
              <span className="w-1 h-1 rounded-full bg-white/30" translate="no" />
              Ethiopian Network
            </p>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight mb-6">
              Where Ethiopia
              <br /><span className="text-white/60">Does Business.</span>
            </h1>
            <p className="text-white/65 text-lg sm:text-xl max-w-xl mb-4 leading-relaxed">
              Financial markets, verified businesses, products made in Ethiopia, and opportunities across the diaspora — in one place.
            </p>
            <p className="text-white/45 text-sm font-semibold uppercase tracking-wider max-w-xl mb-10">
              Built for Ethiopia. Open to the world.
            </p>
            <div className="max-w-xl mb-10">
              <SearchBox className="shadow-2xl shadow-black/20" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 max-w-xl mb-10">
              <Link href="/made-in-ethiopia" className="flex-1 inline-flex items-center justify-center gap-2 bg-white text-green font-bold rounded-full px-6 py-3.5 text-sm hover:bg-green-soft transition-colors whitespace-nowrap">
                Shop Made in Ethiopia →
              </Link>
              <Link href="/birrbank" className="flex-1 inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold rounded-full px-6 py-3.5 text-sm transition-colors whitespace-nowrap">
                Explore BirrBank<sup style={{ fontSize: '1em', verticalAlign: 'top', position: 'relative', top: '0.15em' }}>®</sup>
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              {[
                { value: totalListings.toLocaleString(), label: 'active listings' },
                { value: counts.made_in_ethiopia.toLocaleString(), label: 'Made in Ethiopia' },
                { value: '6', label: 'pillars' },
                { value: 'Free', label: 'to list' },
              ].map((s) => (
                <div key={s.label} className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white" translate="no">{s.value}</span>
                  <span className="text-white/40 text-sm">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ BIRRBANK */}
      <section className="bg-green-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 mb-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">New on HagerLand</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight mb-3">
                BirrBank<sup style={{ fontSize: '1em', verticalAlign: 'top', position: 'relative', top: '0.15em' }}>®</sup> — Ethiopian financial intelligence
              </h2>
              <p className="text-muted text-base leading-relaxed max-w-xl">
                Compare savings rates, FX rates, insurance, markets and commodities across all NBE-licensed institutions.
              </p>
            </div>
            <Link href="/birrbank/banking"
              className="inline-flex items-center justify-center gap-2 bg-green hover:bg-green-dark text-white font-bold rounded-full px-6 py-3.5 text-sm transition-colors whitespace-nowrap shrink-0">
              Explore BirrBank<sup style={{ fontSize: '1em', verticalAlign: 'top', position: 'relative', top: '0.15em' }}>®</sup> →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {[
              { value: '220+', label: 'Institutions' },
              { value: 'Live', label: 'FX Rates' },
              { value: 'ESX', label: 'Markets' },
              { value: 'ECX', label: 'Commodities' },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-green/15 rounded-2xl p-6 text-center">
                <p className="text-2xl font-bold text-green mb-1" translate="no">{s.value}</p>
                <p className="text-sm font-semibold text-ink">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ BROWSE THE PLATFORM — SIX PILLARS */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">Browse the platform</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight">Six pillars.<br className="hidden sm:block"/> One Ethiopian economy.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PILLARS.map((p) => (
              <Link key={p.href} href={p.href}
                className="group bg-white border border-border rounded-2xl p-7 hover:border-green/50 hover:shadow-lg transition-all duration-200 flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-green-soft text-green flex items-center justify-center mb-5 shrink-0"
                  dangerouslySetInnerHTML={{ __html: p.icon }} />
                <h3 className="font-bold text-ink text-lg mb-2 group-hover:text-green transition-colors">
                  {p.label}
                  {p.href === '/birrbank' && (
                    <sup style={{ fontSize: '1em', verticalAlign: 'top', position: 'relative', top: '0.15em' }}>®</sup>
                  )}
                </h3>
                <p className="text-sm text-muted leading-relaxed flex-1">{p.description}</p>
                {p.table && counts[p.table] > 0 && (
                  <p className="text-xs font-bold text-green mt-4" translate="no">{counts[p.table].toLocaleString()} listings</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS */}
      <section className="bg-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-green mb-4">How it works</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight mb-6">Simple. Trusted.<br/>Built for Ethiopia.</h2>
              <p className="text-muted leading-relaxed text-base mb-8">HagerLand brings Ethiopia&apos;s financial markets, verified businesses, and diaspora opportunities together with trusted, verified listings. Every business, job, and event is reviewed by our team before going live — no spam, no fakes.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/business" className="flex-1 text-center bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-3 transition-colors text-sm">
                  Browse businesses
                </Link>
                <Link href="/how-it-works" className="flex-1 text-center border border-border text-ink font-semibold rounded-full px-6 py-3 hover:border-ink transition-colors text-sm">
                  Learn more →
                </Link>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { n: '01', title: 'Search or browse', body: 'Find what you need by name, category, or city. Every section is fully searchable.' },
                { n: '02', title: 'Connect directly', body: 'Click to reveal contact details. Reach the listing owner directly — no middleman, no fees.' },
                { n: '03', title: 'List for free', body: 'Submit your listing in under 2 minutes. Reviewed by our team and live within 48 hours.' },
              ].map((step) => (
                <div key={step.n} className="group flex gap-5 p-5 bg-white rounded-2xl border border-border hover:border-green/40 hover:shadow-md transition-all">
                  <span className="text-xs font-bold text-green mt-0.5 shrink-0 w-6 tabular-nums" translate="no">{step.n}</span>
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

      {/* ══ RECENTLY ADDED */}
      {recentBusinesses && recentBusinesses.length > 0 && (
        <section className="bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
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
          </div>
        </section>
      )}

      {/* ══ WHY HAGERLAND + CTA merged */}
      <section className="bg-green-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">Why HagerLand</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight">Built for Ethiopia.<br/>Open to the world.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
            {TRUST.map((item) => (
              <div key={item.label} className="bg-white border border-green/15 rounded-2xl p-7">
                <p className="text-3xl font-bold text-green mb-1" translate="no">{item.stat}</p>
                <p className="text-sm font-bold text-ink mb-3">{item.label}</p>
                <p className="text-sm text-muted leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
          {/* CTA strip — merged into this section */}
          <div className="bg-white border border-green/20 rounded-2xl px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-ink mb-1">Ready to join the platform?</h3>
              <p className="text-muted text-sm">List your business, job, or event. Free, always.</p>
            </div>
            <div className="flex flex-row gap-3 shrink-0">
              <Link href="/business/post" className="w-40 text-center bg-green hover:bg-green-dark text-white font-bold rounded-full py-3 px-4 transition-colors text-sm whitespace-nowrap" translate="no">
                Get listed — free
              </Link>
              <Link href="/business" className="w-40 text-center border border-border text-ink hover:border-ink font-semibold rounded-full py-3 px-4 transition-colors text-sm whitespace-nowrap" translate="no">
                Browse businesses
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
