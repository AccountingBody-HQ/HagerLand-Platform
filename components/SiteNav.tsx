'use client'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { MobileNav } from '@/components/MobileNav'
import { usePathname } from 'next/navigation'

const sections = [
  { href: '/business', label: 'Businesses' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/housing', label: 'Housing' },
  { href: '/money', label: 'Money' },
  { href: '/cars', label: 'Cars' },
  { href: '/tutors', label: 'Tutors' },
  { href: '/community', label: 'Community' },
  { href: '/events', label: 'Events' },
]

export function SiteNav() {
  const pathname = usePathname()
  const pageUrl = 'https://hagerland-platform.vercel.app' + pathname

  return (
    <nav className='bg-white border-b border-border sticky top-0 z-40'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4'>

        {/* Logo */}
        <Link href='/' className='flex items-center gap-2 shrink-0'>
          <Logo className='w-7 h-7' />
          <span className='font-bold text-base text-ink tracking-tight'>HagerLand</span>
        </Link>

        {/* Desktop nav links */}
        <div className='hidden xl:flex items-center gap-1 flex-1 justify-center'>
          {sections.map(sec => {
            const isActive = pathname.startsWith(sec.href)
            return (
              <Link
                key={sec.href}
                href={sec.href}
                className={`relative px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors whitespace-nowrap
                  ${isActive
                    ? 'text-green font-semibold'
                    : 'text-muted hover:text-ink hover:bg-section'
                  }`}
              >
                {sec.label}
                {isActive && (
                  <span className='absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-green rounded-full' />
                )}
              </Link>
            )
          })}
        </div>

        {/* Right side: lang switcher + search + CTA */}
        <div className='hidden xl:flex items-center gap-3 shrink-0'>
          {/* Language switcher */}
          <div className='flex items-center gap-0.5 bg-section rounded-full px-1 py-1'>
            <Link
              href='/'
              className='px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-ink text-white'
            >
              EN
            </Link>
            <a
              href={`https://translate.google.com/translate?sl=en&tl=am&u=${encodeURIComponent(pageUrl)}`}
              target='_blank'
              rel='noopener noreferrer'
              className='px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-muted hover:text-ink transition-colors'
            >
              አማ
            </a>
            <a
              href={`https://translate.google.com/translate?sl=en&tl=om&u=${encodeURIComponent(pageUrl)}`}
              target='_blank'
              rel='noopener noreferrer'
              className='px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-muted hover:text-ink transition-colors'
            >
              OM
            </a>
          </div>
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