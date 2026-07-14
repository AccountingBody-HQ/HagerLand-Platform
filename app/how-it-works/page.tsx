import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata = {
  title: 'How HagerLand works — Free verified Ethiopian directory',
  description: 'Learn how HagerLand works — search, list, claim, and connect with the Ethiopian diaspora community.',
}

const STEPS = [
  {
    n: '01',
    title: 'Search or browse',
    body: 'Use the search bar to find businesses, jobs, housing, or events by name, category, or city. Every section has filter pills to narrow results instantly. All 7 sections are fully searchable from a single query.',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>`,
  },
  {
    n: '02',
    title: 'Connect directly',
    body: 'Click any listing to see full details. Click the enquire button to reveal the contact email address — it opens a pre-filled message so you can reach the listing owner directly. No middleman, no fees, no sign-up required.',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  },
  {
    n: '03',
    title: 'List for free',
    body: 'Submitting a listing takes under two minutes. Fill in the form, submit, and our team will review it within 48 hours. Once approved it goes live immediately. Listing is completely free and will always remain free.',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14M5 12h14"/></svg>`,
  },
  {
    n: '04',
    title: 'Claim your listing',
    body: 'If your business is already in our directory, you can claim it. Submit your name and email, verify via a link we send you, and our admin team will review the claim. Approved claims earn a gold verified badge on your listing.',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  },
]

const FAQ = [
  {
    q: 'Is HagerLand really free?',
    a: 'Yes — completely free. Listing your business, job, housing, or event costs nothing. There are no premium tiers, no featured placement fees, and no subscriptions. The platform is funded by the community, for the community.',
  },
  {
    q: 'How long does review take?',
    a: 'We aim to review every submission within 48 hours. In practice most listings are reviewed the same day. You will receive an email confirmation when your listing goes live.',
  },
  {
    q: 'What gets rejected?',
    a: 'Listings that are not connected to the Ethiopian community, that contain misleading information, or that violate our terms of use will be declined. Our team reviews every submission individually.',
  },
  {
    q: 'What is the gold verified badge?',
    a: 'The gold Verified badge appears on business listings that have been claimed and approved by our admin team. It signals that the business owner has confirmed the listing details are accurate. Verification is always done by a human — never automated.',
  },
  {
    q: 'Can I edit my listing after it goes live?',
    a: 'Claim your business listing to get the ability to keep your details up to date. For other sections, contact us at team@hagerland.com and we will update it for you.',
  },
  {
    q: 'Is HagerLand only for UK businesses?',
    a: 'No — HagerLand is global. We welcome Ethiopian-owned businesses, community groups, and listings from anywhere in the world. Our current focus is the UK diaspora but the platform is open to all.',
  },
]

const SECTIONS = [
  { href: '/business/post', label: 'Business', action: 'List your business' },
  { href: '/jobs/post', label: 'Job', action: 'Post a job' },
  { href: '/housing/post', label: 'Housing', action: 'Post a listing' },
  { href: '/events/post', label: 'Event', action: 'Post an event' },
  { href: '/tutors/post', label: 'Tutor', action: 'Offer tutoring' },
  { href: '/community/post', label: 'Organisation', action: 'List an organisation' },
]

export default function HowItWorksPage() {
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
              How it works
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">
              Simple. Trusted.<br />Community-first.
            </h1>
            <p className="text-white/65 text-lg sm:text-xl leading-relaxed">
              Everything on HagerLand is free, human-reviewed, and built to connect the Ethiopian diaspora directly.
            </p>
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">Step by step</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight">How HagerLand works</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {STEPS.map((step) => (
              <div key={step.n} className="flex gap-5 p-7 border border-border rounded-2xl hover:border-green/40 hover:shadow-md transition-all">
                <div className="w-11 h-11 rounded-xl bg-green-soft text-green flex items-center justify-center shrink-0"
                  dangerouslySetInnerHTML={{ __html: step.icon }} />
                <div>
                  <p className="text-xs font-bold text-green mb-1">{step.n}</p>
                  <h3 className="font-bold text-ink mb-2">{step.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LIST ON HAGERLAND */}
      <section className="bg-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-green mb-4">Get listed</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight mb-6">List anything in under two minutes</h2>
              <p className="text-muted leading-relaxed mb-8">Every section has its own submission form. Fill in the details, submit, and our team will review it. Once approved your listing goes live — and stays free forever.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/business/post" className="flex-1 text-center bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-3 transition-colors text-sm">
                  List your business
                </Link>
                <Link href="/business" className="flex-1 text-center border border-border text-ink font-semibold rounded-full px-6 py-3 hover:border-ink transition-colors text-sm">
                  Browse directory →
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {SECTIONS.map((s) => (
                <Link key={s.href} href={s.href}
                  className="group flex items-center gap-3 p-4 bg-white border border-border rounded-2xl hover:border-green/50 hover:shadow-md transition-all">
                  <div className="w-2 h-2 rounded-full bg-green shrink-0" />
                  <span className="text-sm font-semibold text-ink group-hover:text-green transition-colors">{s.action}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">FAQ</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight">Common questions</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5 max-w-5xl">
            {FAQ.map((item) => (
              <div key={item.q} className="p-7 border border-border rounded-2xl hover:border-green/40 transition-all">
                <h3 className="font-bold text-ink mb-3">{item.q}</h3>
                <p className="text-sm text-muted leading-relaxed">{item.a}</p>
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
              <h3 className="text-xl font-bold text-ink mb-1">Ready to get started?</h3>
              <p className="text-muted text-sm">Search the directory or list your business — free, always.</p>
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