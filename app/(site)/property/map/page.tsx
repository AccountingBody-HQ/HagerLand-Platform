import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getMapConfig } from '@/lib/map-config'
import { getLocationByPath } from '@/lib/data/reference'
import { searchProperties, type PublicProperty } from '@/lib/data/properties'
import { parsePropertyParams, toQuery, type RawParams } from '@/lib/property-search'
import { buildMetadata } from '@/lib/seo'
import { formatETB } from '@/lib/format'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container } from '@/components/ui/Layout'
import { DynamicMap } from '@/components/map/DynamicMap'

export const dynamic = 'force-dynamic'
export const metadata = buildMetadata({ title: 'Property map', description: 'See properties for sale and to rent on a map.', path: '/property/map', noindex: true })

const MAX_PAGES = 5

/** Map search (spec 25.2b): the same filters as the results pages, shown as pins. Only when tiles are configured. */
export default async function PropertyMapPage(props: { searchParams: Promise<RawParams> }) {
  const searchParams = await props.searchParams
  const config = getMapConfig()
  if (!config) notFound()
  const purpose = searchParams.purpose === 'rent' ? 'rent' : 'sale'
  const loc = typeof searchParams.loc === 'string' ? await getLocationByPath(searchParams.loc) : null
  const filters = parsePropertyParams(searchParams)
  const items: PublicProperty[] = []
  let total = 0
  for (let page = 1; page <= MAX_PAGES; page++) {
    const r = await searchProperties({ purpose, locationId: loc?.id, filters: { ...filters, sort: 'newest', page }, pageSize: 48 })
    total = r.total
    items.push(...r.items)
    if (items.length >= r.total) break
  }
  const points = items
    .filter((p) => p.lat !== null && p.lng !== null)
    .map((p) => ({ id: p.id ?? '', lat: Number(p.lat), lng: Number(p.lng), label: p.title ?? 'Property', href: `/property/${p.slug}`, sub: p.price_on_request || p.price_etb === null ? 'Price on request' : `${formatETB(p.price_etb)}${p.price_period === 'month' ? ' a month' : ''}` }))
  const listHref = `/property/${purpose === 'sale' ? 'for-sale' : 'to-rent'}${loc ? `/${loc.path}` : ''}${toQuery(filters)}`
  return (
    <Container className="py-6 lg:py-10">
      <Breadcrumbs items={[{ label: 'Property', href: '/property' }, { label: 'Map' }]} />
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="hl-h1">Property {purpose === 'sale' ? 'for sale' : 'to rent'}{loc ? ` in ${loc.name}` : ''} on a map</h1>
        <Link href={listHref} className="inline-flex min-h-11 items-center font-semibold text-green underline">
          Back to the list
        </Link>
      </div>
      <p className="mt-2 text-small text-muted" role="status">
        {points.length} of {total} {total === 1 ? 'property has' : 'properties have'} a location on the map. Unless the owner chose to show the exact spot, pins are approximate (about 1 km).
      </p>
      <div className="mt-4">
        <DynamicMap tileUrl={config.tileUrl} attribution={config.attribution} points={points} label="Map of properties" />
      </div>
    </Container>
  )
}
