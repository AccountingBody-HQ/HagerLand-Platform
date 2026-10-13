import 'server-only'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getLocationByPath, getLocationChain, getSettingNumber, type Location } from '@/lib/data/reference'
import { getLocationSummary, searchProperties, type LocationSummary } from '@/lib/data/properties'
import { parsePropertyParams, hasFilters, type PropertyFilters, type RawParams } from '@/lib/property-search'
import { buildMetadata, truncateDescription } from '@/lib/seo'
import { formatETB } from '@/lib/format'
import { propertyTypePlural, type ListingPurpose } from '@/lib/labels'

export interface ResultsContext {
  purpose: ListingPurpose
  location: Location | null
  chain: Location[]
  filters: PropertyFilters
  basePath: string
}

export async function resolveResults(purpose: ListingPurpose, segments: string[] | undefined, searchParams: RawParams): Promise<ResultsContext> {
  const root = `/property/${purpose === 'sale' ? 'for-sale' : 'to-rent'}`
  let location: Location | null = null
  if (segments?.length) {
    location = await getLocationByPath(segments.map((s) => s.toLowerCase()).join('/'))
    // Property listings are Ethiopia-only (spec 24.4): no landing pages for places abroad.
    if (!location || location.country_code !== 'ET') notFound()
  }
  return {
    purpose,
    location,
    chain: location ? await getLocationChain(location.id) : [],
    filters: parsePropertyParams(searchParams),
    basePath: location ? `${root}/${location.path}` : root,
  }
}

/** "Bole, Addis Ababa": the location and its city (or region). */
export function placeName(ctx: Pick<ResultsContext, 'location' | 'chain'>): string {
  if (!ctx.location) return 'Ethiopia'
  const parents = ctx.chain.slice(0, -1)
  const city = parents.find((l) => l.level === 'city') ?? parents[parents.length - 1]
  return city && city.name !== ctx.location.name ? `${ctx.location.name}, ${city.name}` : ctx.location.name
}

export function resultsHeading(ctx: ResultsContext): string {
  const typeLabel = ctx.filters.types.length === 1 ? propertyTypePlural(ctx.filters.types[0]) : 'Property'
  return `${typeLabel} ${ctx.purpose === 'sale' ? 'for sale' : 'to rent'} in ${placeName(ctx)}`
}

/** Data-driven intro paragraph for a location landing (no boilerplate). */
export function landingIntro(ctx: ResultsContext, summary: LocationSummary): string | null {
  const custom = ctx.purpose === 'sale' ? ctx.location?.seo_intro_sale : ctx.location?.seo_intro_rent
  if (custom) return custom
  if (summary.count === 0) return null
  const place = placeName(ctx)
  const verb = ctx.purpose === 'sale' ? 'for sale' : 'to rent'
  const parts = [`There ${summary.count === 1 ? 'is' : 'are'} ${summary.count} ${summary.count === 1 ? 'property' : 'properties'} ${verb} in ${place} on HagerLand right now.`]
  if (summary.top_types.length) parts.push(`Most are ${summary.top_types.map((t) => propertyTypePlural(t).toLowerCase()).join(', ')}.`)
  if (summary.price_min && summary.price_max && summary.price_min !== summary.price_max) {
    parts.push(`Prices range from ${formatETB(summary.price_min)} to ${formatETB(summary.price_max)}${ctx.purpose === 'rent' ? ' a month' : ''}.`)
  }
  const busy = summary.children.filter((c) => c.count > 0).slice(0, 3)
  if (busy.length > 1) parts.push(`Popular areas include ${busy.map((c) => c.name).join(', ')}.`)
  return parts.join(' ')
}

export async function resultsMetadata(ctx: ResultsContext): Promise<Metadata> {
  const minResults = await getSettingNumber('min_results_for_index', 3)
  const result = await searchProperties({ purpose: ctx.purpose, locationId: ctx.location?.id, filters: { page: 1 }, pageSize: 1 })
  const heading = resultsHeading({ ...ctx, filters: { ...ctx.filters, types: ctx.filters.types.length === 1 ? ctx.filters.types : [] } })
  const pageSuffix = ctx.filters.page > 1 ? ` – Page ${ctx.filters.page}` : ''
  const filtered = hasFilters({ ...ctx.filters, page: 1 })
  const canonicalPath = filtered ? ctx.basePath : `${ctx.basePath}${ctx.filters.page > 1 ? `?page=${ctx.filters.page}` : ''}`
  const description = truncateDescription(
    `Browse ${result.total > 0 ? `${result.total} ` : ''}${ctx.purpose === 'sale' ? 'homes, land and commercial property for sale' : 'homes and commercial property to rent'} in ${placeName(ctx)}. Every listing is reviewed by HagerLand before it goes live.`,
  )
  return buildMetadata({
    title: `${heading}${pageSuffix}`,
    description,
    path: canonicalPath,
    noindex: Boolean(ctx.location) && result.total < minResults,
  })
}

export async function getSummary(ctx: ResultsContext): Promise<LocationSummary | null> {
  return ctx.location ? getLocationSummary(ctx.location.id, ctx.purpose) : null
}
