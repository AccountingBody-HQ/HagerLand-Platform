'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { ADMIN_NAV } from './admin-nav-items'
import { cn } from '@/lib/cn'
import { roleCanAccess, type StaffRole } from '@/lib/admin/roles'



function isActive(path: string, href: string) {
  return href === '/roodber8' ? path === '/roodber8' : path === href || path.startsWith(`${href}/`)
}

/** Staff see only the areas of their role (spec 26.15); the master login and owners see everything. */
function Links({ badges, onNavigate, role }: { badges: Record<string, number>; onNavigate?: () => void; role: StaffRole | null }) {
  const path = usePathname() ?? ''
  return (
    <ul className="space-y-0.5">
      {ADMIN_NAV.filter((item) => !role || roleCanAccess(role, item.href)).map((item) => {
        const active = isActive(path, item.href)
        const badge = 'badgeKey' in item ? badges[item.badgeKey] : 0
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              prefetch={false}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn('flex min-h-10 items-center gap-3 rounded-md px-3 text-small font-medium', active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white')}
            >
              <item.icon className={cn('size-4', active && 'text-gold')} aria-hidden />
              <span className="flex-1">{item.label}</span>
              {badge > 0 && <span className="rounded-full bg-gold px-1.5 text-caption font-bold text-ink">{badge}</span>}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/** Desktop sidebar. */
export function AdminSidebar({ badges, role }: { badges: Record<string, number>; role: StaffRole | null }) {
  return (
    <div className="hidden w-60 shrink-0 border-r border-white/10 bg-ink lg:block">
      <nav aria-label="Admin" className="sticky top-14 h-[calc(100dvh-3.5rem)] overflow-y-auto p-3">
        <Links badges={badges} role={role} />
      </nav>
    </div>
  )
}

/** Menu button and slide-out menu for small screens. */
export function AdminMobileMenu({ badges, role }: { badges: Record<string, number>; role: StaffRole | null }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex size-10 items-center justify-center rounded-md text-white hover:bg-white/10 lg:hidden" aria-label="Open admin menu">
        <Menu className="size-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <nav aria-label="Admin" className="w-72 overflow-y-auto bg-ink p-3">
            <button type="button" onClick={() => setOpen(false)} className="mb-2 inline-flex size-10 items-center justify-center rounded-md text-white hover:bg-white/10" aria-label="Close admin menu">
              <X className="size-5" />
            </button>
            <Links badges={badges} role={role} onNavigate={() => setOpen(false)} />
          </nav>
          <button type="button" aria-label="Close menu" className="flex-1 bg-ink/60" onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  )
}
