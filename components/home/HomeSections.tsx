import Link from 'next/link'
import type { ReactNode } from 'react'
import type { AllServices, ServiceTile } from '@/lib/navigation'
import { HOME_FEATURES, HOME_INDEX } from '@/lib/content/services'
import { Container } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { Visual } from '@/components/visuals/Visual'
import { FloorPlanDrawing, GlobeRouteDrawing, SectionDrawing, SkylineDrawing, TibebBand, VillaDrawing } from '@/components/visuals/Drawings'
import { cn } from '@/lib/cn'

type T = (s: string) => string
type Lh = (h: string) => string

/** Text link in the round 2 style: green, underlined on hover, no arrow (arrows are kept for one primary action). */
function ActionLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn('inline-flex min-h-11 items-center font-semibold text-green underline decoration-green/30 underline-offset-4 hover:decoration-green', className)}>
      {children}
    </Link>
  )
}

/**
 * Hero: deep forest on the blueprint grid. Headline and line on the left, the skyline drawing on the right standing on
 * the same baseline, and the search card across the full width below. On phones: text, search, then the drawing as a
 * wide strip standing on the tibeb band.
 */
export function HomeHero({ eyebrow, title, line, search }: { eyebrow: string; title: string; line: string; search: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-forest text-white">
      <div className="hl-blueprint absolute inset-0" aria-hidden />
      <Container className="relative grid grid-cols-1 gap-x-10 pt-12 sm:pt-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:pt-20">
        <div className="lg:col-start-1 lg:row-start-1 lg:self-end">
          <p className="font-medium text-gold-pale">{eyebrow}</p>
          <h1 className="mt-4 max-w-[18ch] font-serif text-serif-display font-normal text-white sm:text-[3.5rem] sm:leading-[1.03] xl:text-serif-display-lg">{title}</h1>
          <p className="mt-6 max-w-[34rem] text-lead text-white/80 sm:text-lead-lg">{line}</p>
        </div>
        <div className="mt-10 lg:col-span-2 lg:row-start-2 lg:mt-12">
          <div className="max-w-[56rem]">{search}</div>
        </div>
        <div className="-mx-4 mt-12 sm:mx-0 lg:col-start-2 lg:row-start-1 lg:-mr-6 lg:mt-0 lg:self-end">
          <Visual slot="hero" bare priority sizes="(min-width: 1024px) 45vw, 100vw" className="aspect-[720/440] w-full" drawing={<SkylineDrawing animate className="text-gold" />} />
        </div>
      </Container>
      <div className="h-10 sm:h-14 lg:h-16" aria-hidden />
      <TibebBand id="hero" className="relative" />
    </section>
  )
}

const DRAWINGS: Record<(typeof HOME_FEATURES)[number]['id'], ReactNode> = {
  'buy-rent': <FloorPlanDrawing className="max-h-[22rem]" />,
  build: <SectionDrawing className="max-h-[22rem]" />,
  care: <VillaDrawing className="max-h-[22rem]" />,
}

