import Link from 'next/link'
import { Logo } from '@/components/Logo'

const browseLinks = [
  { href: '/business', label: 'Business directory' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/housing', label: 'Housing' },
  { href: '/cars', label: 'Cars & taxi' },
  { href: '/tutors', label: 'Tutors' },
  { href: '/community', label: 'Community' },
  { href: '/events', label: 'Events' },
]

const aboutLinks = [
  { href: '/about', label: 'About HagerLand' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/business/post', label: 'List your business' },
  { href: '/contact', label: 'Contact us' },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-section mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Logo className="w-7 h-7" />
              <span className="font-bold text-lg text-ink">HagerLand</span>
            </Link>
            <p className="text-sm text-muted leading-relaxed max-w-xs">
              The global network for Ethiopian business, community, and culture.
              Supporting the diaspora wherever in the world you are.
            </p>
            <p className="text-sm text-muted mt-4">
              ሃገር — <span className="italic">homeland</span>
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">
              Browse
            </h3>
            <ul className="space-y-2.5">
              {browseLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink hover:text-green transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">
              About
            </h3>
            <ul className="space-y-2.5">
              {aboutLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink hover:text-green transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} HagerLand. Built for the Ethiopian diaspora, worldwide.
          </p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="text-xs text-muted hover:text-ink transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-xs text-muted hover:text-ink transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
