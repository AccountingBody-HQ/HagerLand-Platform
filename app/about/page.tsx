import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata = {
  title: 'About — HagerLand · Where Ethiopia Does Business',
  description: "HagerLand is Ethiopia's business and financial platform. Learn about our mission, our platform, and why we exist.",
}

const PILLARS = [
  { href: '/made-in-ethiopia', label: 'Made in Ethiopia', description: 'Verified products grown, made, and crafted in Ethiopia.' },
  { href: '/birrbank', label: 'BirrBank', description: 'Ethiopian financial intelligence: rates, markets, institutions, and investment data.' },
  { href: '/housing', label: 'Property', description: 'Ethiopian real estate listings and market intelligence.' },
  { href: '/diaspora', label: 'Diaspora Businesses', description: 'The Ethiopian economy abroad: businesses, jobs, housing, money, cars, tutors, and delivery.' },
  { href: '/community', label: 'Diaspora Network', description: 'The institutional layer: associations, churches, charities, and civic organisations.' },
  { href: '/events', label: 'Events', description: 'The Ethiopian business calendar: trade missions, summits, and commercial events.' },
]

const STATS = [
  { stat: '6', label: 'Pillars', body: 'Made in Ethiopia, BirrBank, Property, Diaspora Businesses, Diaspora Network, and Events.' },
  { stat: '100%', label: 'Human-reviewed', body: 'Every submission checked by our team before going live.' },
  { stat: 'Free', label: 'Always free to list', body: 'No fees, no subscriptions — built to last.' },
  { stat: 'Global', label: 'Worldwide', body: 'Built for Ethiopia. Open to the world.' },
]

const VALUES = [
  {
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    title: 'Trust above all',
    body: 'Every listing is reviewed by a real person before it goes live. No bots, no auto-approvals. If it is on HagerLand, it has been checked.',
  },
  {
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`,
    title: 'Built for Ethiopia, open to the world',
    body: 'HagerLand exists to represent the Ethiopian economy accurately and authoritatively — to anyone, anywhere, with an interest in it.',
  },
  {
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
    title: 'Open to everyone',
    body: 'Investors, business owners, the diaspora, or anyone with an interest in Ethiopia — regardless of background, region, or language. The platform is built to unite.',
  },
  {
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
    title: 'Free, forever',
    body: 'Listing on HagerLand is free and will remain free. The platform exists to lower barriers for Ethiopian businesses — not to monetise them.',
  },
]

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />

      {/* HERO BAND */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)'}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2.5 text-white/50 text-[11px] font-bold tracking-[0.18em] uppercase mb-6">
              ሃገር
              <span className="w-1 h-1 rounded-full bg-white/30" />
              Our story
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">
              About HagerLand
            </h1>
            <p className="text-white/65 text-lg sm:text-xl leading-relaxed">
              HagerLand is Ethiopia&apos;s business and financial platform — the first place anyone goes when they want to understand, engage with, or participate in the Ethiopian economy. From the financial markets of Addis Ababa to the businesses of the diaspora, from products made in Ethiopia to opportunities across the world, HagerLand brings the entire Ethiopian economy into one authoritative, independent platform.
            </p>
          </div>
        </div>
      </section>

      {/* MISSION */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-green mb-4">The purpose</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight mb-6">Our Mission</h2>
            <p className="text-muted leading-relaxed text-lg">
              To be the economic institution that Ethiopia and its people use to connect, transact, and grow. Not a tool. Not a directory. An institution — trusted, authoritative, and built to last.
            </p>
          </div>
        </div>
      </section>

      {/* WHAT HAGERLAND IS */}
      <section className="bg-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="mb-12 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-green mb-4">The platform</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight mb-6">What HagerLand Is</h2>
            <p className="text-muted leading-relaxed text-lg">
              HagerLand is six pillars working as one platform.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PILLARS.map((p) => (
              <Link key={p.href} href={p.href}
                className="group bg-white border border-border rounded-2xl p-6 hover:border-green/50 hover:shadow-lg transition-all duration-200 flex flex-col">
                <h3 className="font-bold text-ink text-base mb-2 group-hover:text-green transition-colors">{p.label}</h3>
                <p className="text-sm text-muted leading-relaxed">{p.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* WHO HAGERLAND IS FOR */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-green mb-4">The audience</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight mb-6">Who HagerLand Is For</h2>
            <p className="text-muted leading-relaxed text-lg">
              HagerLand is built for Ethiopia and open to the world. Whether you are a member of the diaspora, an investor researching the Ethiopian market, a business owner wanting to reach your community, or anyone with an interest in the Ethiopian economy — HagerLand is your platform.
            </p>
          </div>
        </div>
      </section>

      {/* BUILT ON TRUST + STATS */}
      <section className="bg-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="mb-12 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-widest text-green mb-4">The standard</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight mb-6">Built on Trust</h2>
            <p className="text-muted leading-relaxed text-lg">
              Every listing on HagerLand is human-reviewed. Every business is verified before it goes live. The Made in Ethiopia badge is awarded only to products physically manufactured, grown, or produced in Ethiopia. We do not cut corners on verification because our authority depends on it.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {STATS.map((item) => (
              <div key={item.label} className="bg-white border border-border rounded-2xl p-7">
                <p className="text-3xl font-bold text-green mb-1" translate="no">{item.stat}</p>
                <p className="text-sm font-bold text-ink mb-3">{item.label}</p>
                <p className="text-sm text-muted leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">What we stand for</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight">Our values</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {VALUES.map((v) => (
              <div key={v.title} className="flex gap-5 p-7 border border-border rounded-2xl hover:border-green/40 hover:shadow-md transition-all">
                <div className="w-11 h-11 rounded-xl bg-green-soft text-green flex items-center justify-center shrink-0"
                  dangerouslySetInnerHTML={{ __html: v.icon }} />
                <div>
                  <h3 className="font-bold text-ink mb-2">{v.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{v.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-green-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="bg-white border border-green/20 rounded-2xl px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-ink mb-1">Ready to get listed?</h3>
              <p className="text-muted text-sm">Join the platform. Free for everyone, always.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
              <Link href="/business/post" className="text-center bg-green hover:bg-green-dark text-white font-bold rounded-full py-3 px-6 transition-colors text-sm" translate="no">
                Get listed — free
              </Link>
              <Link href="/business" className="w-44 text-center border border-border text-ink hover:border-ink font-semibold rounded-full py-3 transition-colors text-sm">
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
