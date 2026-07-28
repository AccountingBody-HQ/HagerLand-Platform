'use client'
import Link from 'next/link'
import { useState, useRef } from 'react'
import { Logo } from '@/components/Logo'
import { MobileNav } from '@/components/MobileNav'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { usePathname } from 'next/navigation'

const diasporaSections = [
  { href: '/business', label: 'Businesses', desc: 'Verified Ethiopian businesses worldwide', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 3v18M16 3v18M2 9h20M2 15h20"/></svg>' },
  { href: '/jobs', label: 'Jobs', desc: 'Work within the community', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>' },
  { href: '/cars', label: 'Cars', desc: 'Buy, sell, or find a trusted driver', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="8" width="22" height="10" rx="2"/><path d="M5 8l2-4h10l2 4"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>' },
  { href: '/tutors', label: 'Tutors', desc: 'Expert teaching and mentoring', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>' },
  { href: '/delivery', label: 'Delivery', desc: 'Courier, freight, and cargo services', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>' },
]

const birrbankSections = [
  { href: '/birrbank/banking', label: 'Banking', desc: 'Savings rates, FX, loans & money transfer', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>' },
  { href: '/money', label: 'Money', desc: 'Financial services for the diaspora', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>' },
  { href: '/birrbank/institutions', label: 'Institutions', desc: 'NBE-licensed banks & financial institutions', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 21h18M5 21V7l8-4v18M13 21V11l6-3v13"/></svg>' },
  { href: '/birrbank/insurance', label: 'Insurance', desc: 'Compare insurance products', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
  { href: '/birrbank/markets', label: 'Markets', desc: 'ESX equities, IPO pipeline & bonds', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' },
  { href: '/birrbank/commodities', label: 'Commodities', desc: 'ECX coffee, sesame & grain prices', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.59 13.41L13.42 20.58a2 2 0 01-2.83 0L2.59 12.58A2 2 0 012 11.17V4a2 2 0 012-2h7.17a2 2 0 011.42.59l8 8a2 2 0 010 2.82z"/></svg>' },
  { href: '/birrbank/intelligence', label: 'Intelligence', desc: 'Market intelligence — coming soon', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>', comingSoon: true },
]

const groups = [
  { href: '/made-in-ethiopia', label: 'Made in Ethiopia' },
  { href: '/housing', label: 'Property' },
  { href: '/birrbank', label: 'BirrBank', trademark: true, dropdown: birrbankSections },
  { href: '/diaspora', label: 'Diaspora Businesses', dropdown: diasporaSections },
  { href: '/community', label: 'Community' },
  { href: '/events', label: 'Events' },
]

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
          <div className="w-[460px] bg-white border border-border/60 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden p-3">
            <div className="grid grid-cols-2 gap-1">
              {diasporaSections.map((s) => (
                <Link key={s.href} href={s.href}
                  className="group/item flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-section transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-green-soft text-green flex items-center justify-center shrink-0 group-hover/item:bg-green group-hover/item:text-white transition-colors"
                    dangerouslySetInnerHTML={{ __html: s.icon }} />
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[13.5px] font-semibold text-ink group-hover/item:text-green transition-colors">{s.label}</p>
                    <p className="text-xs text-muted leading-snug mt-0.5">{s.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mx-1 my-2 border-t border-border/70" />
            <Link href="/diaspora" className="block px-3 py-2.5 rounded-xl text-[13.5px] font-semibold text-green hover:bg-green-soft transition-colors">
              View all →
            </Link>
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
        BirrBank<span style={{ fontSize: '0.5em', verticalAlign: 'super', lineHeight: 0, marginLeft: '1px', fontWeight: 400, opacity: 1 }}>®</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
        {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-green rounded-full" />}
      </Link>
      {open && (
        <div className="absolute top-full left-0 pt-2 z-50">
          <div className="w-[460px] bg-white border border-border/60 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden p-3">
            <div className="grid grid-cols-2 gap-1">
              {birrbankSections.map((s) => (
                s.comingSoon ? (
                  <div key={s.href}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-default">
                    <div className="w-9 h-9 rounded-lg bg-section text-muted/40 flex items-center justify-center shrink-0"
                      dangerouslySetInnerHTML={{ __html: s.icon }} />
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[13.5px] font-semibold text-muted/60">{s.label}</p>
                      <p className="text-xs text-muted/50 leading-snug mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ) : (
                  <Link key={s.href} href={s.href}
                    className="group/item flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-section transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-green-soft text-green flex items-center justify-center shrink-0 group-hover/item:bg-green group-hover/item:text-white transition-colors"
                      dangerouslySetInnerHTML={{ __html: s.icon }} />
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[13.5px] font-semibold text-ink group-hover/item:text-green transition-colors">{s.label}</p>
                      <p className="text-xs text-muted leading-snug mt-0.5">{s.desc}</p>
                    </div>
                  </Link>
                )
              ))}
            </div>
            <div className="mx-1 my-2 border-t border-border/70" />
            <Link href="/birrbank/banking" className="block px-3 py-2.5 rounded-xl text-[13.5px] font-semibold text-green hover:bg-green-soft transition-colors">
              View all →
            </Link>
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
            <span className='font-brand font-extrabold text-[20px] text-ink tracking-tight' translate="no">HagerLand<span style={{fontSize:'0.55em',display:'inline-block',position:'relative',top:'-0.85em',opacity:1,marginLeft:'2px',fontWeight:400}}>®</span></span>
            <span className='text-[7px] font-medium uppercase tracking-[0.14em] text-green antialiased mt-[6px]' translate="no">Connect and Cooperate</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className='hidden xl:flex items-center gap-1 flex-1 justify-center'>
          {groups.map(group => {
            if (group.dropdown) {
              const isActive = pathname.startsWith(group.href) || group.dropdown.some(s => pathname.startsWith(s.href))
              if (group.href === '/birrbank') return <BirrBankDropdown key={group.href} isActive={isActive} />
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
        <div className='hidden xl:flex items-center gap-3 shrink-0'>
          <LanguageSwitcher />
          <Link href='/search' className='text-muted hover:text-ink transition-colors p-1'>
            <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><circle cx='11' cy='11' r='8'/><path d='M21 21l-4.35-4.35' strokeLinecap='round'/></svg>
          </Link>
          <Link href='/business/post' className='bg-green hover:bg-green-dark text-white text-[13px] font-semibold rounded-full px-4 py-2 transition-colors whitespace-nowrap'>
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
