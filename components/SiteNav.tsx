import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { MobileNav } from '@/components/MobileNav'

export function SiteNav() {
  return (
    <nav className="bg-white border-b border-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Logo className="w-7 h-7" />
          <span className="font-bold text-base text-ink tracking-tight">HagerLand</span>
        </Link>
        <div className="hidden lg:flex items-center gap-1 flex-1 justify-center">
          <Link href="/business" className="px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-muted hover:text-ink hover:bg-section transition-colors">Businesses</Link>
          <Link href="/jobs" className="px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-muted hover:text-ink hover:bg-section transition-colors">Jobs</Link>
          <Link href="/housing" className="px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-muted hover:text-ink hover:bg-section transition-colors">Housing</Link>
          <Link href="/money" className="px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-muted hover:text-ink hover:bg-section transition-colors">Money</Link>
          <Link href="/cars" className="px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-muted hover:text-ink hover:bg-section transition-colors">Cars</Link>
          <Link href="/tutors" className="px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-muted hover:text-ink hover:bg-section transition-colors">Tutors</Link>
          <Link href="/community" className="px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-muted hover:text-ink hover:bg-section transition-colors">Community</Link>
          <Link href="/events" className="px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-muted hover:text-ink hover:bg-section transition-colors">Events</Link>
        </div>
        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <Link href="/search" className="text-muted hover:text-ink transition-colors p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>
          </Link>
          <Link href="/business/post" className="bg-green hover:bg-green-dark text-white text-[13px] font-semibold rounded-full px-4 py-2 transition-colors whitespace-nowrap">
            List your business
          </Link>
        </div>
        <div className="flex lg:hidden items-center gap-3">
          <Link href="/search" className="text-muted hover:text-ink p-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>
          </Link>
          <MobileNav />
        </div>
      </div>
    </nav>
  )
}