'use client'

import Link from 'next/link'
import { ChevronDown, Globe } from 'lucide-react'
import type { SiteNav } from '@/lib/navigation'
import { Dialog } from '@/components/ui/Dialog'
import { ButtonLink } from '@/components/ui/Button'
import { DynamicIcon } from '@/components/ui/DynamicIcon'
import { SoonBadge } from '@/components/verticals/SoonBadge'
import { AccountLink } from './AccountLink'
import { LanguageSwitch } from './LanguageSwitch'
import { useI18n } from '@/lib/i18n/client'
import { localizeLink, localizeTile } from '@/lib/i18n/nav'

/** Mobile menu: every visible pillar and both layers with their links, then shortcuts and "List with us" (spec 26.4). */
export function MobileDrawer({ open, onClose, nav, amharicOn = false }: { open: boolean; onClose: () => void; nav: SiteNav; amharicOn?: boolean }) {
  const { t, locale, href } = useI18n()
  const listWithUs = nav.listWithUs.map((l) => localizeLink(l, t, locale))
  const extras = nav.extras.map((l) => localizeLink(l, t, locale))
  const abroad = nav.abroad ? localizeLink(nav.abroad, t, locale) : null
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('Menu')}
      variant="drawer"
      footer={
        <div className="flex gap-2 [&>*]:flex-1">
          <AccountLink className="justify-center border border-border-strong" />
          <ButtonLink href={href('/signup')} variant="secondary">
            {t('Create account')}
          </ButtonLink>
        </div>
      }
    >
      <nav aria-label="Mobile">
        {abroad && (
          <Link href={abroad.href} onClick={onClose} className="mb-3 flex min-h-12 items-center gap-3 rounded-lg bg-green-tint px-4 font-semibold text-green-darker">
            <Globe className="size-5" aria-hidden />
            {abroad.label}
          </Link>
        )}
        <ul className="-mx-2 divide-y divide-border">
          {nav.drawer.map(({ tile: raw, links: rawLinks }) => {
            const tile = localizeTile(raw, t, locale)
            const links = rawLinks.filter((l) => l.href !== raw.href).map((l) => localizeLink(l, t, locale))
            const label = (
              <span className="flex items-center gap-3">
                <DynamicIcon name={tile.icon} className="size-5 text-green" />
                {tile.name}
                {tile.soon && <SoonBadge />}
              </span>
            )
            return (
              <li key={tile.key}>
                {links.length === 0 ? (
                  <Link href={tile.href} onClick={onClose} className="flex min-h-14 items-center px-2 text-body font-semibold">
                    {label}
                  </Link>
                ) : (
                  <details className="group">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-2 text-body font-semibold [&::-webkit-details-marker]:hidden">
                      {label}
                      <ChevronDown className="size-5 text-muted transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <ul className="pb-3">
                      <li>
                        <Link href={tile.href} onClick={onClose} className="flex min-h-11 items-center rounded-md px-4 font-semibold text-green">
                          {t('Explore')} {tile.name}
                        </Link>
                      </li>
                      {links.map((l) => (
                        <li key={`${tile.key}-${l.href}`}>
                          <Link href={l.href} onClick={onClose} className="flex min-h-11 items-center justify-between gap-2 rounded-md px-4 text-ink hover:bg-stone-100">
                            {l.label}
                            {l.soon && <SoonBadge />}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            )
          })}
        </ul>
        <ul className="mt-4 grid grid-cols-2 gap-2">
          {extras.map((l) => (
            <li key={l.href}>
              <Link href={l.href} onClick={onClose} className="flex min-h-11 items-center justify-center rounded-md bg-stone-100 px-3 text-center text-small font-semibold text-ink">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <details className="group mt-4 rounded-lg border border-border">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold text-green [&::-webkit-details-marker]:hidden">
            {t('List with us')}
            <ChevronDown className="size-5 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <ul className="pb-2">
            {listWithUs.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={onClose} className="flex min-h-11 items-center justify-between gap-2 px-4 text-ink hover:bg-stone-100">
                  {l.label}
                  {l.soon && <SoonBadge />}
                </Link>
              </li>
            ))}
          </ul>
        </details>
        {amharicOn && <LanguageSwitch className="mt-4 px-2" />}
      </nav>
    </Dialog>
  )
}
