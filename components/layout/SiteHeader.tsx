'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronDown, Globe, LayoutGrid, Menu, Search } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { AllServices, NavGroup, NavLink, ServiceTile, SiteNav } from '@/lib/navigation'
import { Wordmark } from '@/components/brand/Logo'
import { IconButton } from '@/components/ui/Button'
import { DynamicIcon } from '@/components/ui/DynamicIcon'
import { SoonBadge } from '@/components/verticals/SoonBadge'
import { AccountLink } from './AccountLink'
import { MobileDrawer } from './MobileDrawer'
import { LanguageSwitch } from './LanguageSwitch'
import { SearchOverlay } from '@/components/search/SearchOverlay'
import { useI18n } from '@/lib/i18n/client'
import { localizeGroups, localizeLink, localizeTile } from '@/lib/i18n/nav'

function MenuLink({ link, onNavigate, highlight }: { link: NavLink; onNavigate: () => void; highlight?: boolean }) {
  return (
    <Link href={link.href} onClick={onNavigate} className={cn('block rounded-md px-3 py-2.5 hover:bg-stone-100', highlight && 'border-l-4 border-gold bg-gold-soft/60 hover:bg-gold-soft')}>
      <span className="flex items-center gap-2 font-semibold text-ink">
        {link.icon && <DynamicIcon name={link.icon} className="size-4 text-green" />}
        {link.label}
        {link.soon && <SoonBadge />}
      </span>
      {link.description && <span className="mt-0.5 block text-small text-muted">{link.description}</span>}
    </Link>
  )
}

function ModeChips({ modes, inverse }: { modes: string[]; inverse?: boolean }) {
  const { t } = useI18n()
  if (!modes.length) return null
  return (
    <span className="flex flex-wrap gap-1">
      {modes.map((m) => (
        <span key={m} className={cn('rounded-full px-2 py-0.5 text-caption font-semibold', inverse ? 'bg-white/10 text-white' : m === 'Provided by HagerLand' ? 'bg-green-tint text-green-darker' : m === 'Trusted partners' ? 'bg-gold-soft text-gold-dark' : 'bg-stone-100 text-ink')}>
          {t(m)}
        </span>
      ))}
    </span>
  )
}

function TileLink({ tile, onNavigate }: { tile: ServiceTile; onNavigate: () => void }) {
  return (
    <Link href={tile.href} onClick={onNavigate} className="flex h-full gap-3 rounded-md p-3 hover:bg-stone-100">
      <DynamicIcon name={tile.icon} className="mt-0.5 size-5 shrink-0 text-green" />
      <span className="min-w-0 space-y-1">
        <span className="flex flex-wrap items-center gap-2 font-semibold text-ink">
          {tile.number && <span className="text-caption text-muted">{tile.number}</span>}
          {tile.name}
          {tile.soon && <SoonBadge />}
        </span>
        <span className="block text-small text-muted">{tile.tagline}</span>
        <ModeChips modes={tile.modes} />
      </span>
    </Link>
  )
}

