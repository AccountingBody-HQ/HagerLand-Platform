'use client'

import { useState } from 'react'
import Link from 'next/link'

const links = [
  { href: '/', label: 'Directory' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/housing', label: 'Housing' },
  { href: '/cars', label: 'Cars' },
  { href: '/tutors', label: 'Tutors' },
  { href: '/community', label: 'Community' },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
        className="p-2 -mr-2"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {open ? (
            <path d="M6 6L18 18M6 18L18 6" strokeLinecap="round" />
          ) : (
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-border shadow-md">
          <div className="flex flex-col px-4 py-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="py-3 text-sm font-medium text-ink border-b border-border last:border-0"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
