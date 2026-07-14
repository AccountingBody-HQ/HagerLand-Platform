'use client'
import { useState } from 'react'
import Link from 'next/link'

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
    <div className="lg:hidden">
      <button onClick={() => setOpen(!open)} aria-label="Toggle menu"
        className="p-2 -mr-1 text-ink">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {open ? (
            <path d="M6 6L18 18M6 18L18 6" strokeLinecap="round" />
          ) : (
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          )}
        </svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 h-16 border-b border-border">
            <Link href="/" onClick={() => setOpen(false)} className="font-bold text-lg text-ink tracking-tight">HagerLand</Link>
            <button onClick={() => setOpen(false)} className="p-2 text-muted">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6L18 18M6 18L18 6" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div className="flex flex-col flex-1 px-4 py-6 overflow-y-auto">
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
                className="flex items-center justify-between py-4 text-base font-semibold text-ink border-b border-border last:border-0 hover:text-green transition-colors">
                {link.label}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
            ))}
          </div>
          <div className="px-4 pb-8 pt-4 border-t border-border">
            <Link href="/business/post" onClick={() => setOpen(false)}
              className="block w-full bg-green hover:bg-green-dark text-white font-semibold rounded-full py-3 text-center transition-colors">
              List your business — free
            </Link>
            <p className="text-xs text-muted text-center mt-3">ሃገር — Homeland</p>
          </div>
        </div>
      )}
    </div>
  )
}
