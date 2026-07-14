import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata = {
  title: 'Privacy policy — HagerLand',
  description: 'How HagerLand collects, uses, and protects your information.',
}

const SECTIONS = [
  {
    title: 'What we collect',
    body: [
      'When you submit a listing, we collect the information you provide in the form — such as your name, email address, phone number, and business or listing details.',
      'When you use the contact form, we collect your name, email address, and the content of your message.',
      'We do not require you to create an account to browse the directory.',
    ],
  },
  {
    title: 'How we use your information',
    body: [
      'We use your information to review and publish your listing, and to respond to your enquiries.',
      'Approved listings are published publicly on the platform. This includes business name, description, location, and contact details you provide.',
      'We do not use your information for marketing purposes without your consent.',
    ],
  },
  {
    title: 'How we protect your information',
    body: [
      'HagerLand is hosted on Vercel and uses Supabase for data storage — both are industry-standard, security-focused platforms.',
      'Email addresses on listing pages are hidden by default and only revealed when a user actively clicks to enquire.',
      'We do not store payment information. HagerLand is free and does not process any payments.',
    ],
  },
  {
    title: 'Third parties',
    body: [
      'We do not sell your data or share it with third parties for commercial purposes.',
      'We use Resend to send transactional emails (listing confirmations, contact form replies). Your email address is passed to Resend solely for this purpose.',
      'We may share information where required by law.',
    ],
  },
  {
    title: 'Your rights',
    body: [
      'You may request that your listing or personal data be removed from HagerLand at any time.',
      'To request removal, email us at team@hagerland.com with the subject line \'Data removal request\'.',
      'We will action all removal requests within 14 days.',
    ],
  },
  {
    title: 'Cookies',
    body: [
      'HagerLand uses a single session cookie for the admin area only. No tracking or advertising cookies are used.',
      'We do not use Google Analytics or any third-party analytics tools.',
    ],
  },
  {
    title: 'Changes to this policy',
    body: [
      'We may update this policy from time to time. The date at the top of the page will reflect the most recent revision.',
      'Continued use of HagerLand after a policy update constitutes acceptance of the revised policy.',
    ],
  },
]

export default function PrivacyPage() {
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
              Legal
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-[1.05] tracking-tight mb-6">
              Privacy policy
            </h1>
            <p className="text-white/65 text-lg leading-relaxed">
              Last updated: July 2026
            </p>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="bg-white flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid lg:grid-cols-3 gap-12 lg:gap-16">

            {/* NAV */}
            <div className="hidden lg:block">
              <p className="text-xs font-bold uppercase tracking-widest text-green mb-4">Contents</p>
              <ul className="space-y-2">
                {SECTIONS.map((s) => (
                  <li key={s.title}>
                    <a href={`#${s.title.toLowerCase().replace(/\s+/g, '-')}`}
                      className="text-sm text-muted hover:text-green transition-colors">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-10 p-5 border border-border rounded-2xl">
                <p className="text-xs font-bold text-ink mb-1">Questions?</p>
                <p className="text-xs text-muted mb-3">Contact us about anything privacy-related.</p>
                <Link href="/contact" className="text-xs font-semibold text-green hover:underline">Get in touch →</Link>
              </div>
            </div>

            {/* BODY */}
            <div className="lg:col-span-2 space-y-10">
              <p className="text-muted leading-relaxed">
                This policy explains how HagerLand collects, uses, and protects information submitted through the platform. We keep things simple — we collect only what we need and never sell your data.
              </p>
              {SECTIONS.map((s) => (
                <div key={s.title} id={s.title.toLowerCase().replace(/\s+/g, '-')}>
                  <h2 className="text-xl font-bold text-ink mb-4">{s.title}</h2>
                  <ul className="space-y-3">
                    {s.body.map((para, i) => (
                      <li key={i} className="flex gap-3 text-sm text-muted leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-green mt-2 shrink-0" />
                        {para}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-green-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="bg-white border border-green/20 rounded-2xl px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-ink mb-1">Have a question about your data?</h3>
              <p className="text-muted text-sm">We are happy to help — reach out any time.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
              <Link href="/contact" className="w-44 text-center bg-green hover:bg-green-dark text-white font-bold rounded-full py-3 transition-colors text-sm">
                Contact us
              </Link>
              <Link href="/terms" className="w-44 text-center border border-border text-ink hover:border-ink font-semibold rounded-full py-3 transition-colors text-sm">
                Terms of use
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}