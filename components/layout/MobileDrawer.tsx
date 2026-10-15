'use client'

import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { buildListWithUs, DRAWER_EXTRAS, verticalLinks } from '@/lib/navigation'
import { verticalHref, type Vertical } from '@/lib/verticals'
import { Dialog } from '@/components/ui/Dialog'
import { ButtonLink } from '@/components/ui/Button'
import { DynamicIcon } from '@/components/ui/DynamicIcon'
import { SoonBadge } from '@/components/verticals/SoonBadge'
import { AccountLink } from './AccountLink'
import { LanguageSwitch } from './LanguageSwitch'
import { useI18n } from '@/lib/i18n/client'
import { localizeLink } from '@/lib/i18n/nav'

/** Mobile menu: every visible vertical, then service shortcuts and "List with us" (spec 24.3). */
export function MobileDrawer({ open, onClose, verticals, amharicOn = false }: { open: boolean; onClose: () => void; verticals: Vertical[]; amharicOn?: boolean }) {
  const { t, locale, href } = useI18n()
  const listWithUs = buildListWithUs(verticals).map((l) => localizeLink(l, t, locale))
  const extras = DRAWER_EXTRAS.map((l) => localizeLink(l, t, locale))
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
        <ul className="-mx-2 divide-y divide-border">
          {verticals.map((v) => {
            const links = verticalLinks(verticals, v.key)
              .filter((l) => l.href !== verticalHref(v))
              .map((l) => localizeLink(l, t, locale))
            const vHref = href(verticalHref(v))
            const label = (
              <span className="flex items-center gap-3">
                <DynamicIcon name={v.icon} className="size-5 text-green" />
                {t(v.name)}
                {v.status === 'coming_soon' && <SoonBadge />}
              </span>
            )
            return (
              <li key={v.key}>
                {links.length === 0 ? (
                  <Link href={vHref} onClick={onClose} className="flex min-h-14 items-center px-2 text-body font-semibold">
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
                        <Link href={vHref} onClick={onClose} className="flex min-h-11 items-center rounded-md px-4 font-semibold text-green">
                          {locale === 'am' ? t(v.name) : `All of ${v.name}`}
                        </Link>
                      </li>
                      {links.map((l) => (
                        <li key={`${v.key}-${l.href}`}>
                          <Link href={l.href} onClick={onClose} className="flex min-h-11 items-center rounded-md px-4 text-ink hover:bg-stone-100">
                            {l.label}
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
