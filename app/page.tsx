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
  {
    href: '/business',
    label: 'Businesses',
    description: 'Verified Ethiopian-owned businesses worldwide',
    table: 'companies',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    featured: true,
  },
  {
    href: '/jobs',
    label: 'Jobs',
    description: 'Work within the Ethiopian community',
    table: 'jobs',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>',
  },
  {
    href: '/housing',
    label: 'Housing',
    description: 'Rooms, rentals, and properties',
    table: 'housing',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>',
  },
  {
    href: '/cars',
    label: 'Cars & taxi',
    description: 'Buy, sell or find a trusted driver',
    table: 'cars',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="8" width="22" height="10" rx="2"/><path d="M5 8l2-4h10l2 4"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
  },
  {
    href: '/tutors',
    label: 'Tutors',
    description: 'Expert teaching and mentoring',
    table: 'tutors',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>',
  },
  {
    href: '/community',
    label: 'Community',
    description: 'Churches, associations and groups',
    table: 'community',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
  },
  {
    href: '/events',
    label: 'Events',
    description: 'Celebrations and networking',
    table: 'events',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  },
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

      {/* HERO */}
      <section className="relative bg-green overflow-hidden">
        {/* gradient depth */}
        <div className="absolute inset-0" style={{background: 'linear-gradient(160deg, #0f5c35 0%, #1C7C4C 45%, #1a7545 100%)'}} />
        {/* dot grid */}
        <div className="absolute inset-0 opacity-[0.06]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '24px 24px'}} />
        {/* bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 80 C360 0 1080 0 1440 80 L1440 80 L0 80 Z" fill="#ffffff"/>
          </svg>
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-24 sm:pt-20 sm:pb-32 text-center">
          {/* eyebrow */}
          <div className="inline-flex items-center gap-2 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
            <span className="text-white/60 text-xs font-semibold tracking-widest uppercase">ሃገር · Homeland</span>
            <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
          </div>
          {/* headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight mb-5">
            Ethiopian business,
            <br />
            <span className="text-white/60">found here.</span>
          </h1>
          <p className="text-white/65 text-base sm:text-lg max-w-lg mx-auto mb-10 leading-relaxed">
            The verified directory of Ethiopian-owned businesses, jobs, housing, and community — worldwide.
          </p>
          {/* search */}
          <div className="max-w-xl mx-auto mb-5">
            <SearchBox className="shadow-2xl shadow-black/20" />
          </div>
          <p className="text-white/35 text-xs">{totalListings} active listings across 7 categories</p>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="bg-white border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-4 overflow-x-auto gap-6 no-scrollbar">
            <div className="flex items-center gap-8 sm:gap-12 shrink-0">
              {[
                { value: totalListings.toLocaleString(), label: 'Active listings' },
                { value: counts.companies.toLocaleString(), label: 'Businesses' },
                { value: '7', label: 'Categories' },
                { value: '100%', label: 'Free to list' },
              ].map((s) => (
                <div key={s.label} className="text-center shrink-0">
                  <p className="text-xl font-bold text-ink">{s.value}</p>
                  <p className="text-xs text-muted mt-0.5 whitespace-nowrap">{s.label}</p>
                </div>
              ))}
            </div>
            <Link href="/business/post" className="hidden sm:inline-flex items-center gap-2 bg-green hover:bg-green-dark text-white text-sm font-semibold rounded-full px-5 py-2.5 transition-colors shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              List your business
            </Link>
          </div>
        </div>
      </section>

      {/* SECTIONS */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-18 w-full">
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">Explore</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-ink">Everything the Ethiopian<br className="hidden sm:block"/> diaspora needs, in one place</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group relative bg-white border border-border rounded-2xl p-6 hover:border-green/40 hover:shadow-lg transition-all duration-200 overflow-hidden"
            >
              {/* hover bg accent */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-soft/0 to-green-soft/0 group-hover:from-green-soft/40 group-hover:to-green-soft/0 transition-all duration-300 rounded-2xl" />
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-green-soft text-green flex items-center justify-center mb-5"
                  dangerouslySetInnerHTML={{ __html: section.icon }} />
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-ink group-hover:text-green transition-colors">{section.label}</h3>
                  {counts[section.table] > 0 && (
                    <span className="text-xs font-semibold text-muted bg-section px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                      {counts[section.table]}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted leading-relaxed">{section.description}</p>
                <div className="flex items-center gap-1 mt-4 text-xs font-semibold text-green translate-x-0 group-hover:translate-x-1 transition-transform">
                  Browse
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-ink">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">Simple by design</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">How HagerLand works</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6 lg:gap-12">
            {[
              {
                n: '01',
                title: 'Search or browse',
                body: 'Find businesses, jobs, housing, or events by name, category, or city across the whole platform.',
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>',
              },
              {
                n: '02',
                title: 'Connect directly',
                body: 'Every listing shows full details. Click to reveal the contact email and reach out directly — no middleman.',
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
              },
              {
                n: '03',
                title: 'List for free',
                body: 'Submit your listing in under 2 minutes. Every submission is reviewed by our team before going live.',
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
              },
            ].map((step, i) => (
              <div key={step.n} className="relative">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center shrink-0"
                    dangerouslySetInnerHTML={{ __html: step.icon }} />
                  <span className="text-xs font-bold text-white/30 tracking-widest">{step.n}</span>
                </div>
                <h3 className="font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{step.body}</p>
                {i < 2 && (
                  <div className="hidden sm:block absolute top-6 -right-3 lg:-right-6 text-white/10">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RECENTLY ADDED */}
      {recentBusinesses && recentBusinesses.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 w-full">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-green mb-1">Just added</p>
              <h2 className="text-xl sm:text-2xl font-bold text-ink">Recently listed businesses</h2>
            </div>
            <Link href="/business" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-green hover:text-green-dark transition-colors">
              View all
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentBusinesses.map((business) => (
              <Link key={business.id} href={`/business/${business.id}`}
                className="group bg-white border border-border rounded-2xl p-5 hover:border-green/40 hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-green-soft flex items-center justify-center font-bold text-green">
                    {business.company_name.charAt(0)}
                  </div>
                  {business.is_verified && (
                    <span className="inline-flex items-center gap-1 bg-gold-soft text-gold text-xs font-semibold px-2.5 py-1 rounded-full">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      Verified
                    </span>
                  )}
                </div>
                <p className="font-bold text-ink text-sm mb-1 truncate group-hover:text-green transition-colors">{business.company_name}</p>
                <p className="text-xs text-muted truncate leading-relaxed">
                  {[business.sic_description, business.trading_address_city].filter(Boolean).join(' · ')}
                </p>
              </Link>
            ))}
          </div>
          <div className="sm:hidden mt-6 text-center">
            <Link href="/business" className="text-sm font-semibold text-green">View all businesses →</Link>
          </div>
        </section>
      )}

      {/* CTA BAND */}
      <section className="bg-green-soft border-t border-green/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-16 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-ink mb-2">Ready to join the directory?</h2>
            <p className="text-sm text-muted">List your business, job, or event. Free, always.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link href="/business/post" className="bg-green hover:bg-green-dark text-white font-semibold rounded-full px-7 py-3 transition-colors text-center">
              Get listed — free
            </Link>
            <Link href="/business" className="border border-ink/20 text-ink hover:border-ink/40 font-semibold rounded-full px-7 py-3 transition-colors text-center">
              Browse businesses
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
