'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/Logo'
import { MobileLangSwitcher } from '@/components/LanguageSwitcher'



const SECTIONS = [
  { href: '/business', label: 'Businesses', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 3v18M2 9h20"/></svg>', desc: 'Find verified businesses' },
  { href: '/jobs', label: 'Jobs', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>', desc: 'Work in the community' },
  { href: '/housing', label: 'Housing', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>', desc: 'Rooms and rentals' },
  { href: '/money', label: 'Money', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>', desc: 'Transfers and finance' },
  { href: '/cars', label: 'Cars', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="8" width="22" height="10" rx="2"/><path d="M5 8l2-4h10l2 4"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>', desc: 'Cars and taxi services' },
  { href: '/tutors', label: 'Tutors', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>', desc: 'Teaching and mentoring' },
  { href: '/community', label: 'Community', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>', desc: 'Organisations and groups' },
  { href: '/events', label: 'Events', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', desc: 'Celebrations and networking' },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Open menu" className="p-1 text-ink">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round"/>
        </svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] flex flex-col" style={{background: 'linear-gradient(160deg, #0f1c14 0%, #152238 100%)'}}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 h-16 shrink-0 border-b border-white/10">
            <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5">
              <Logo className="w-7 h-7" />
              <span className="font-bold text-lg text-white tracking-tight" translate="no">HagerLand</span>
            </Link>
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
            </button>
          </div>

          {/* Language switcher */}
          <div className="px-5 pt-6 pb-4">
            <div className="w-fit">
              <MobileLangSwitcher />
            </div>
          </div>

          {/* Eyebrow */}
          <div className="px-5 pb-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/30">Browse the directory</p>
          </div>

          {/* Nav links */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="space-y-1">
              {SECTIONS.map((section) => {
                const active = pathname === section.href
                return (
                  <Link key={section.href} href={section.href} onClick={() => setOpen(false)}
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all ${active ? 'bg-green text-white' : 'text-white/70 hover:bg-white/8 hover:text-white'}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-white/20' : 'bg-white/8'}`}
                      dangerouslySetInnerHTML={{ __html: section.icon }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{section.label}</p>
                      <p className={`text-xs mt-0.5 ${active ? 'text-white/70' : 'text-white/40'}`}>{section.desc}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      className={active ? 'text-white/60' : 'text-white/20'}>
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Footer CTA */}
          <div className="px-5 py-6 border-t border-white/10 shrink-0 space-y-3">
            <Link href="/business/post" onClick={() => setOpen(false)}
              className="flex items-center justify-center w-full bg-green hover:bg-green-dark text-white font-bold rounded-full py-3.5 text-sm transition-colors">
              List your business — free
            </Link>
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/25">ሃገር — Homeland</p>
              <div className="flex items-center gap-3">
                <Link href="/about" onClick={() => setOpen(false)} className="text-xs text-white/30 hover:text-white/60 transition-colors">About</Link>
                <Link href="/contact" onClick={() => setOpen(false)} className="text-xs text-white/30 hover:text-white/60 transition-colors">Contact</Link>
                <Link href="/how-it-works" onClick={() => setOpen(false)} className="text-xs text-white/30 hover:text-white/60 transition-colors">How it works</Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}