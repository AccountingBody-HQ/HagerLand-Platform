'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, ClipboardList, FolderKanban, Bell, Handshake, Heart, House, Inbox, LayoutDashboard, Settings, Store, Wrench, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface AccountNavItem {
  href: string
  label: string
  icon: 'overview' | 'listings' | 'developments' | 'company' | 'portfolio' | 'enquiries' | 'quotes' | 'settings' | 'products' | 'requests' | 'leads' | 'saved' | 'alerts'
  badge?: number
}

const ICONS: Record<AccountNavItem['icon'], LucideIcon> = {
  overview: LayoutDashboard,
  listings: House,
  developments: Building2,
  company: Store,
  portfolio: FolderKanban,
  enquiries: Inbox,
  quotes: ClipboardList,
  settings: Settings,
  products: Store,
  requests: Wrench,
  leads: Handshake,
  saved: Heart,
  alerts: Bell,
}

function isActive(pathname: string, href: string): boolean {
  return href === '/account' ? pathname === '/account' : pathname === href || pathname.startsWith(`${href}/`)
}

export function AccountNav({ items }: { items: AccountNavItem[] }) {
  const pathname = usePathname() ?? ''
  return (
    <>
      <nav aria-label="Account" className="hidden lg:block">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = ICONS[item.icon]
            const active = isActive(pathname, item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn('flex min-h-11 items-center gap-3 rounded-md px-3 font-medium', active ? 'bg-white text-ink shadow-sm ring-1 ring-border' : 'text-muted hover:bg-white hover:text-ink')}
                >
                  <Icon className={cn('size-5', active && 'text-green')} aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? <span className="rounded-full bg-green px-2 py-0.5 text-caption font-bold text-white">{item.badge}</span> : null}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <nav aria-label="Account" className="-mx-4 overflow-x-auto border-b border-border bg-white px-4 lg:hidden">
        <ul className="flex gap-1">
          {items.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn('inline-flex min-h-12 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-small font-semibold', active ? 'border-green text-ink' : 'border-transparent text-muted')}
                >
                  {item.label}
                  {item.badge ? <span className="rounded-full bg-green px-1.5 text-caption text-white">{item.badge}</span> : null}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
