'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronDown, Menu, Search } from 'lucide-react'
import { cn } from '@/lib/cn'
import { MAIN_NAV, type NavGroup } from '@/lib/navigation'
import { Wordmark } from '@/components/brand/Logo'
import { ButtonLink, IconButton } from '@/components/ui/Button'
import { DynamicIcon } from '@/components/ui/DynamicIcon'
import { AccountLink } from './AccountLink'
import { MobileDrawer } from './MobileDrawer'
import { SearchOverlay } from '@/components/search/SearchOverlay'

function MegaPanel({ group, onNavigate }: { group: NavGroup; onNavigate: () => void }) {
  const isDevelopments = group.id === 'developments'
  return (
    <div className="mx-auto grid max-w-content gap-8 px-8 py-8 lg:grid-cols-[1fr_auto]">
      <div className={cn('grid gap-8', group.featured ? 'lg:grid-cols-[2fr_1fr]' : '')}>
        {group.featured && (
          <div>
            <p className="hl-eyebrow mb-3 text-muted">Shop by category</p>
            <ul className="grid grid-cols-2 gap-1">
              {group.featured.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} onClick={onNavigate} className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-ink hover:bg-stone-100">
                    <DynamicIcon name={l.icon} className="size-5 text-green" />
                    <span className="font-medium">{l.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <ul className={cn('grid gap-1', !group.featured && 'sm:grid-cols-2 lg:grid-cols-3')}>
          {group.links.map((l, i) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={onNavigate}
                className={cn('block rounded-md px-3 py-2.5 hover:bg-stone-100', isDevelopments && i === 0 && 'border-l-4 border-gold bg-gold-soft/60 hover:bg-gold-soft')}
              >
                <span className={cn('block font-semibold', isDevelopments && i === 0 ? 'text-gold-dark' : 'text-ink')}>{l.label}</span>
                {l.description && <span className="mt-0.5 block text-small text-muted">{l.description}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-start">
        <Link
          href={group.cta.href}
          onClick={onNavigate}
          className="group inline-flex items-center gap-2 rounded-lg bg-green-tint px-5 py-4 font-semibold text-green-darker ring-1 ring-green/15 hover:bg-green-soft"
        >
          {group.cta.label}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>
    </div>
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const [openId, setOpenId] = useState<NavGroup['id'] | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const closeTimer = useRef<number | null>(null)
  const headerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setOpenId(null)
    setDrawerOpen(false)
  }, [pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenId(null)
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement))) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    const onDown = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpenId(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [])

  const hoverOpen = (id: NavGroup['id']) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    setOpenId(id)
  }
  const hoverClose = () => {
    closeTimer.current = window.setTimeout(() => setOpenId(null), 150)
  }
  const openGroup = MAIN_NAV.find((g) => g.id === openId)

  return (
    <header ref={headerRef} className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-content items-center gap-2 px-4 sm:px-6 lg:h-[72px] lg:px-8">
        <Link href="/" aria-label="HagerLand home" className="mr-2 shrink-0 lg:mr-6">
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden lg:block" onMouseLeave={hoverClose}>
          <ul className="flex items-center gap-1">
            {MAIN_NAV.map((g) => {
              const active = pathname?.startsWith(g.href) || (g.id === 'developments' && pathname?.startsWith('/our-developments'))
              return (
                <li key={g.id} onMouseEnter={() => hoverOpen(g.id)}>
                  <button
                    type="button"
                    aria-expanded={openId === g.id}
                    aria-controls="mega-panel"
                    onClick={() => setOpenId(openId === g.id ? null : g.id)}
                    className={cn(
                      'inline-flex h-11 items-center gap-1 rounded-md px-3 text-[0.9375rem] font-semibold transition-colors hover:bg-stone-100',
                      active || openId === g.id ? 'text-ink' : 'text-ink/80',
                    )}
                  >
                    {g.label}
                    <ChevronDown className={cn('size-4 transition-transform', openId === g.id && 'rotate-180')} aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <IconButton label="Search" onClick={() => setSearchOpen(true)}>
            <Search />
          </IconButton>
          <AccountLink className="hidden lg:inline-flex" />
          <ButtonLink href="/list-with-us" size="md" className="ml-1 hidden lg:inline-flex">
            List with us
          </ButtonLink>
          <IconButton label="Open menu" className="lg:hidden" onClick={() => setDrawerOpen(true)}>
            <Menu />
          </IconButton>
        </div>
      </div>

      {openGroup && (
        <div
          id="mega-panel"
          className="absolute inset-x-0 top-full hidden animate-fade-in border-b border-border bg-white shadow-md lg:block"
          onMouseEnter={() => hoverOpen(openGroup.id)}
          onMouseLeave={hoverClose}
        >
          <MegaPanel group={openGroup} onNavigate={() => setOpenId(null)} />
        </div>
      )}

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}
