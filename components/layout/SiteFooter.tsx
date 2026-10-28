import Link from 'next/link'
import { brand } from '@/lib/brand'
import { getBusinessDetails } from '@/lib/data/business'
import { buildFooterColumns } from '@/lib/navigation'
import { getVerticals } from '@/lib/data/verticals'
import { getPillars } from '@/lib/data/pillars'
import { SoonBadge } from '@/components/verticals/SoonBadge'
import { CurrencySwitcher } from '@/components/currency/CurrencySwitcher'
import { Wordmark } from '@/components/brand/Logo'
import { SocialIcon, socialLabel } from '@/components/brand/SocialIcon'
import { Container } from '@/components/ui/Layout'
import { getI18n } from '@/lib/i18n/server'
import { localizeLink } from '@/lib/i18n/nav'
import { LanguageSwitch } from './LanguageSwitch'
import { licenceText } from '@/components/content/LicenceNote'

export async function SiteFooter({ amharicOn = false }: { amharicOn?: boolean }) {
  const [business, verticals, pillars] = await Promise.all([getBusinessDetails(), getVerticals(), getPillars()])
  const { locale, scope, t, href } = await getI18n()
  const columns = buildFooterColumns(pillars, verticals).map((c) => ({ title: t(c.title), links: c.links.map((l) => localizeLink(l, t, locale, scope)) }))
  const socials = business.social
  const year = new Date().getFullYear()
  return (
    <footer className="bg-ink text-white">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <Wordmark inverse />
            <p className="mt-4 max-w-xs font-display font-bold text-white">{t(brand.masterLine)}</p>
            <p className="mt-3 max-w-xs text-small leading-relaxed text-white/75">{t(brand.supportLine)}</p>
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
              <ul className="mt-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="inline-block py-[11px] leading-snug text-white/75 hover:text-white">
                      {l.label}
                      {l.soon && <SoonBadge className="ml-2 align-[0.1em]" />}
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
            {business.licences.estate_agency && <span data-testid="footer-licence"> · {licenceText('estate_agency', business.licences.estate_agency)}</span>}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            <li><Link href={href('/terms')} className="hover:text-white">{t('Terms')}</Link></li>
            <li><Link href={href('/privacy')} className="hover:text-white">{t('Privacy')}</Link></li>
            <li><Link href={href('/cookies')} className="hover:text-white">{t('Cookies')}</Link></li>
          </ul>
        </Container>
      </div>
    </footer>
  )
}
