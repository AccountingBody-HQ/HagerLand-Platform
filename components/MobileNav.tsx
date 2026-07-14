'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'

const links = [
  { href: '/business', label: 'Businesses' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/housing', label: 'Housing' },
  { href: '/cars', label: 'Cars & taxi' },
  { href: '/tutors', label: 'Tutors' },
  { href: '/community', label: 'Community' },
  { href: '/events', label: 'Events' },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Open menu"
        className="p-1 text-ink">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round"/>
        </svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white">
          <div className="flex items-center justify-between px-5 h-16 border-b border-border shrink-0">
            <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5">
              <Logo className="w-7 h-7" />
              <span className="font-bold text-lg text-ink">HagerLand</span>
            </Link>
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-1 text-muted hover:text-ink">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
                className="flex items-center justify-between py-4 border-b border-border text-base font-semibold text-ink hover:text-green transition-colors">
                {link.label}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            ))}
          </div>
          <div className="px-5 py-6 border-t border-border shrink-0">
            <Link href="/business/post" onClick={() => setOpen(false)}
              className="flex items-center justify-center w-full bg-green hover:bg-green-dark text-white font-semibold rounded-full py-3.5 transition-colors">
              List your business — free
            </Link>
            <p className="text-center text-xs text-muted mt-4">ሃገር — Homeland</p>
          </div>
        </div>
      )}
    </>
  )
}
