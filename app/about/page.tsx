import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata = {
  title: 'About HagerLand — The global network for Ethiopian business',
  description: 'HagerLand is the free, verified directory of verified community businesses, jobs, housing, events and community worldwide.',
}

const STATS = [
  { stat: '7', label: 'Categories', body: 'Businesses, jobs, housing, cars, tutors, community, and events.' },
  { stat: 'Free', label: 'Always free', body: 'No fees, no subscriptions — community first, always.' },
  { stat: '100%', label: 'Human-reviewed', body: 'Every submission checked by our team before going live.' },
  { stat: 'Global', label: 'Diaspora-wide', body: 'Serving the Ethiopian community wherever in the world you are.' },
]

const VALUES = [
  {
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    title: 'Trust above all',
    body: 'Every listing is reviewed by a real person before it goes live. No bots, no auto-approvals. If it is on HagerLand, it has been checked.',
  },
  {
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
    title: 'Community first',
    body: 'HagerLand is built by and for the Ethiopian diaspora. The platform exists to serve the community — not to extract value from it.',
  },
  {
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`,
    title: 'Open to everyone',
    body: 'HagerLand welcomes every member of the Ethiopian community — regardless of background, region, or language. The platform is built to unite.',
  },
  {
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
    title: 'Free, forever',
    body: 'Listing on HagerLand is free and will remain free. The directory exists to lower barriers for Ethiopian businesses and community members — not to monetise them.',
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
              Built for the<br />Ethiopian diaspora.
            </h1>
            <p className="text-white/65 text-lg sm:text-xl leading-relaxed">
              HagerLand is the free, verified network connecting verified community businesses, workers, and communities across the world.
            </p>
          </div>
        </div>
      </section>

      {/* STORY SECTION */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-green mb-4">The name</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight mb-6">ሃገር — Homeland</h2>
              <p className="text-muted leading-relaxed mb-4">
                The name HagerLand comes from ሃገር (hager) — the Amharic word for homeland. It carries the weight of belonging, of connection, of the place you carry with you wherever you go.
              </p>
              <p className="text-muted leading-relaxed mb-4">
                For the Ethiopian diaspora — spread across the UK, Europe, North America, and beyond — finding trusted Ethiopian businesses, jobs, or community groups has always meant relying on word of mouth. HagerLand exists to change that.
              </p>
              <p className="text-muted leading-relaxed">
                We built a single, searchable, verified directory that works for the whole community — whether you are looking for an Ethiopian restaurant in London, a job within the community, or a church group in your city.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-green mb-4">Our mission</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight mb-6">Connecting the community, worldwide</h2>
              <p className="text-muted leading-relaxed mb-4">
                HagerLand is built for every member of the Ethiopian community — wherever they are in the world and whatever their background. Our goal is simple: make it easier for Ethiopians to find, support, and connect with each other.
              </p>
              <p className="text-muted leading-relaxed mb-4">
                Every listing on the platform is free to submit and free to browse. We believe that a stronger, better-connected diaspora benefits everyone.
              </p>
              <p className="text-muted leading-relaxed">
                If you are from Ethiopia or of Ethiopian heritage, this platform is yours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <section className="bg-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {STATS.map((item) => (
              <div key={item.label} className="bg-white border border-border rounded-2xl p-7">
                <p className="text-3xl font-bold text-green mb-1">{item.stat}</p>
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
              <p className="text-muted text-sm">Join the directory. Free for everyone, always.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
              <Link href="/business/post" className="w-44 text-center bg-green hover:bg-green-dark text-white font-bold rounded-full py-3 transition-colors text-sm">
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