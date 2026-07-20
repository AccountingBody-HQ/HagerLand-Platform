import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata = {
  title: 'Privacy policy — HagerLand',
  description: 'How HagerLand collects, uses, and protects your information.',
}

const SECTIONS = [
  {
    title: 'Who we are',
    body: [
      'HagerLand is a free, verified community directory platform serving the Ethiopian and Eritrean diaspora worldwide.',
      'HagerLand is operated by AccountingBody HQ, based in the United Kingdom.',
      'For any privacy-related questions, contact us at team@hagerland.com.',
    ],
  },
  {
    title: 'What we collect',
    body: [
      'When you submit a listing, we collect the information you provide — such as your name, email address, phone number, and business or listing details.',
      'When you use the contact form, we collect your name, email address, and the content of your message.',
      'We use Cloudflare Turnstile on submission forms to protect against spam and automated abuse. Turnstile may collect technical data such as your IP address and browser information to verify you are human. See the Cloudflare privacy policy at cloudflare.com/privacypolicy for details.',
      'We do not require you to create an account to browse the directory.',
    ],
  },
  {
    title: 'Legal basis for processing',
    body: [
      'We process your personal data on the following legal bases under UK GDPR:',
      'Legitimate interests — to operate the directory, review submissions, prevent spam and abuse, and respond to enquiries.',
      'Contract performance — where you have submitted a listing, processing your data is necessary to publish and manage that listing.',
      'Legal obligation — we may process or retain data where required by applicable law.',
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
    title: 'How long we keep your data',
    body: [
      'Active listings and associated personal data are retained for as long as your listing remains on the platform.',
      'If you request removal of your listing, we will delete your personal data within 14 days of receiving the request.',
      'Unverified submissions (where the email link was not clicked) are automatically deleted after 24 hours.',
      'Contact form messages are retained for up to 12 months and then deleted.',
    ],
  },
  {
    title: 'How we protect your information',
    body: [
      'HagerLand is hosted on Vercel and uses Supabase for data storage — both are industry-standard, security-focused platforms.',
      'Email addresses on listing pages are hidden by default and only revealed when a user actively clicks to enquire.',
      'We do not store payment information. HagerLand is free and does not process any payments.',
      'Access to the admin area is protected by password, two-factor authentication, and session tokens.',
    ],
  },
  {
    title: 'Third parties and international transfers',
    body: [
      'We do not sell your data or share it with third parties for commercial purposes.',
      'We use Resend (resend.com) to send transactional emails. Your email address is passed to Resend solely for this purpose.',
      'We use Cloudflare Turnstile for spam protection on submission forms.',
      'We use Supabase for data storage and Vercel for hosting. These services may process data on servers located outside the United Kingdom or European Economic Area. Both providers implement appropriate safeguards including standard contractual clauses.',
      'We may share information where required by law or a competent authority.',
    ],
  },
  {
    title: 'Your rights',
    body: [
      'Under UK GDPR you have the right to: access the personal data we hold about you; request correction of inaccurate data; request erasure of your data; object to or restrict our processing of your data; and data portability.',
      'To exercise any of these rights, email us at team@hagerland.com with the subject line "Data request".',
      'We will respond to all requests within 30 days.',
      'You also have the right to lodge a complaint with the UK Information Commissioner\'s Office (ICO) at ico.org.uk if you believe we have not handled your data lawfully.',
    ],
  },
  {
    title: 'Cookies',
    body: [
      'HagerLand uses a single session cookie for the admin area only. No tracking or advertising cookies are used.',
      'We do not use Google Analytics or any third-party analytics tools.',
      'Cloudflare Turnstile may set cookies or use browser storage as part of its spam protection check.',
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

      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: "linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)"}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "28px 28px"}} />
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

      <section className="bg-white flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="grid lg:grid-cols-3 gap-12 lg:gap-16">
            <div className="hidden lg:block">
              <p className="text-xs font-bold uppercase tracking-widest text-green mb-4">Contents</p>
              <ul className="space-y-2">
                {SECTIONS.map((s) => (
                  <li key={s.title}>
                    <a href={`#${s.title.toLowerCase().replace(/\s+/g, "-")}`}
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

            <div className="lg:col-span-2 space-y-10">
              <p className="text-muted leading-relaxed">
                This policy explains how HagerLand collects, uses, and protects information submitted through the platform. We keep things simple — we collect only what we need and never sell your data.
              </p>
              {SECTIONS.map((s) => (
                <div key={s.title} id={s.title.toLowerCase().replace(/\s+/g, "-")}>
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
