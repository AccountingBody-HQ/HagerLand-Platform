'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  BadgePercent, BarChart3, MailWarning, BookOpen, Calculator, Briefcase, Building2, LayoutGrid, Handshake, UserPlus, Coins, Wrench, ListChecks, Receipt, KeyRound, ClipboardCheck, ClipboardList, FileClock, FolderTree, Gauge, Import, Inbox, MapPin, Megaphone, Menu, Package, Settings, Store, Users, X, HandCoins, House, Layers,
} from 'lucide-react'
import { cn } from '@/lib/cn'

export const ADMIN_NAV = [
  { href: '/roodber8', label: 'Dashboard', icon: Gauge },
  { href: '/roodber8/review', label: 'Review queue', icon: ClipboardCheck, badgeKey: 'review' },
  { href: '/roodber8/pillars', label: 'Pillars and modes', icon: Layers },
  { href: '/roodber8/verticals', label: 'Verticals', icon: LayoutGrid },
  { href: '/roodber8/properties', label: 'Properties', icon: House },
  { href: '/roodber8/developments', label: 'Developments', icon: Building2 },
  { href: '/roodber8/organisations', label: 'Organisations', icon: Store },
  { href: '/roodber8/products', label: 'Products', icon: Package },
  { href: '/roodber8/trade-accounts', label: 'Trade accounts', icon: BadgePercent, badgeKey: 'trade' },
  { href: '/roodber8/categories', label: 'Categories', icon: FolderTree },
  { href: '/roodber8/locations', label: 'Locations', icon: MapPin },
  { href: '/roodber8/exchange-rates', label: 'Exchange rates', icon: Coins },
  { href: '/roodber8/enquiries', label: 'Enquiries', icon: Inbox },
  { href: '/roodber8/quotes', label: 'Quotes', icon: ClipboardList, badgeKey: 'quotes' },
  { href: '/roodber8/service-requests', label: 'Service requests', icon: Wrench, badgeKey: 'requests' },
  { href: '/roodber8/request-questions', label: 'Request questions', icon: ListChecks },
  { href: '/roodber8/deals', label: 'Deals and commissions', icon: Receipt },
  { href: '/roodber8/agency', label: 'Agency', icon: Handshake, badgeKey: 'agency' },
  { href: '/roodber8/property-care', label: 'Property Care', icon: KeyRound, badgeKey: 'care' },
  { href: '/roodber8/sales', label: 'HagerLand sales', icon: HandCoins },
  { href: '/roodber8/jobs', label: 'Jobs and applications', icon: Briefcase },
  { href: '/roodber8/interest', label: 'Interest registrations', icon: UserPlus, badgeKey: 'interest' },
  { href: '/roodber8/partners', label: 'Partner applications', icon: Handshake },
  { href: '/roodber8/users', label: 'Users', icon: Users },
  { href: '/roodber8/guides', label: 'Guides', icon: BookOpen },
  { href: '/roodber8/build-costs', label: 'Build-cost rates', icon: Calculator },
  { href: '/roodber8/promotions', label: 'Promotions', icon: Megaphone },
  { href: '/roodber8/import', label: 'Imports', icon: Import },
  { href: '/roodber8/reports', label: 'Reports', icon: BarChart3 },
  { href: '/roodber8/settings', label: 'Settings', icon: Settings },
  { href: '/roodber8/email-problems', label: 'Email problems', icon: MailWarning, badgeKey: 'email' },
  { href: '/roodber8/audit', label: 'Audit log', icon: FileClock },
] as const

function isActive(path: string, href: string) {
  return href === '/roodber8' ? path === '/roodber8' : path === href || path.startsWith(`${href}/`)
}

function Links({ badges, onNavigate }: { badges: Record<string, number>; onNavigate?: () => void }) {
  const path = usePathname() ?? ''
  return (
    <ul className="space-y-0.5">
      {ADMIN_NAV.map((item) => {
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
export function AdminSidebar({ badges }: { badges: Record<string, number> }) {
  return (
    <div className="hidden w-60 shrink-0 border-r border-white/10 bg-ink lg:block">
      <nav aria-label="Admin" className="sticky top-14 h-[calc(100dvh-3.5rem)] overflow-y-auto p-3">
        <Links badges={badges} />
      </nav>
    </div>
  )
}

/** Menu button and slide-out menu for small screens. */
export function AdminMobileMenu({ badges }: { badges: Record<string, number> }) {
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
            <Links badges={badges} onNavigate={() => setOpen(false)} />
          </nav>
          <button type="button" aria-label="Close menu" className="flex-1 bg-ink/60" onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  )
}
