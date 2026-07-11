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
          <span>Events</span>
          <Link href="/jobs">Jobs</Link>
          <Link href="/housing">Housing</Link>
          <Link href="/cars">Cars</Link>
          <Link href="/tutors">Tutors</Link>
          <span>Community</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
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
