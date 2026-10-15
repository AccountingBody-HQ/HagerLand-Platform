import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { requireVisiblePillar } from '@/lib/data/pillars'
import { getVerticals } from '@/lib/data/verticals'
import { getBuildRates } from '@/lib/data/reference'
import { pillarMetadata } from '@/lib/pillar-page'
import { PillarHub } from '@/components/pillars/PillarHub'
import { Section } from '@/components/ui/Layout'
import { DynamicIcon } from '@/components/ui/DynamicIcon'
import { SoonBadge } from '@/components/verticals/SoonBadge'

export const revalidate = 300

export function generateMetadata() {
  return pillarMetadata('build')
}

/**
 * Build & Develop hub (spec 26.9): the project brief, estimator, professionals, contractors, supplies, finance interest
 * and Our Developments interest in one place. Links to parts that are switched off or not ready disappear.
 */
export default async function Page() {
  const pillar = await requireVisiblePillar('build')
  const [verticals, rates] = await Promise.all([getVerticals(), getBuildRates()])
  const v = (k: string) => verticals.find((x) => x.key === k)
  const tiles = [
    rates.length > 0 && { label: 'Build-cost estimator', href: '/build-cost-estimator', icon: 'calculator', text: 'A rough cost per m² for your floors and finish.' },
    v('building-supplies')?.status === 'live' && { label: 'Materials from HagerLand Supply', href: '/supplies/materials-list', icon: 'boxes', text: 'Send your bill of quantities for one clear quote.' },
    v('finance') && { label: 'Construction finance', href: '/finance', icon: 'landmark', text: 'Through approved, licensed partners.', soon: v('finance')?.status === 'coming_soon' },
    v('our-developments') && { label: 'Our Developments', href: '/our-developments', icon: 'building-2', text: 'Homes HagerLand intends to develop.', soon: v('our-developments')?.status === 'coming_soon' },
  ].filter((t): t is { label: string; href: string; icon: string; text: string; soon?: boolean } => Boolean(t))
  return (
    <PillarHub pillar={pillar}>
      {pillar.status === 'live' && tiles.length > 0 && (
        <Section labelledBy="build-more">
          <h2 id="build-more" className="hl-h2">
            Everything else your build needs
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tiles.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="group flex h-full flex-col gap-2 rounded-lg border border-border bg-white p-4 hover:border-green">
                  <span className="flex items-center gap-2 font-semibold text-ink">
                    <DynamicIcon name={t.icon} className="size-5 text-green" />
                    {t.label}
                    {t.soon && <SoonBadge />}
                  </span>
                  <span className="text-small text-muted">{t.text}</span>
                  <ArrowRight className="mt-auto size-4 text-green transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </PillarHub>
  )
}
