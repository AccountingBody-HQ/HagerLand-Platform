import Link from 'next/link'
import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo'
import { getPillar } from '@/lib/data/pillars'
import { getMarketInsight } from '@/lib/data/advice'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container, EmptyState } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { InsightTable, INSIGHT_LABEL } from '@/components/advice/InsightTable'

export const revalidate = 3600

export async function generateMetadata() {
  const rows = await getMarketInsight()
  return buildMetadata({
    title: 'Property market insight: asking prices by area',
    description: `Median asking prices and ranges for property for sale and to rent on HagerLand, by area and type. ${INSIGHT_LABEL}.`,
    path: '/advice/market-insight',
    noindex: rows.length === 0,
  })
}

/** Market insight (spec 26.10): asking-price medians and ranges by area and type, refreshed daily. */
export default async function MarketInsightPage(props: { searchParams: Promise<{ purpose?: string }> }) {
  const pillar = await getPillar('advice')
  if (!pillar || pillar.status !== 'live') notFound()
  const sp = await props.searchParams
  const purpose = sp.purpose === 'rent' ? 'rent' : 'sale'
  const rows = await getMarketInsight({ purpose })
  const national = rows.filter((r) => r.location_id === null)
  const places = rows.filter((r) => r.location_id !== null).sort((a, b) => (a.location_name ?? '').localeCompare(b.location_name ?? '') || a.property_type.localeCompare(b.property_type))
  return (
    <Container className="py-10">
      <Breadcrumbs items={[{ label: 'Knowledge & Advice', href: '/advice' }, { label: 'Market insight' }]} />
      <h1 className="hl-h1 mt-6">Market insight</h1>
      <p className="mt-3 max-w-3xl text-muted">
        What sellers and landlords are asking on HagerLand today, by area and type of property. <strong className="text-ink">{INSIGHT_LABEL}.</strong> A figure appears only when enough live listings exist, and asking prices can differ from the prices finally agreed.
      </p>
      <nav aria-label="Sale or rent" className="mt-6 flex gap-2">
        {(['sale', 'rent'] as const).map((p) => (
          <Link key={p} href={p === 'sale' ? '/advice/market-insight' : '/advice/market-insight?purpose=rent'} aria-current={purpose === p ? 'page' : undefined} className={`inline-flex min-h-11 items-center rounded-full px-4 text-small font-semibold ${purpose === p ? 'bg-ink text-white' : 'bg-stone-100 text-ink'}`}>
            {p === 'sale' ? 'For sale' : 'To rent'}
          </Link>
        ))}
      </nav>
      <div className="mt-6 space-y-6">
        {rows.length === 0 ? (
          <EmptyState title="Not enough listings yet" description="Market figures appear here once there are enough live listings in an area to give a fair picture." actions={<ButtonLink href={purpose === 'sale' ? '/property/for-sale' : '/property/to-rent'}>See live listings</ButtonLink>} />
        ) : (
          <>
            <InsightTable rows={national} caption="Across Ethiopia" showPlace={false} />
            <InsightTable rows={places} caption="By area" />
          </>
        )}
      </div>
    </Container>
  )
}
