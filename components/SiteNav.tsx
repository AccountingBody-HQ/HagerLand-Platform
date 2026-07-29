'use client'
import Link from 'next/link'
import { useState, useRef } from 'react'
import { Logo } from '@/components/Logo'
import { MobileNav } from '@/components/MobileNav'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { usePathname } from 'next/navigation'

const birrbankCol1 = [
  { href: '/birrbank/banking', label: 'Banking', desc: 'Savings rates, FX, loans and money transfer', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>' },
  { href: '/birrbank/institutions', label: 'Institutions', desc: 'NBE-licensed banks and financial institutions', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 21h18M5 21V7l8-4v18M13 21V11l6-3v13"/></svg>' },
  { href: '/birrbank/markets', label: 'Markets', desc: 'ESX equities, IPO pipeline and bonds', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' },
]

const birrbankCol2 = [
  { href: '/money', label: 'Money', desc: 'Financial services for the diaspora', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>' },
  { href: '/birrbank/insurance', label: 'Insurance', desc: 'Compare insurance products', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
  { href: '/birrbank/commodities', label: 'Commodities', desc: 'ECX coffee, sesame and grain prices', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.59 13.41L13.42 20.58a2 2 0 01-2.83 0L2.59 12.58A2 2 0 012 11.17V4a2 2 0 012-2h7.17a2 2 0 011.42.59l8 8a2 2 0 010 2.82z"/></svg>' },
]

const diasporaCol1 = [
  { href: '/business', label: 'Businesses', desc: 'Verified Ethiopian businesses across the diaspora', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 3v18M16 3v18M2 9h20M2 15h20"/></svg>' },
  { href: '/jobs', label: 'Jobs', desc: 'Employment opportunities across the diaspora', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>' },
  { href: '/housing', label: 'Housing', desc: 'Property and accommodation listings', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
  { href: '/delivery', label: 'Delivery', desc: 'Courier, freight and logistics services', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>' },
]

const diasporaCol2 = [
  { href: '/money', label: 'Money', desc: 'Financial services for the diaspora', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>' },
  { href: '/cars', label: 'Cars', desc: 'Vehicles, hire and automotive services', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="8" width="22" height="10" rx="2"/><path d="M5 8l2-4h10l2 4"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>' },
  { href: '/tutors', label: 'Tutors', desc: 'Tutoring and educational services', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>' },
]

const groups = [
  { href: '/made-in-ethiopia', label: 'Made in Ethiopia' },
  { href: '/housing', label: 'Property' },
  { href: '/birrbank', label: 'BirrBank', trademark: true, dropdown: true },
  { href: '/diaspora', label: 'Diaspora Businesses', dropdown: true },
  { href: '/community', label: 'Diaspora Network' },
  { href: '/events', label: 'Events' },
]

function DropdownItem({ href, label, desc, icon }: { href: string; label: string; desc: string; icon: string }) {
  return (
    <Link href={href}
      className="group/item flex items-start gap-3 p-2.5 rounded-lg hover:bg-green-soft/50 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-green-soft text-green flex items-center justify-center shrink-0"
        dangerouslySetInnerHTML={{ __html: icon }} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink group-hover/item:text-green transition-colors">{label}</p>
        <p className="text-xs text-muted mt-0.5">{desc}</p>
      </div>
    </Link>
  )
}

function DiasporaDropdown({ isActive }: { isActive: boolean }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout>>()

  function handleEnter() {
    clearTimeout(closeTimer.current)
    setOpen(true)
  }
  function handleLeave() {
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <Link
        href="/diaspora"
        className={`relative flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors whitespace-nowrap
          ${isActive ? 'text-green font-semibold' : 'text-muted hover:text-ink hover:bg-section'}`}
      >
        Diaspora Businesses
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
        {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-green rounded-full" />}
      </Link>
      {open && (
        <div className="absolute top-full left-0 pt-2 z-50">
          <div className="min-w-[560px] bg-white rounded-2xl shadow-xl overflow-hidden p-6">
            <div className="grid grid-cols-2 gap-x-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-3">Businesses and services</p>
                <div className="space-y-0.5">
                  {diasporaCol1.map((item) => <DropdownItem key={item.href} {...item} />)}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-3">Money and more</p>
                <div className="space-y-0.5">
                  {diasporaCol2.map((item) => <DropdownItem key={item.href} {...item} />)}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border/70">
              <Link href="/diaspora" className="text-sm font-semibold text-green hover:underline">
                View all Diaspora Businesses →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BirrBankDropdown({ isActive }: { isActive: boolean }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout>>()

  function handleEnter() {
    clearTimeout(closeTimer.current)
    setOpen(true)
  }
  function handleLeave() {
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <Link
        href="/birrbank"
        className={`relative flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors whitespace-nowrap
          ${isActive ? 'text-green font-semibold' : 'text-muted hover:text-ink hover:bg-section'}`}
      >
        BirrBank®
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
        {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-green rounded-full" />}
      </Link>
      {open && (
        <div className="absolute top-full left-0 pt-2 z-50">
          <div className="min-w-[520px] bg-white rounded-2xl shadow-xl overflow-hidden p-6">
            <div className="grid grid-cols-2 gap-x-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-3">Ethiopian finance</p>
                <div className="space-y-0.5">
                  {birrbankCol1.map((item) => <DropdownItem key={item.href} {...item} />)}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted mb-3">Financial services</p>
                <div className="space-y-0.5">
                  {birrbankCol2.map((item) => <DropdownItem key={item.href} {...item} />)}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border/70">
              <Link href="/birrbank" className="text-sm font-semibold text-green hover:underline">
                View all BirrBank →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function SiteNav() {
  const pathname = usePathname()

  return (
    <nav className='bg-white border-b border-border sticky top-0 z-40'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4'>

        {/* Logo */}
        <Link href='/' className='flex items-center gap-2 shrink-0' translate="no">
          <Logo className='w-7 h-7' />
          <span className='flex flex-col leading-none'>
            <span className='font-brand font-extrabold text-[20px] text-ink tracking-tight' translate="no">HagerLand®</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className='hidden xl:flex items-center gap-1 flex-1 justify-center'>
          {groups.map(group => {
            if (group.dropdown) {
              if (group.href === '/birrbank') {
                const isActive = pathname.startsWith('/birrbank') || birrbankCol1.some(s => pathname.startsWith(s.href)) || birrbankCol2.some(s => pathname.startsWith(s.href))
                return <BirrBankDropdown key={group.href} isActive={isActive} />
              }
              const isActive = pathname.startsWith('/diaspora') || diasporaCol1.some(s => pathname.startsWith(s.href)) || diasporaCol2.some(s => pathname.startsWith(s.href))
              return <DiasporaDropdown key={group.href} isActive={isActive} />
            }
            const isActive = pathname.startsWith(group.href)
            return (
              <Link
                key={group.href}
                href={group.href}
                className={`relative px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors whitespace-nowrap
                  ${isActive
                    ? 'text-green font-semibold'
                    : 'text-muted hover:text-ink hover:bg-section'
                  }`}
              >
                {group.label}
                {isActive && (
                  <span className='absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-green rounded-full' />
                )}
              </Link>
            )
          })}
        </div>

        {/* Right side: lang switcher + search + CTA */}
        <div className='hidden xl:flex items-center gap-4 shrink-0'>
          <LanguageSwitcher />
          <Link href='/search' aria-label='Search' className='text-muted hover:text-ink transition-colors p-1'>
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><circle cx='11' cy='11' r='8'/><path d='M21 21l-4.35-4.35' strokeLinecap='round'/></svg>
          </Link>
          <Link href='/business/post' className='bg-green hover:bg-green-dark text-white text-sm font-semibold rounded-full px-4 py-2 transition-colors whitespace-nowrap'>
            List your business
          </Link>
        </div>

        {/* Mobile */}
        <div className='flex xl:hidden items-center gap-3'>
          <Link href='/search' className='text-muted hover:text-ink p-1'>
            <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><circle cx='11' cy='11' r='8'/><path d='M21 21l-4.35-4.35' strokeLinecap='round'/></svg>
          </Link>
          <MobileNav />
        </div>

      </div>
    </nav>
  )
}
