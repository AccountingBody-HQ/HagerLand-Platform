import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { MobileNav } from '@/components/MobileNav'

export function SiteNav() {
  return (
    <nav className="border-b border-border relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="w-7 h-7 sm:w-8 sm:h-8" />
          <span className="font-bold text-lg sm:text-xl text-ink">HagerLand</span>
        </Link>
        <div className="hidden lg:flex items-center gap-7 text-sm font-medium text-ink">
          <Link href="/">Directory</Link>
          <Link href="/events">Events</Link>
          <Link href="/jobs">Jobs</Link>
          <Link href="/housing">Housing</Link>
          <Link href="/cars">Cars</Link>
          <Link href="/tutors">Tutors</Link>
          <Link href="/community">Community</Link>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/search" aria-label="Search" className="text-ink">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
          </Link>
          <span className="hidden sm:inline text-sm font-medium text-ink">Log in</span>
          <button className="bg-green hover:bg-green-dark text-white text-sm font-semibold rounded-full px-4 sm:px-5 py-2 sm:py-2.5 transition-colors">
            List your business
          </button>
          <MobileNav />
        </div>
      </div>
    </nav>
  )
}