/** "Everything your property needs": three feature sections with drawings, then the index of the other services. */
export function ServicesShowcase({ all, t, lh }: { all: AllServices; t: T; lh: Lh }) {
  const tiles = new Map<string, ServiceTile>(all.groups.flatMap((g) => g.tiles).map((x) => [x.key, x]))
  const features = HOME_FEATURES.map((f) => ({ ...f, tiles: f.keys.map((k) => tiles.get(k)).filter((x): x is ServiceTile => Boolean(x)) })).filter((f) => f.tiles.length > 0)
  const index = HOME_INDEX.keys.map((k) => tiles.get(k)).filter((x): x is ServiceTile => Boolean(x))
  return (
    <section aria-labelledby="services-title">
      <Container className="pt-20 sm:pt-28">
        <h2 id="services-title" className="max-w-[18ch] font-serif text-serif-h2 font-normal text-ink lg:text-serif-h2-lg">
          {t('Everything your property needs')}
        </h2>
        <p className="mt-5 max-w-[36rem] text-lead text-muted">{t('Buy, rent, build, manage and maintain property in Ethiopia, supported by our own team and verified professionals.')}</p>
      </Container>

      {features.map((f, i) => (
        <div key={f.id} className={cn('py-16 sm:py-24', i % 2 === 1 && 'bg-mist')}>
          <Container className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16">
            <Visual slot={f.id} drawing={DRAWINGS[f.id]} className={cn('aspect-[4/3] sm:aspect-[16/9] lg:col-span-6 lg:aspect-[5/4]', i % 2 === 1 && 'lg:order-2')} />
            <div className={cn('lg:col-span-6 xl:col-span-5', i % 2 === 1 ? 'lg:order-1' : 'xl:col-start-8')}>
              <h3 className="font-serif text-serif-h3 font-normal text-ink lg:text-serif-h3-lg">{t(f.title)}</h3>
              <p className="mt-3 max-w-[32rem] text-muted">{t(f.text)}</p>
              <ul className="mt-8 divide-y divide-border border-y border-border">
                {f.tiles.map((tile) => (
                  <li key={tile.key} className="py-5">
                    <h4 className="font-serif text-[1.3125rem] font-medium leading-snug text-ink">{t(tile.name)}</h4>
                    <p className="mt-1 text-muted">{t(tile.tagline)}</p>
                    <ActionLink href={lh(tile.href)} className="mt-1">
                      {t(tile.action)}
                    </ActionLink>
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </div>
      ))}

      {index.length > 0 && (
        <Container className="py-16 sm:py-24">
          <h3 className="font-serif text-serif-h3 font-normal text-ink lg:text-serif-h3-lg">{t(HOME_INDEX.title)}</h3>
          <ul className="mt-8 border-t border-ink/15">
            {index.map((tile) => (
              <li key={tile.key} className="grid gap-1 border-b border-border py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] md:items-baseline md:gap-8">
                <h4 className="font-serif text-[1.375rem] font-normal leading-snug text-ink">
                  {t(tile.name)}
                  {tile.soon && <span className="ml-3 align-middle font-sans text-small font-medium text-gold-dark">{t('Coming soon')}</span>}
                </h4>
                <p className="text-muted">{t(tile.tagline)}</p>
                <ActionLink href={lh(tile.href)} className="md:justify-self-end">
                  {t(tile.action)}
                </ActionLink>
              </li>
            ))}
          </ul>
        </Container>
      )}
    </section>
  )
}

/** Living abroad: a full-width forest band with the globe and route home. */
export function AbroadMoment({ tile, t, lh }: { tile: ServiceTile; t: T; lh: Lh }) {
  return (
    <section aria-labelledby="abroad-title" className="bg-forest text-white">
      <Container className="grid grid-cols-1 items-center gap-10 py-16 sm:py-24 lg:grid-cols-12 lg:gap-16">
        <Visual slot="abroad" drawing={<GlobeRouteDrawing className="max-h-[20rem]" />} className="aspect-[4/3] bg-forest-2 sm:aspect-[16/9] lg:col-span-5 lg:aspect-[5/4]" />
        <div className="lg:col-span-6 lg:col-start-7">
          <h2 id="abroad-title" className="font-serif text-serif-h2 font-normal text-white lg:text-serif-h2-lg">
            {t('Living abroad? We act as your hands on the ground in Ethiopia.')}
          </h2>
          <p className="mt-5 max-w-[34rem] text-lead text-white/80">{t('Buy, build or look after property at home without travelling for every step. One accountable team, with photo reports and clear statements, instead of relying on friends and relatives.')}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row [&>*]:sm:flex-1 lg:max-w-[30rem]">
            <ButtonLink href={lh(tile.href)} variant="gold" size="lg">
              {t('See how we help')}
            </ButtonLink>
            <ButtonLink href={lh('/diaspora/property-care')} variant="outline-inverse" size="lg">
              {t('HagerLand Property Care')}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  )
}

const TRADES: [string, string][] = [
  ['Architects', 'architects'],
  ['Contractors', 'building-contracting'],
  ['Engineers', 'design-consultancy'],
  ['Electricians', 'electricians'],
  ['Plumbers', 'plumbers'],
  ['Interior designers', 'interior-designers'],
  ['Solar installers', 'solar-installers'],
  ['Welders', 'welders'],
]

/** Professionals and suppliers: one moment for hiring them and for joining HagerLand. */
export function ProfessionalsMoment({ t, lh, freeListing, showTrades }: { t: T; lh: Lh; freeListing: boolean; showTrades: boolean }) {
  return (
    <section aria-labelledby="pros-title" className="border-t border-gold/40">
      <Container className="grid grid-cols-1 gap-14 py-16 sm:py-24 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6">
          <h2 id="pros-title" className="font-serif text-serif-h2 font-normal text-ink lg:text-serif-h2-lg">
            {t('Are you a professional or supplier? Reach customers across Ethiopia and abroad.')}
          </h2>
          <p className="mt-5 max-w-[34rem] text-lead text-muted">
            {t('Architects, engineers, contractors, estate agents, tradespeople and suppliers: show your work, get verified and receive enquiries from people ready to buy, build and renovate.')}
            {freeListing && ` ${t('Listing is free while we launch.')}`}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row [&>*]:sm:flex-1 lg:max-w-[30rem]">
            <ButtonLink href={lh('/list-with-us#professionals')} size="lg">
              {t('List your business')}
            </ButtonLink>
            <ButtonLink href={lh('/list-with-us#agents')} variant="secondary" size="lg">
              {t('Agents & developers')}
            </ButtonLink>
          </div>
        </div>
        {showTrades && (
          <div className="lg:col-span-5 lg:col-start-8">
            <h3 className="font-serif text-serif-h3 font-normal text-ink">{t('Hire trusted professionals')}</h3>
            <p className="mt-2 text-muted">{t('Tell us what you need and get quotes from up to three professionals, or browse by trade.')}</p>
            <ul className="mt-6 grid grid-cols-2 border-t border-border">
              {TRADES.map(([label, slug]) => (
                <li key={slug} className="border-b border-border">
                  <Link href={lh(`/professionals/${slug}`)} className="flex min-h-12 items-center text-ink hover:text-green">
                    {t(label)}
                  </Link>
                </li>
              ))}
            </ul>
            <ActionLink href={lh('/professionals')} className="mt-3">
              {t('All professionals')}
            </ActionLink>
          </div>
        )}
      </Container>
    </section>
  )
}

/** A section heading in the round 2 serif, with an optional action on the right. */
export function SerifHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <h2 className="font-serif text-serif-h2 font-normal text-ink lg:text-serif-h2-lg">{title}</h2>
      {action}
    </div>
  )
}

/** Our standards: a quiet row with fine gold rules, no icons. */
export function StandardsRow({ points }: { points: { title: string; text: string }[] }) {
  return (
    <section aria-label="Our standards" className="bg-mist">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 sm:py-20 lg:grid-cols-4">
        {points.map((p) => (
          <div key={p.title}>
            <span className="block h-px w-12 bg-gold" aria-hidden />
            <h3 className="mt-5 font-serif text-[1.3125rem] font-medium text-ink">{p.title}</h3>
            <p className="mt-2 text-muted">{p.text}</p>
          </div>
        ))}
      </Container>
    </section>
  )
}
