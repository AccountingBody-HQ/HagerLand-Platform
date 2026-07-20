import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata = {
  title: 'Terms of use — HagerLand',
  description: 'The terms and conditions governing use of the HagerLand platform.',
}

const SECTIONS = [
  {
    title: 'Acceptance of terms',
    body: [
      'By accessing or using HagerLand you agree to be bound by these terms of use.',
      'If you do not agree with any part of these terms, please do not use the platform.',
      'These terms apply to all visitors, users, and anyone who submits a listing or contacts us through the platform.',
    ],
  },
  {
    title: 'What you may submit',
    body: [
      'Listings must be accurate, lawful, and genuinely connected to the Ethiopian or Eritrean community.',
      'You must have the right to submit the information you provide — do not submit details belonging to others without their permission.',
      'Listings must include valid contact details so that users can reach you directly.',
      'By submitting a listing you confirm that the information provided is accurate and that you have the authority to submit it.',
    ],
  },
  {
    title: 'What is not permitted',
    body: [
      'Listings that are misleading, fraudulent, or contain false information.',
      'Content that is offensive, discriminatory, or harmful to any individual or group.',
      'Spam, duplicate listings, or content submitted for commercial gain unrelated to the community.',
      'Any attempt to manipulate, scrape, or abuse the platform in a way that degrades the experience for others.',
      'Submitting another person\'s personal data without their knowledge or consent.',
    ],
  },
  {
    title: 'Review and removal',
    body: [
      'All submissions are reviewed by our team before going live. We reserve the right to decline any listing without providing a reason.',
      'We reserve the right to remove any listing at any time, at our sole discretion.',
      'Listings that are found to violate these terms after going live will be removed without notice.',
    ],
  },
  {
    title: 'Intellectual property',
    body: [
      'The HagerLand name, logo, and platform design are the property of HagerLand / AccountingBody HQ.',
      'By submitting a listing, you grant HagerLand a non-exclusive, royalty-free licence to display the submitted content on the platform for as long as the listing remains live.',
      'You retain ownership of any content you submit.',
    ],
  },
  {
    title: 'Limitation of liability',
    body: [
      'HagerLand is a directory platform. We do not endorse, verify the quality of, or take responsibility for any business, individual, or service listed.',
      'We are not liable for any loss or damage arising from your use of the platform or reliance on any listing.',
      'All interactions between users and listing owners are the sole responsibility of the parties involved.',
      'To the fullest extent permitted by law, HagerLand\'s total liability to you for any claim arising out of or in connection with these terms shall not exceed £100.',
    ],
  },
  {
    title: 'Governing law and jurisdiction',
    body: [
      'These terms are governed by and construed in accordance with the laws of England and Wales.',
      'Any dispute arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.',
      'If you are accessing HagerLand from outside the United Kingdom, you are responsible for compliance with any local laws that apply to you.',
    ],
  },
  {
    title: 'Changes to these terms',
    body: [
      'We may update these terms from time to time. The date at the top of this page will reflect the most recent revision.',
      'Continued use of HagerLand after any update constitutes acceptance of the revised terms.',
      'If you have questions about these terms, contact us at team@hagerland.com.',
    ],
  },
]

export default function TermsPage() {
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
              Terms of use
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
                <p className="text-xs text-muted mb-3">We are happy to clarify anything in these terms.</p>
                <Link href="/contact" className="text-xs font-semibold text-green hover:underline">Get in touch →</Link>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-10">
              <p className="text-muted leading-relaxed">
                These terms govern your use of HagerLand. Please read them carefully. By using the platform you agree to these terms in full.
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
              <h3 className="text-xl font-bold text-ink mb-1">Have a question about these terms?</h3>
              <p className="text-muted text-sm">We are happy to help — reach out any time.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
              <Link href="/contact" className="w-44 text-center bg-green hover:bg-green-dark text-white font-bold rounded-full py-3 transition-colors text-sm">
                Contact us
              </Link>
              <Link href="/privacy" className="w-44 text-center border border-border text-ink hover:border-ink font-semibold rounded-full py-3 transition-colors text-sm">
                Privacy policy
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
