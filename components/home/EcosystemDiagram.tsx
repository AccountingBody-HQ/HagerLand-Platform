import Link from 'next/link'
import { ArrowRight, House } from 'lucide-react'
import type { AllServices, ServiceTile } from '@/lib/navigation'
import { JOURNEY, MODE_LABELS, pillarHref, type Pillar } from '@/lib/pillars'
import { DynamicIcon } from '@/components/ui/DynamicIcon'
import { SoonBadge } from '@/components/verticals/SoonBadge'
import { cn } from '@/lib/cn'

/** Ring positions from the diagram: 1 at the top, then clockwise to 8 (top left). Literal classes for Tailwind. */
const RING: Record<number, string> = {
  1: 'lg:col-start-2 lg:row-start-1',
  2: 'lg:col-start-3 lg:row-start-1',
  3: 'lg:col-start-3 lg:row-start-2',
  4: 'lg:col-start-3 lg:row-start-3',
  5: 'lg:col-start-2 lg:row-start-3',
  6: 'lg:col-start-1 lg:row-start-3',
  7: 'lg:col-start-1 lg:row-start-2',
  8: 'lg:col-start-1 lg:row-start-1',
}

function ModeLine({ tile }: { tile: ServiceTile }) {
  if (tile.soon) return <SoonBadge long />
  if (!tile.modes.length) return null
  return (
    <span className="flex flex-wrap gap-1">
      {tile.modes.map((m) => (
        <span key={m} className={cn('rounded-full px-2 py-0.5 text-caption font-semibold', m === MODE_LABELS.direct ? 'bg-green-tint text-green-darker' : m === MODE_LABELS.aggregate ? 'bg-gold-soft text-gold-dark' : 'bg-stone-100 text-ink')}>
          {m}
        </span>
      ))}
    </span>
  )
}

function PillarCard({ tile, t, lh }: { tile: ServiceTile; t: (s: string) => string; lh: (h: string) => string }) {
  return (
    <Link href={lh(tile.href)} className="group flex h-full flex-col gap-2 rounded-xl border border-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md focus-visible:shadow-md">
      <span className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink font-display text-small font-extrabold text-white" aria-hidden>
          {tile.number}
        </span>
        <DynamicIcon name={tile.icon} className="size-5 shrink-0 text-green" />
        <span className="font-display font-bold leading-tight text-ink">{t(tile.name)}</span>
      </span>
      <span className="text-small text-muted">{t(tile.tagline)}</span>
      <span className="mt-auto">
        <ModeLine tile={{ ...tile, modes: tile.modes.map(t) }} />
      </span>
    </Link>
  )
}

function LayerCard({ tile, t, lh, points }: { tile: ServiceTile; t: (s: string) => string; lh: (h: string) => string; points: string[] }) {
  return (
    <Link href={lh(tile.href)} className="group flex h-full flex-col gap-3 rounded-xl border border-green/20 bg-green-tint p-5 hover:border-green">
      <span className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-white text-green">
          <DynamicIcon name={tile.icon} className="size-5" />
        </span>
        <span className="font-display font-bold text-ink">{t(tile.name)}</span>
      </span>
      <span className="text-caption font-semibold uppercase tracking-wide text-green-darker">{tile.key === 'diaspora' ? t('Cross-cutting customer layer') : t('Cross-cutting supply layer')}</span>
      <ul className="space-y-1 text-small text-muted">
        {points.map((p) => (
          <li key={p}>{t(p)}</li>
        ))}
      </ul>
      {tile.soon && <SoonBadge long />}
      <span className="mt-auto inline-flex items-center gap-1 text-small font-semibold text-green">
        {t('Explore')} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  )
}

const LAYER_POINTS: Record<string, string[]> = {
  diaspora: ['International buyers and investors', 'Overseas tenants and landlords', 'Remote management and support'],
  professionals: ['Built-environment professionals', 'Agents and advisers', 'Trades and contractors', 'Specialist service providers'],
}

/**
 * The property ecosystem from AB's diagram as accessible HTML (spec 26.4): the PROPERTY nucleus, the eight lifecycle
 * pillars around it in reading order 1–8, the two enablers, the two cross-cutting layers and the journey strip.
 * On phones it is a plain numbered list; from 1024 px the same list is placed in a ring with CSS grid, so keyboard and
 * screen-reader order always follows the pillar numbers.
 */
export function EcosystemDiagram({ all, pillars, t, lh }: { all: AllServices; pillars: Pillar[]; t: (s: string) => string; lh: (h: string) => string }) {
  const diaspora = all.layers.find((l) => l.key === 'diaspora')
  const pros = all.layers.find((l) => l.key === 'professionals')
  const journey = JOURNEY.map((j) => ({ ...j, p: pillars.find((p) => p.key === j.pillar) }))
  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[220px_1fr_220px]">
        {diaspora && (
          <div className="order-2 xl:order-1">
            <LayerCard tile={diaspora} t={t} lh={lh} points={LAYER_POINTS.diaspora} />
          </div>
        )}
        <div className="relative order-1 xl:order-2">
          <div className="pointer-events-none absolute inset-[18%] hidden rounded-full border-2 border-dashed border-green/25 lg:block" aria-hidden />
          <ol className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-3 lg:gap-4" aria-label={t('The property lifecycle pillars')}>
            {all.pillars.map((tile) => (
              <li key={tile.key} className={cn(tile.number ? RING[tile.number] : '')}>
                <PillarCard tile={tile} t={t} lh={lh} />
              </li>
            ))}
            <li className="hidden lg:col-start-2 lg:row-start-2 lg:flex lg:items-center lg:justify-center" aria-hidden>
              <span className="flex size-40 flex-col items-center justify-center rounded-full bg-ink text-center text-white shadow-lg ring-8 ring-green-tint">
                <House className="size-8 text-gold" />
                <span className="mt-1 font-display text-h3 font-extrabold tracking-wide">{t('PROPERTY')}</span>
                <span className="text-caption text-white/75">{t('Core platform nucleus')}</span>
              </span>
            </li>
          </ol>
          <p className="sr-only">{t('Property sits at the centre; every pillar connects to it.')}</p>
        </div>
        {pros && (
          <div className="order-3">
            <LayerCard tile={pros} t={t} lh={lh} points={LAYER_POINTS.professionals} />
          </div>
        )}
      </div>

      {all.enablers.length > 0 && (
        <div className="rounded-xl border border-dashed border-border-strong p-4 sm:p-5">
          <h3 className="hl-eyebrow text-muted">{t('Ecosystem enablers')}</h3>
          <ol className="mt-3 grid gap-3 sm:grid-cols-2" start={9}>
            {all.enablers.map((tile) => (
              <li key={tile.key}>
                <PillarCard tile={tile} t={t} lh={lh} />
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="rounded-xl border border-border bg-stone-50 p-4 sm:p-6">
        <h3 className="hl-eyebrow text-muted">{t('One journey')}</h3>
        <ol className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-2">
          {journey.map((j, i) => (
            <li key={j.label} className="flex items-center gap-1">
              {j.p ? (
                <Link href={lh(pillarHref(j.p))} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-3.5 text-small font-semibold text-ink ring-1 ring-border hover:ring-green">
                  {t(j.label)}
                  {j.p.status === 'coming_soon' && <SoonBadge />}
                </Link>
              ) : (
                <span className="inline-flex min-h-11 items-center rounded-full px-3.5 text-small font-semibold text-muted">{t(j.label)}</span>
              )}
              {i < journey.length - 1 && <ArrowRight className="size-4 text-subtle" aria-hidden />}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
