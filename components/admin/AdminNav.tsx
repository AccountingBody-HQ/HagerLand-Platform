'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, Menu, Search, X } from 'lucide-react'
import { filterNav, isNavActive, navForRole } from './admin-nav-items'
import { cn } from '@/lib/cn'
import type { StaffRole } from '@/lib/admin/roles'

const COLLAPSED_KEY = 'hl-admin-nav-collapsed'

function readCollapsed(): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(COLLAPSED_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

function saveCollapsed(labels: string[]): void {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify(labels))
  } catch {
    // Storage unavailable (private window, blocked): the menu simply opens expanded next time.
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}

/**
 * Grouped admin menu with "Find a section". Staff see only the areas of their role (spec 26.15); groups with nothing
 * for the role are hidden. The group of the current page always stays open; other groups remember being collapsed.
 */
function Links({ badges, onNavigate, role, shortcut }: { badges: Record<string, number>; onNavigate?: () => void; role: StaffRole | null; shortcut?: boolean }) {
  const path = usePathname() ?? ''
  const router = useRouter()
  const searchId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<string[]>([])
  useEffect(() => setCollapsed(readCollapsed()), [])

  useEffect(() => {
    if (!shortcut) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target) || !input.current?.offsetParent) return
      e.preventDefault()
      input.current.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [shortcut])

  const groups = filterNav(navForRole(role), query)
  const searching = query.trim().length > 0
  const toggle = (label: string) => {
    const next = collapsed.includes(label) ? collapsed.filter((l) => l !== label) : [...collapsed, label]
    setCollapsed(next)
    saveCollapsed(next)
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          Find a section
        </label>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-white/50" aria-hidden />
        <input
          ref={input}
          id={searchId}
          type="search"
          value={query}
          placeholder="Find a section  /"
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setQuery('')
              e.currentTarget.blur()
            } else if (e.key === 'Enter') {
              const first = groups[0]?.items[0]
              if (first) {
                e.preventDefault()
                setQuery('')
                onNavigate?.()
                router.push(first.href)
              }
            }
          }}
          className="h-10 w-full rounded-md border border-white/10 bg-white/10 pl-8 pr-2 text-small text-white placeholder:text-white/50 focus:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        />
      </div>
      {groups.length === 0 && <p className="px-3 text-small text-white/60">No section matches</p>}
      {groups.map((group) => {
        const hasActive = group.items.some((i) => isNavActive(path, i.href))
        const open = searching || hasActive || !collapsed.includes(group.label)
        const listId = `${searchId}-${group.label.replace(/[^a-z]/gi, '')}`
        return (
          <div key={group.label}>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={listId}
              disabled={searching || hasActive}
              onClick={() => toggle(group.label)}
              className="flex min-h-8 w-full items-center justify-between rounded-md px-3 text-caption font-semibold uppercase tracking-wider text-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:cursor-default disabled:hover:text-white/50"
            >
              {group.label}
              <ChevronDown className={cn('size-3.5 transition-transform', !open && '-rotate-90')} aria-hidden />
            </button>
            {open && (
              <ul id={listId} className="mt-0.5 space-y-0.5">
                {group.items.map((item) => {
                  const active = isNavActive(path, item.href)
                  const badge = item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        prefetch={false}
                        onClick={() => {
                          setQuery('')
                          onNavigate?.()
                        }}
                        aria-current={active ? 'page' : undefined}
                        className={cn('flex min-h-10 items-center gap-3 rounded-md px-3 text-small font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold', active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white')}
                      >
                        <item.icon className={cn('size-4', active && 'text-gold')} aria-hidden />
                        <span className="flex-1">{item.label}</span>
                        {badge > 0 && <span className="rounded-full bg-gold px-1.5 text-caption font-bold text-ink">{badge}</span>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Desktop sidebar. */
export function AdminSidebar({ badges, role }: { badges: Record<string, number>; role: StaffRole | null }) {
  return (
    <div className="hidden w-60 shrink-0 border-r border-white/10 bg-ink lg:block">
      <nav aria-label="Admin" className="sticky top-14 h-[calc(100dvh-3.5rem)] overflow-y-auto p-3">
        <Links badges={badges} role={role} shortcut />
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
