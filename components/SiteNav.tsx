'use client'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { MobileNav } from '@/components/MobileNav'
import { useState, useRef, useEffect } from 'react'
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

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'am', label: 'አማ' },
  { code: 'om', label: 'OM' },
]

function googleTranslate(langCode: string) {
  // Remove existing cookie then set new one
  const domain = window.location.hostname
  document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + domain
  document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/'
  if (langCode === 'en') {
    // Reload to restore English
    window.location.reload()
    return
  }
  document.cookie = 'googtrans=/en/' + langCode + '; path=/; domain=' + domain
  document.cookie = 'googtrans=/en/' + langCode + '; path=/'
  window.location.reload()
}

export function SiteNav() {
  const pathname = usePathname()
  const [dirOpen, setDirOpen] = useState(false)
  const dirRef = useRef<HTMLDivElement>(null)
  const [activeLang, setActiveLang] = useState('en')

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dirRef.current && !dirRef.current.contains(e.target as Node)) {
        setDirOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Detect active lang from cookie on mount
  useEffect(() => {
    const match = document.cookie.match(/googtrans=\/en\/([a-z]+)/)
    if (match) setActiveLang(match[1])
  }, [])

  // Inject Google Translate script once
  useEffect(() => {
    if (document.getElementById('google-translate-script')) return
    const s = document.createElement('script')
    s.id = 'google-translate-script'
    s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
    s.async = true
    document.head.appendChild(s)
    ;(window as unknown as Record<string, unknown>).googleTranslateElementInit = () => {
      new (window as unknown as {google: {translate: {TranslateElement: new(...a: unknown[]) => unknown}}}).google.translate.TranslateElement(
        { pageLanguage: 'en', includedLanguages: 'am,om', autoDisplay: false },
        'google_translate_element'
      )
    }
  }, [])

  const activeSection = sections.find(s => pathname.startsWith(s.href))

  function handleLang(code: string) {
    setActiveLang(code)
    googleTranslate(code)
  }

  return (
    <>
      {/* Hidden Google Translate widget anchor */}
      <div id='google_translate_element' className='hidden' />
      <nav className='bg-white border-b border-border sticky top-0 z-40'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4'>

          {/* Logo */}
          <Link href='/' className='flex items-center gap-2 shrink-0'>
            <Logo className='w-7 h-7' />
            <span className='font-bold text-base text-ink tracking-tight'>HagerLand</span>
          </Link>

          {/* Desktop nav — Directory dropdown */}
          <div className='hidden lg:flex items-center gap-1 flex-1 justify-center'>
            <div className='relative' ref={dirRef}>
              <button
                onClick={() => setDirOpen(o => !o)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${activeSection ? 'text-green font-semibold' : 'text-muted hover:text-ink hover:bg-section'}`}
              >
                {activeSection ? activeSection.label : 'Directory'}
                <svg className={`w-3.5 h-3.5 transition-transform ${dirOpen ? 'rotate-180' : ''}`} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5'><path d='M6 9l6 6 6-6' strokeLinecap='round' strokeLinejoin='round'/></svg>
              </button>
              {dirOpen && (
                <div className='absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-white border border-border rounded-2xl shadow-lg overflow-hidden z-50'>
                  {sections.map(sec => {
                    const isActive = pathname.startsWith(sec.href)
                    return (
                      <Link
                        key={sec.href}
                        href={sec.href}
                        onClick={() => setDirOpen(false)}
                        className={`flex items-center justify-between px-4 py-2.5 text-[13px] font-medium transition-colors ${isActive ? 'bg-green-soft text-green font-semibold' : 'text-ink hover:bg-section'}`}
                      >
                        {sec.label}
                        {isActive && <span className='w-1.5 h-1.5 rounded-full bg-green' />}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right side: lang switcher + search + CTA */}
          <div className='hidden lg:flex items-center gap-3 shrink-0'>
            {/* Language switcher */}
            <div className='flex items-center gap-0.5 bg-section rounded-full px-1 py-1'>
              {LANGS.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLang(lang.code)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${activeLang === lang.code ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
            <Link href='/search' className='text-muted hover:text-ink transition-colors p-1'>
              <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><circle cx='11' cy='11' r='8'/><path d='M21 21l-4.35-4.35' strokeLinecap='round'/></svg>
            </Link>
            <Link href='/business/post' className='bg-green hover:bg-green-dark text-white text-[13px] font-semibold rounded-full px-4 py-2 transition-colors whitespace-nowrap'>
              List your business
            </Link>
          </div>

          {/* Mobile */}
          <div className='flex lg:hidden items-center gap-3'>
            <Link href='/search' className='text-muted hover:text-ink p-1'>
              <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'><circle cx='11' cy='11' r='8'/><path d='M21 21l-4.35-4.35' strokeLinecap='round'/></svg>
            </Link>
            <MobileNav />
          </div>

        </div>
      </nav>
    </>
  )
}