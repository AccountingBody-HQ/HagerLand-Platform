import Link from 'next/link'
import { Logo } from '@/components/Logo'

const browseLinks = [
  { href: '/business', label: 'Business directory' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/housing', label: 'Housing' },
  { href: '/money', label: 'Money' },
  { href: '/cars', label: 'Cars & taxi' },
  { href: '/tutors', label: 'Tutors' },
  { href: '/community', label: 'Community' },
  { href: '/events', label: 'Events' },
]

const companyLinks = [
  { href: '/about', label: 'About HagerLand' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/contact', label: 'Contact us' },
  { href: '/privacy', label: 'Privacy policy' },
  { href: '/terms', label: 'Terms of use' },
]

const listLinks = [
  { href: '/business/post', label: 'List your business' },
  { href: '/jobs/post', label: 'Post a job' },
  { href: '/housing/post', label: 'List a property' },
  { href: '/money/post', label: 'List a financial service' },
  { href: '/events/post', label: 'Post an event' },
  { href: '/tutors/post', label: 'List as a tutor' },
  { href: '/community/post', label: 'List an organisation' },
]

const socialLinks = [
  { label: 'Facebook', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>` },
  { label: 'Instagram', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>` },
  { label: 'X', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>` },
  { label: 'LinkedIn', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>` },
  { label: 'YouTube', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>` },
]

export function SiteFooter() {
  return (
    <footer className="bg-ink text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-5">
              <Logo className="w-8 h-8" />
              <span className="font-bold text-xl text-white tracking-tight">HagerLand</span>
            </Link>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs mb-4">
              The global network for Ethiopian business, community, and culture. Supporting the diaspora wherever in the world you are.
            </p>
            <p className="text-white/25 text-xs mb-8">ሃገር — <span className="italic text-white/35">homeland</span></p>
            <div className="flex items-center gap-2.5">
              {socialLinks.map((s) => (
                <Link key={s.label} href="/contact" aria-label={s.label}
                  className="w-9 h-9 rounded-full bg-white/8 hover:bg-green text-white/50 hover:text-white flex items-center justify-center transition-all duration-200"
                  dangerouslySetInnerHTML={{ __html: s.icon }} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-5">Browse</h3>
            <ul className="space-y-3">
              {browseLinks.map((l) => (
                <li key={l.href}><Link href={l.href} className="text-sm text-white/55 hover:text-white transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-5">List for free</h3>
            <ul className="space-y-3">
              {listLinks.map((l) => (
                <li key={l.href}><Link href={l.href} className="text-sm text-white/55 hover:text-white transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-5">Company</h3>
            <ul className="space-y-3">
              {companyLinks.map((l) => (
                <li key={l.href}><Link href={l.href} className="text-sm text-white/55 hover:text-white transition-colors">{l.label}</Link></li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-2">
              <Link href="/business/post"
                className="inline-flex items-center gap-2 bg-green hover:bg-green-dark text-white text-xs font-bold rounded-full px-4 py-2 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                List your business
              </Link>
              <Link href="/edit-link"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-full px-4 py-2 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit your listing
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* Bottom bar — no divider line, just padding */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-white/20">© {new Date().getFullYear()} HagerLand. Built for the Ethiopian diaspora, worldwide.</p>
        <div className="flex items-center gap-5">
          <Link href="/privacy" className="text-xs text-white/20 hover:text-white/50 transition-colors">Privacy</Link>
          <Link href="/terms" className="text-xs text-white/20 hover:text-white/50 transition-colors">Terms</Link>
          <Link href="/contact" className="text-xs text-white/20 hover:text-white/50 transition-colors">Contact</Link>
        </div>
      </div>
    </footer>
  )
}
