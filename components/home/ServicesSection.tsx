import Link from 'next/link'
import { ArrowRight, Globe, HardHat } from 'lucide-react'
import type { AllServices, ServiceTile } from '@/lib/navigation'
import { Container } from '@/components/ui/Layout'
import { DynamicIcon } from '@/components/ui/DynamicIcon'
import { SoonBadge } from '@/components/verticals/SoonBadge'

type T = (s: string) => string

function ServiceCard({ tile, t, lh }: { tile: ServiceTile; t: T; lh: (h: string) => string }) {
  return (
    <Link href={lh(tile.href)} className="group flex h-full gap-4 rounded-xl border border-border bg-white p-4 shadow-xs transition-[border-color,box-shadow] hover:border-green/40 hover:shadow-md sm:flex-col sm:gap-0 sm:p-6">
      <span className="flex shrink-0 items-start justify-between gap-3">
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
    <section aria-labelledby="services-title" className="bg-white py-16 sm:py-24">
      <Container>
        <div className="max-w-2xl">
          <h2 id="services-title" className="hl-h2">
            {t('Everything your property needs')}
          </h2>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-muted sm:text-lg">{t('Buy, rent, build, manage and maintain property in Ethiopia, supported by our own team and verified professionals.')}</p>
        </div>

        <div className="mt-10 divide-y divide-border sm:mt-16">
          {all.groups.map((g) => (
            <div key={g.id} className="grid gap-4 py-8 first:pt-0 last:pb-0 sm:gap-6 sm:py-9 lg:grid-cols-[minmax(0,15rem)_1fr] lg:gap-10">
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
          <div className="mt-16 grid gap-5 sm:mt-20 lg:grid-cols-2">
            {all.diaspora && (
              <div className="flex flex-col rounded-2xl bg-gold-soft p-7 sm:p-10">
                <span className="flex size-12 items-center justify-center rounded-xl bg-white text-gold-dark shadow-xs">
                  <Globe className="size-6" aria-hidden />
                </span>
                <h3 className="mt-6 font-display text-h3 font-bold text-ink lg:text-h3-lg">{t('Living abroad? We act as your hands on the ground in Ethiopia.')}</h3>
                <p className="mt-3 flex-1 text-ink/80">{t('Buy, build or look after property at home without travelling for every step. One accountable team, with photo reports and clear statements, instead of relying on friends and relatives.')}</p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row [&>*]:sm:flex-1">
                  <Link href={lh(all.diaspora.href)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-ink px-5 font-semibold text-white hover:bg-ink/90">
                    {t('See how we help')}
                    {all.diaspora.soon && <SoonBadge />}
                  </Link>
                  <Link href={lh('/diaspora/property-care')} className="inline-flex min-h-12 items-center justify-center rounded-md bg-white px-5 font-semibold text-ink ring-1 ring-ink/15 hover:bg-white/70">
                    {t('HagerLand Property Care')}
                  </Link>
                </div>
              </div>
            )}
            {all.professionals && (
              <div className="hl-blueprint flex flex-col rounded-2xl bg-ink p-7 text-white sm:p-10">
                <span className="flex size-12 items-center justify-center rounded-xl bg-white/10 text-gold">
                  <HardHat className="size-6" aria-hidden />
                </span>
                <h3 className="mt-6 font-display text-h3 font-bold text-white lg:text-h3-lg">{t('Are you a professional or supplier? Reach customers across Ethiopia and abroad.')}</h3>
                <p className="mt-3 flex-1 text-white/80">
                  {t('Architects, engineers, contractors, estate agents, tradespeople and suppliers: show your work, get verified and receive enquiries from people ready to buy, build and renovate.')}
                  {freeListing && ` ${t('Listing is free while we launch.')}`}
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row [&>*]:sm:flex-1">
                  <Link href={lh('/list-with-us#professionals')} className="inline-flex min-h-12 items-center justify-center rounded-md bg-gold px-5 font-semibold text-ink hover:bg-gold/90">
                    {t('List your business')}
                  </Link>
                  <Link href={lh(all.professionals.href)} className="inline-flex min-h-12 items-center justify-center rounded-md px-5 font-semibold text-white ring-1 ring-white/30 hover:bg-white/10">
                    {t('Browse professionals')}
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </Container>
    </section>
  )
}
