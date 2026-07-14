import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { MobileNav } from '@/components/MobileNav'

export function SiteNav() {
  return (
    <nav className="border-b border-border bg-white/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Logo className="w-7 h-7" />
          <span className="font-bold text-lg text-ink tracking-tight">HagerLand</span>
        </Link>
        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-muted">
          <Link href="/business" className="hover:text-ink transition-colors">Businesses</Link>
          <Link href="/jobs" className="hover:text-ink transition-colors">Jobs</Link>
          <Link href="/housing" className="hover:text-ink transition-colors">Housing</Link>
          <Link href="/cars" className="hover:text-ink transition-colors">Cars</Link>
          <Link href="/tutors" className="hover:text-ink transition-colors">Tutors</Link>
          <Link href="/community" className="hover:text-ink transition-colors">Community</Link>
          <Link href="/events" className="hover:text-ink transition-colors">Events</Link>
        </div>
        {/* Desktop right */}
        <div className="hidden lg:flex items-center gap-3">
          <Link href="/search" className="text-muted hover:text-ink transition-colors p-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>
          </Link>
          <Link href="/business/post" className="bg-green hover:bg-green-dark text-white text-sm font-semibold rounded-full px-5 py-2 transition-colors">
            List your business
          </Link>
        </div>
        {/* Mobile right — logo already left, just show CTA small + hamburger */}
        <div className="flex lg:hidden items-center gap-2">
          <Link href="/business/post" className="bg-green hover:bg-green-dark text-white text-xs font-semibold rounded-full px-3.5 py-1.5 transition-colors">
            List
          </Link>
          <MobileNav />
        </div>
      </div>
    </nav>
  )
}
