import Link from 'next/link'
import { ArrowRight, House } from 'lucide-react'
import { JOURNEY, MODE_LABELS, activeModes, pillarHref, type Pillar, type PillarMode } from '@/lib/pillars'
import { verticalHref, type Vertical, type VerticalKey } from '@/lib/verticals'
import { DynamicIcon } from '@/components/ui/DynamicIcon'
import { SoonBadge } from '@/components/verticals/SoonBadge'
import { cn } from '@/lib/cn'

interface MapTile {
  key: string
  number?: number
  name: string
  tagline: string
  href: string
  icon: string
  modes: string[]
  soon: boolean
}

/** Mode labels as visitors used to see them; Interest alone shows as "Coming soon" instead. */
function modeLabels(p: Pillar): string[] {
  const modes = activeModes(p)
  const shown: PillarMode[] = modes.length === 1 && modes[0] === 'interest' ? [] : modes
  return shown.map((m) => MODE_LABELS[m])
}

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

function ModeLine({ tile }: { tile: MapTile }) {
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

function PillarCard({ tile }: { tile: MapTile }) {
  return (
    <Link href={tile.href} prefetch={false} className="group flex h-full flex-col gap-2 rounded-xl border border-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md focus-visible:shadow-md">
      <span className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink font-display text-small font-extrabold text-white" aria-hidden>
          {tile.number}
        </span>
        <DynamicIcon name={tile.icon} className="size-5 shrink-0 text-green" />
        <span className="font-display font-bold leading-tight text-ink">{tile.name}</span>
      </span>
      <span className="text-small text-muted">{tile.tagline}</span>
      <span className="mt-auto">
        <ModeLine tile={tile} />
      </span>
    </Link>
  )
}

function LayerCard({ tile, points }: { tile: MapTile; points: string[] }) {
  return (
    <Link href={tile.href} prefetch={false} className="group flex h-full flex-col gap-3 rounded-xl border border-green/20 bg-green-tint p-5 hover:border-green">
      <span className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-white text-green">
          <DynamicIcon name={tile.icon} className="size-5" />
        </span>
        <span className="font-display font-bold text-ink">{tile.name}</span>
      </span>
      <span className="text-caption font-semibold uppercase tracking-wide text-green-darker">{tile.key === 'diaspora' ? 'Cross-cutting customer layer' : 'Cross-cutting supply layer'}</span>
      <ul className="space-y-1 text-small text-muted">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      {tile.soon && <SoonBadge long />}
      <span className="mt-auto inline-flex items-center gap-1 text-small font-semibold text-green">
        Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  )
}

const LAYER_POINTS: Record<string, string[]> = {
  diaspora: ['International buyers and investors', 'Overseas tenants and landlords', 'Remote management and support'],
  professionals: ['Built-environment professionals', 'Agents and advisers', 'Trades and contractors', 'Specialist service providers'],
}

/**
 * Admin map of AB's ecosystem diagram (spec 26.4), on admin → Pillars and modes: the PROPERTY nucleus, the eight
 * lifecycle pillars around it in reading order 1–8, the two enablers, the two cross-cutting layers, each with its live
 * modes, and the journey strip. It shows what visitors can reach (hidden pillars are left out). Internal only: the
 * public site presents the same services in customer language (lib/content/services.ts).
 */
export function PillarMap({ pillars, verticals }: { pillars: Pillar[]; verticals: Vertical[] }) {
  const tile = (p: Pillar): MapTile => ({ key: p.key, number: p.number, name: p.name, tagline: p.tagline, href: pillarHref(p), icon: p.icon, modes: modeLabels(p), soon: p.status === 'coming_soon' })
  const layer = (key: VerticalKey, name: string, tagline: string, icon: string): MapTile | undefined => {
    const v = verticals.find((x) => x.key === key)
    return v ? { key, name, tagline, href: verticalHref(v), icon, modes: [], soon: v.status === 'coming_soon' } : undefined
  }
  const all = { pillars: pillars.filter((p) => p.number <= 8).map(tile), enablers: pillars.filter((p) => p.number > 8).map(tile) }
  const diaspora = layer('diaspora', 'Diaspora Services', 'Buying, renting, building and managing from abroad', 'globe')
  const pros = layer('professionals', 'Professionals & Service Providers', 'Architects, engineers, contractors, agents, advisers, trades', 'users')
  const journey = JOURNEY.map((j) => ({ ...j, p: pillars.find((p) => p.key === j.pillar) }))
  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[220px_1fr_220px]">
        {diaspora && (
          <div className="order-2 xl:order-1">
            <LayerCard tile={diaspora} points={LAYER_POINTS.diaspora} />
          </div>
        )}
        <div className="relative order-1 xl:order-2">
          <div className="pointer-events-none absolute inset-[18%] hidden rounded-full border-2 border-dashed border-green/25 lg:block" aria-hidden />
          <ol className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-3 lg:gap-4" aria-label="The property lifecycle pillars">
            {all.pillars.map((tile) => (
              <li key={tile.key} className={cn(tile.number ? RING[tile.number] : '')}>
                <PillarCard tile={tile} />
              </li>
            ))}
            <li className="hidden lg:col-start-2 lg:row-start-2 lg:flex lg:items-center lg:justify-center" aria-hidden>
              <span className="flex size-40 flex-col items-center justify-center rounded-full bg-ink text-center text-white shadow-lg ring-8 ring-green-tint">
                <House className="size-8 text-gold" />
                <span className="mt-1 font-display text-h3 font-extrabold tracking-wide">PROPERTY</span>
                <span className="text-caption text-white/75">Core platform nucleus</span>
              </span>
            </li>
          </ol>
          <p className="sr-only">Property sits at the centre; every pillar connects to it.</p>
        </div>
        {pros && (
          <div className="order-3">
            <LayerCard tile={pros} points={LAYER_POINTS.professionals} />
          </div>
        )}
      </div>

      {all.enablers.length > 0 && (
        <div className="rounded-xl border border-dashed border-border-strong p-4 sm:p-5">
          <h3 className="hl-eyebrow text-muted">Ecosystem enablers</h3>
          <ol className="mt-3 grid gap-3 sm:grid-cols-2" start={9}>
            {all.enablers.map((tile) => (
              <li key={tile.key}>
                <PillarCard tile={tile} />
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="rounded-xl border border-border bg-stone-50 p-4 sm:p-6">
        <h3 className="hl-eyebrow text-muted">One journey</h3>
        <ol className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-2">
          {journey.map((j, i) => (
            <li key={j.label} className="flex items-center gap-1">
              {j.p ? (
                <Link href={pillarHref(j.p)} prefetch={false} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-3.5 text-small font-semibold text-ink ring-1 ring-border hover:ring-green">
                  {j.label}
                  {j.p.status === 'coming_soon' && <SoonBadge />}
                </Link>
              ) : (
                <span className="inline-flex min-h-11 items-center rounded-full px-3.5 text-small font-semibold text-muted">{j.label}</span>
              )}
              {i < journey.length - 1 && <ArrowRight className="size-4 text-subtle" aria-hidden />}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
