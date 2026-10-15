import Link from 'next/link'
import { brand } from '@/lib/brand'
import { getBusinessDetails } from '@/lib/data/business'
import { buildFooterColumns } from '@/lib/navigation'
import { getVerticals } from '@/lib/data/verticals'
import { SoonBadge } from '@/components/verticals/SoonBadge'
import { CurrencySwitcher } from '@/components/currency/CurrencySwitcher'
import { Wordmark } from '@/components/brand/Logo'
import { SocialIcon, socialLabel } from '@/components/brand/SocialIcon'
import { Container } from '@/components/ui/Layout'
import { getLocale } from '@/lib/i18n/server'
import { translator } from '@/lib/i18n/translate'
import { localizeHref } from '@/lib/i18n/config'
import { localizeLink } from '@/lib/i18n/nav'
import { LanguageSwitch } from './LanguageSwitch'

export async function SiteFooter({ amharicOn = false }: { amharicOn?: boolean }) {
  const [business, verticals] = await Promise.all([getBusinessDetails(), getVerticals()])
  const locale = await getLocale()
  const t = translator(locale)
  const columns = buildFooterColumns(verticals).map((c) => ({ title: t(c.title), links: c.links.map((l) => localizeLink(l, t, locale)) }))
  const socials = business.social
  const year = new Date().getFullYear()
  return (
    <footer className="bg-ink text-white">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <Wordmark inverse />
            <p className="mt-4 max-w-xs font-display font-bold text-white">{t(brand.masterLine)}</p>
            <p className="mt-2 max-w-xs text-small text-white/75">{t(brand.supportLine)}</p>
            <p className="mt-2 max-w-xs text-small text-gold">{t(brand.audienceLine)}</p>
            <CurrencySwitcher className="mt-6" />
            {amharicOn && <LanguageSwitch inverse className="mt-4" />}
            {socials.length > 0 && (
              <ul className="mt-6 flex gap-2">
                {socials.map((s) => (
                  <li key={s.key}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${brand.name} on ${socialLabel(s.key)}`}
                      className="inline-flex size-11 items-center justify-center rounded-md bg-white/10 hover:bg-white/20"
                    >
                      <SocialIcon name={s.key} className="size-5" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="font-display text-body font-bold text-white">{col.title}</h2>
              <ul className="mt-4 space-y-1">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="inline-flex min-h-9 items-center gap-2 text-white/75 hover:text-white">
                      {l.label}
                      {l.soon && <SoonBadge />}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-3 py-6 text-small text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {brand.name}
            {business.legalLine && <span> · {business.legalLine}</span>}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            <li><Link href={localizeHref('/terms', locale)} className="hover:text-white">{t('Terms')}</Link></li>
            <li><Link href={localizeHref('/privacy', locale)} className="hover:text-white">{t('Privacy')}</Link></li>
            <li><Link href={localizeHref('/cookies', locale)} className="hover:text-white">{t('Cookies')}</Link></li>
          </ul>
        </Container>
      </div>
    </footer>
  )
}