/** "All services": the 10 pillars and the 2 layers, grouped like the ecosystem diagram (spec 26.4). */
function AllServicesPanel({ all, onNavigate }: { all: AllServices; onNavigate: () => void }) {
  const { t } = useI18n()
  return (
    <div className="mx-auto max-w-content space-y-6 px-8 py-8">
      <div>
        <p className="hl-eyebrow mb-2 text-muted">{t('Around the property lifecycle')}</p>
        <ul className="grid gap-1 lg:grid-cols-4">
          {all.pillars.map((tile) => (
            <li key={tile.key}>
              <TileLink tile={tile} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="hl-eyebrow mb-2 text-muted">{t('Ecosystem enablers')}</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {all.enablers.map((tile) => (
              <li key={tile.key}>
                <TileLink tile={tile} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="hl-eyebrow mb-2 text-muted">{t('Across every service')}</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {all.layers.map((tile) => (
              <li key={tile.key}>
                <TileLink tile={tile} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function MegaPanel({ group, onNavigate }: { group: NavGroup; onNavigate: () => void }) {
  const { t } = useI18n()
  return (
    <div className="mx-auto grid max-w-content gap-8 px-8 py-8 lg:grid-cols-[1fr_auto]">
      <div className={cn('grid gap-8', group.featured ? 'lg:grid-cols-[2fr_1fr]' : '')}>
        {group.featured && (
          <div>
            <p className="hl-eyebrow mb-3 text-muted">{t('Shop by category')}</p>
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
          {group.links.map((l) => (
            <li key={l.href}>
              <MenuLink link={l} onNavigate={onNavigate} highlight={l.href.endsWith('/our-developments') && !l.soon} />
            </li>
          ))}
        </ul>
      </div>
      {(group.cta || (group.modes && group.modes.length > 0)) && (
        <div className="flex flex-col items-start gap-4">
          {group.id !== 'more' && (
            <Link href={group.href} onClick={onNavigate} className="inline-flex min-h-11 items-center gap-2 font-semibold text-green hover:underline">
              {t('Overview')}: {group.label}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
          {group.modes && <ModeChips modes={group.modes} />}
          {group.cta && (
          <Link
            href={group.cta.href}
            onClick={onNavigate}
            className="group inline-flex items-center gap-2 rounded-lg bg-green-tint px-5 py-4 font-semibold text-green-darker ring-1 ring-green/15 hover:bg-green-soft"
          >
            {group.cta.label}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
          )}
        </div>
      )}
    </div>
  )
}

export function SiteHeader({ nav: siteNav, amharicOn = false }: { nav: SiteNav; amharicOn?: boolean }) {
  const pathname = usePathname()
  const { t, locale, href } = useI18n()
  const [openId, setOpenId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  // The drawer and search overlay are built the first time they open, not with every page (less work on load).
  const [drawerUsed, setDrawerUsed] = useState(false)
  const [searchUsed, setSearchUsed] = useState(false)
  useEffect(() => {
    if (drawerOpen) setDrawerUsed(true)
    if (searchOpen) setSearchUsed(true)
  }, [drawerOpen, searchOpen])
  const closeTimer = useRef<number | null>(null)
  const headerRef = useRef<HTMLElement>(null)
  const nav = localizeGroups(siteNav.main, t, locale)
  const listWithUs = siteNav.listWithUs.map((l) => localizeLink(l, t, locale))
  const all: AllServices = { pillars: siteNav.all.pillars.map((x) => localizeTile(x, t, locale)), enablers: siteNav.all.enablers.map((x) => localizeTile(x, t, locale)), layers: siteNav.all.layers.map((x) => localizeTile(x, t, locale)) }
  const abroad = siteNav.abroad ? localizeLink(siteNav.abroad, t, locale) : null

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

  // A click right after the hover opened a menu keeps it open instead of closing it again.
  const hoverOpenedAt = useRef(0)
  const hoverOpen = (id: string) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    if (openId !== id) hoverOpenedAt.current = Date.now()
    setOpenId(id)
  }
  const toggle = (id: string) => {
    // A pending hover-close (from leaving another menu) must not close the menu just opened by a click.
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    setOpenId(openId === id && Date.now() - hoverOpenedAt.current > 400 ? null : id)
  }
  const hoverClose = () => {
    closeTimer.current = window.setTimeout(() => setOpenId(null), 150)
  }
  const openGroup = nav.find((g) => g.id === openId)
  const isActive = (g: NavGroup) => Boolean(pathname && (pathname === g.href || pathname.startsWith(`${g.href}/`)))

  return (
    <header ref={headerRef} className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
        {t('Skip to content')}
      </a>
      <div className="mx-auto flex h-16 max-w-content items-center gap-2 px-4 sm:px-6 lg:px-8">
        <Link href={href('/')} aria-label={t('HagerLand home')} className="mr-2 shrink-0">
          <Wordmark />
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-expanded={openId === 'all'}
            aria-controls="all-services-panel"
            onClick={() => toggle('all')}
            className="hidden h-11 items-center gap-1.5 rounded-md px-3 text-small font-semibold text-ink hover:bg-stone-100 lg:inline-flex"
          >
            <LayoutGrid className="size-4 text-green" aria-hidden />
            {t('All services')}
            <ChevronDown className={cn('size-4 transition-transform', openId === 'all' && 'rotate-180')} aria-hidden />
          </button>
          {abroad && (
            <Link href={abroad.href} className="hidden h-11 items-center gap-1.5 rounded-md px-3 text-small font-semibold text-ink hover:bg-stone-100 lg:inline-flex">
              <Globe className="size-4 text-green" aria-hidden />
              {abroad.label}
            </Link>
          )}
          <IconButton label={t('Search')} onClick={() => setSearchOpen(true)}>
            <Search />
          </IconButton>
          {amharicOn && <LanguageSwitch className="hidden px-2 lg:inline-flex" />}
          <AccountLink className="hidden lg:inline-flex" />
          <div className="relative ml-1 hidden lg:block" onMouseLeave={hoverClose}>
            <button
              type="button"
              aria-expanded={openId === 'list'}
              aria-controls="list-with-us-menu"
              onClick={() => toggle('list')}
              onMouseEnter={() => hoverOpen('list')}
              className="inline-flex h-11 items-center gap-1 rounded-md bg-green px-4 font-semibold text-white hover:bg-green-dark"
            >
              {t('List with us')}
              <ChevronDown className={cn('size-4 transition-transform', openId === 'list' && 'rotate-180')} aria-hidden />
            </button>
            {openId === 'list' && (
              <ul id="list-with-us-menu" className="absolute right-0 top-full mt-1 w-64 animate-fade-in rounded-lg border border-border bg-white p-2 shadow-md" onMouseEnter={() => hoverOpen('list')}>
                {listWithUs.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} onClick={() => setOpenId(null)} className="flex min-h-11 items-center justify-between gap-2 rounded-md px-3 font-medium text-ink hover:bg-stone-100">
                      {l.label}
                      {l.soon && <SoonBadge />}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <IconButton label={t('Open menu')} className="lg:hidden" onClick={() => setDrawerOpen(true)}>
            <Menu />
          </IconButton>
        </div>
      </div>

      <nav aria-label="Main" className="hidden border-t border-border lg:block" onMouseLeave={hoverClose}>
        <ul className="mx-auto flex h-12 max-w-content items-center gap-0.5 px-6 lg:px-8">
          {nav.map((g) => (
            <li key={g.id} onMouseEnter={() => (g.links.length === 0 ? setOpenId(null) : hoverOpen(g.id))}>
              {g.links.length === 0 ? (
                <Link href={g.href} className={cn('inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-small font-semibold hover:bg-stone-100 xl:px-3 xl:text-[0.9375rem]', isActive(g) ? 'text-ink' : 'text-ink/80')}>
                  {g.label}
                  {g.soon && <SoonBadge />}
                </Link>
              ) : (
                <button
                  type="button"
                  aria-expanded={openId === g.id}
                  aria-controls="mega-panel"
                  onClick={() => toggle(g.id)}
                  className={cn('inline-flex h-11 items-center gap-1 whitespace-nowrap rounded-md px-2.5 text-small font-semibold transition-colors hover:bg-stone-100 xl:px-3 xl:text-[0.9375rem]', isActive(g) || openId === g.id ? 'text-ink' : 'text-ink/80')}
                >
                  {g.label}
                  {g.soon && <SoonBadge />}
                  <ChevronDown className={cn('size-4 transition-transform', openId === g.id && 'rotate-180')} aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
        {openGroup && openGroup.links.length > 0 && (
          <div id="mega-panel" className="absolute inset-x-0 top-full animate-fade-in border-b border-border bg-white shadow-md" onMouseEnter={() => hoverOpen(openGroup.id)}>
            <MegaPanel group={openGroup} onNavigate={() => setOpenId(null)} />
          </div>
        )}
      </nav>
      {openId === 'all' && (
        <div id="all-services-panel" className="absolute inset-x-0 top-full z-10 hidden animate-fade-in border-b border-border bg-white shadow-md lg:block" role="region" aria-label={t('All services')}>
          <AllServicesPanel all={all} onNavigate={() => setOpenId(null)} />
        </div>
      )}

      {(drawerOpen || drawerUsed) && <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} nav={siteNav} amharicOn={amharicOn} />}
      {(searchOpen || searchUsed) && <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />}
    </header>
  )
}
