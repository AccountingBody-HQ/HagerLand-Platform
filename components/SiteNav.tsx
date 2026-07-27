'use client'
import Link from 'next/link'
import { useState, useRef } from 'react'
import { Logo } from '@/components/Logo'
import { MobileNav } from '@/components/MobileNav'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { usePathname } from 'next/navigation'

const diasporaSections = [
  { href: '/business', label: 'Businesses' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/housing', label: 'Housing' },
  { href: '/money', label: 'Money' },
  { href: '/cars', label: 'Cars' },
  { href: '/tutors', label: 'Tutors' },
  { href: '/delivery', label: 'Delivery' },
]

const groups = [
  { href: '/made-in-ethiopia', label: 'Made in Ethiopia' },
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
          <div className="w-56 bg-white border border-border rounded-2xl shadow-xl overflow-hidden py-1.5">
            {diasporaSections.map((s) => (
              <Link key={s.href} href={s.href}
                className="block px-4 py-2.5 text-sm text-ink hover:bg-section hover:text-green transition-colors">
                {s.label}
              </Link>
            ))}
            <div className="border-t border-border mt-1 pt-1">
              <Link href="/diaspora" className="block px-4 py-2.5 text-sm font-semibold text-green hover:bg-section transition-colors">
                View all →
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
            <span className='font-brand font-extrabold text-[20px] text-ink tracking-tight' translate="no">HagerLand<span style={{fontSize:'0.55em',display:'inline-block',position:'relative',top:'-0.85em',opacity:1,marginLeft:'2px',fontWeight:400}}>®</span></span>
            <span className='text-[7px] font-medium uppercase tracking-[0.14em] text-green antialiased mt-[6px]' translate="no">Connect and Cooperate</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className='hidden xl:flex items-center gap-1 flex-1 justify-center'>
          {groups.map(group => {
            if (group.dropdown) {
              const isActive = pathname.startsWith('/diaspora') || group.dropdown.some(s => pathname.startsWith(s.href))
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
