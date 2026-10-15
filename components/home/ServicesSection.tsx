import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { AllServices, ServiceTile } from '@/lib/navigation'
import { Container } from '@/components/ui/Layout'
import { DynamicIcon } from '@/components/ui/DynamicIcon'
import { SoonBadge } from '@/components/verticals/SoonBadge'
import { ButtonLink } from '@/components/ui/Button'

type T = (s: string) => string

function ServiceCard({ tile, t, lh }: { tile: ServiceTile; t: T; lh: (h: string) => string }) {
  return (
    <Link href={lh(tile.href)} className="group flex h-full items-start gap-4 rounded-xl border border-border bg-white p-5 transition-colors hover:border-green/50 sm:flex-col sm:items-stretch sm:gap-0 sm:p-6">
      <span className="flex shrink-0 items-center justify-between gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-green-tint text-green">
          <DynamicIcon name={tile.icon} className="size-5" />
        </span>
        {tile.soon && <SoonBadge long className="hidden sm:inline-flex" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-display text-[1.125rem] font-bold leading-snug text-ink sm:mt-5 sm:text-[1.1875rem]">{t(tile.name)}</span>
        {tile.soon && <SoonBadge long className="mt-1.5 self-start sm:hidden" />}
        <span className="mt-1.5 flex-1 text-muted sm:mt-2">{t(tile.tagline)}</span>
        <span className="mt-3 inline-flex items-center gap-1.5 font-semibold text-green sm:mt-5">
          {t(tile.action)}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </span>
    </Link>
  )
}

/**
 * "Everything your property needs" (homepage): the ten services in four customer groups, then two invitations,
 * for people living abroad and for professionals and suppliers. Plain customer language only; "Coming soon"
 * is the one availability label visitors see.
 */
export function ServicesSection({ all, t, lh, freeListing }: { all: AllServices; t: T; lh: (h: string) => string; freeListing: boolean }) {
  return (
    <section aria-labelledby="services-title" className="bg-white py-14 sm:py-20">
      <Container>
        <div className="max-w-2xl">
          <h2 id="services-title" className="hl-h2">
            {t('Everything your property needs')}
          </h2>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-muted sm:text-lg">{t('Buy, rent, build, manage and maintain property in Ethiopia, supported by our own team and verified professionals.')}</p>
        </div>

        <div className="mt-8 space-y-10 sm:mt-10 sm:space-y-14">
          {all.groups.map((g) => (
            <div key={g.id} className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,15rem)_1fr] lg:gap-10">
              <div className="lg:pt-2">
                <h3 className="font-display text-h3 font-bold text-ink">{t(g.title)}</h3>
                <p className="mt-2 text-muted">{t(g.text)}</p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                {g.tiles.map((tile) => (
                  <li key={tile.key}>
                    <ServiceCard tile={tile} t={t} lh={lh} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {(all.diaspora || all.professionals) && (
          <div className="mt-14 grid gap-4 sm:mt-20 lg:grid-cols-2">
            {all.diaspora && (
              <div className="flex flex-col rounded-xl bg-gold-soft p-7 sm:p-10">
                <h3 className="hl-h3 text-ink">{t('Living abroad? We act as your hands on the ground in Ethiopia.')}</h3>
                <p className="mt-3 flex-1 text-ink/80">{t('Buy, build or look after property at home without travelling for every step. One accountable team, with photo reports and clear statements, instead of relying on friends and relatives.')}</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row [&>*]:sm:flex-1">
                  <ButtonLink href={lh(all.diaspora.href)} size="lg">
                    {t('See how we help')}
                    {all.diaspora.soon && <SoonBadge />}
                  </ButtonLink>
                  <ButtonLink href={lh('/diaspora/property-care')} variant="secondary" size="lg">
                    {t('HagerLand Property Care')}
                  </ButtonLink>
                </div>
              </div>
            )}
            {all.professionals && (
              <div className="hl-blueprint flex flex-col rounded-xl bg-ink p-7 text-white sm:p-10">
                <h3 className="hl-h3 text-white">{t('Are you a professional or supplier? Reach customers across Ethiopia and abroad.')}</h3>
                <p className="mt-3 flex-1 text-white/80">
                  {t('Architects, engineers, contractors, estate agents, tradespeople and suppliers: show your work, get verified and receive enquiries from people ready to buy, build and renovate.')}
                  {freeListing && ` ${t('Listing is free while we launch.')}`}
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row [&>*]:sm:flex-1">
                  <ButtonLink href={lh('/list-with-us#professionals')} variant="gold" size="lg">
                    {t('List your business')}
                  </ButtonLink>
                  <ButtonLink href={lh(all.professionals.href)} variant="outline-inverse" size="lg">
                    {t('Browse professionals')}
                  </ButtonLink>
                </div>
              </div>
            )}
          </div>
        )}
      </Container>
    </section>
  )
}
