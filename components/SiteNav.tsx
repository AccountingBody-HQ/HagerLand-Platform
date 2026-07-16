'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/Logo'
import { MobileNav } from '@/components/MobileNav'

const SECTIONS = [
  { href: '/business', label: 'Businesses', desc: 'Find verified businesses' },
  { href: '/jobs', label: 'Jobs', desc: 'Work in the community' },
  { href: '/housing', label: 'Housing', desc: 'Rooms and rentals' },
  { href: '/money', label: 'Money', desc: 'Transfers and finance' },
  { href: '/cars', label: 'Cars', desc: 'Cars and taxi services' },
  { href: '/tutors', label: 'Tutors', desc: 'Teaching and mentoring' },
  { href: '/community', label: 'Community', desc: 'Organisations and groups' },
  { href: '/events', label: 'Events', desc: 'Celebrations and networking' },
]

export function SiteNav() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => { setOpen(false) }, [pathname])

  const activeSection = SECTIONS.find(s => pathname.startsWith(s.href))

  return (
    <nav className="bg-white border-b border-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Logo className="w-7 h-7" />
          <span className="font-bold text-lg text-ink tracking-tight">HagerLand</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-1 flex-1">
          {/* Directory dropdown */}
          <div ref={ref} className="relative">
            <button onClick={() => setOpen(!open)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${open || activeSection ? 'text-green bg-green-soft' : 'text-muted hover:text-ink hover:bg-section'}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 3v18M2 9h20"/></svg>
              Directory
              {activeSection && <span className="text-xs bg-green text-white px-1.5 py-0.5 rounded-full font-bold">{activeSection.label}</span>}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${open ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {open && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="p-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted px-3 py-2">Browse the directory</p>
                  <div className="grid grid-cols-2 gap-1">
                    {SECTIONS.map((s) => (
                      <Link key={s.href} href={s.href}
                        className={`flex flex-col px-3 py-2.5 rounded-xl transition-colors ${pathname.startsWith(s.href) ? 'bg-green-soft text-green' : 'hover:bg-section text-ink'}`}>
                        <span className="text-sm font-semibold">{s.label}</span>
                        <span className="text-xs text-muted mt-0.5">{s.desc}</span>
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="border-t border-border p-2">
                  <Link href="/business/post" className="flex items-center justify-center w-full bg-green hover:bg-green-dark text-white font-bold rounded-xl py-2.5 text-sm transition-colors">
                    List your business — free
                  </Link>
                </div>
              </div>
            )}
          </div>
          {/* Quick links */}
          <Link href="/business" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/business' ? 'text-green' : 'text-muted hover:text-ink hover:bg-section'}`}>Businesses</Link>
          <Link href="/jobs" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/jobs' ? 'text-green' : 'text-muted hover:text-ink hover:bg-section'}`}>Jobs</Link>
          <Link href="/money" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/money' ? 'text-green' : 'text-muted hover:text-ink hover:bg-section'}`}>Money</Link>
          <Link href="/events" className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === '/events' ? 'text-green' : 'text-muted hover:text-ink hover:bg-section'}`}>Events</Link>
        </div>

        {/* Right actions */}
        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <Link href="/search" className="text-muted hover:text-ink transition-colors p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>
          </Link>
          <Link href="/business/post" className="bg-green hover:bg-green-dark text-white text-sm font-semibold rounded-full px-5 py-2 transition-colors">
            List your business
          </Link>
        </div>

        {/* Mobile */}
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