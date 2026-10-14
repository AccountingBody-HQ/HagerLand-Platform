import 'server-only'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getLocationByPath, getLocationChain, getSettingNumber, type Location } from '@/lib/data/reference'
import { getLocationSummary, searchProperties, type LocationSummary } from '@/lib/data/properties'
import { parsePropertyParams, hasFilters, type PropertyFilters, type RawParams } from '@/lib/property-search'
import { buildMetadata, truncateDescription } from '@/lib/seo'
import { formatETB } from '@/lib/format'
import { propertyTypePlural, type ListingPurpose } from '@/lib/labels'
import { segmentForTypes, splitTypeSegment, typesForSegment } from '@/lib/property-type-paths'

export interface ResultsContext {
  purpose: ListingPurpose
  location: Location | null
  chain: Location[]
  filters: PropertyFilters
  basePath: string
  /** Set on property-type pages, e.g. /property/for-sale/addis-ababa/bole/apartments (spec 25.2l). */
  typeSegment: string | null
  /** The location page this view belongs to (without the type segment). */
  locationBase: string
}

/** Filters as they appear in this page's links: on a type page the type is in the path, not the query. */
export function linkFilters(ctx: ResultsContext): PropertyFilters {
  return ctx.typeSegment ? { ...ctx.filters, types: [] } : ctx.filters
}

export async function resolveResults(purpose: ListingPurpose, segments: string[] | undefined, searchParams: RawParams): Promise<ResultsContext> {
  const root = `/property/${purpose === 'sale' ? 'for-sale' : 'to-rent'}`
  let location: Location | null = null
  let typeSegment: string | null = null
  if (segments?.length) {
    const lower = segments.map((s) => s.toLowerCase())
    location = await getLocationByPath(lower.join('/'))
    if (!location) {
      // Not a place: maybe a property-type page such as …/bole/apartments (spec 25.2l).
      const split = splitTypeSegment(lower)
      if (!split.typeSegment) notFound()
      typeSegment = split.typeSegment
      if (split.locationSegments.length) location = await getLocationByPath(split.locationSegments.join('/'))
      if (split.locationSegments.length && !location) notFound()
    }
    // Property listings are Ethiopia-only (spec 24.4): no landing pages for places abroad.
    if (location && location.country_code !== 'ET') notFound()
  }
  const filters = parsePropertyParams(searchParams)
  if (typeSegment) filters.types = typesForSegment(typeSegment) ?? []
  const locationBase = location ? `${root}/${location.path}` : root
  return {
    purpose,
    location,
    chain: location ? await getLocationChain(location.id) : [],
    filters,
    basePath: typeSegment ? `${locationBase}/${typeSegment}` : locationBase,
    typeSegment,
    locationBase,
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
  const typeLabel = ctx.typeSegment === 'commercial' ? 'Commercial property' : ctx.filters.types.length === 1 ? propertyTypePlural(ctx.filters.types[0]) : 'Property'
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
  const result = await searchProperties({ purpose: ctx.purpose, locationId: ctx.location?.id, filters: { page: 1, types: ctx.typeSegment ? ctx.filters.types : [] }, pageSize: 1 })
  const heading = resultsHeading({ ...ctx, filters: { ...ctx.filters, types: ctx.filters.types.length === 1 || ctx.typeSegment ? ctx.filters.types : [] } })
  const pageSuffix = ctx.filters.page > 1 ? ` – Page ${ctx.filters.page}` : ''
  const lf = linkFilters(ctx)
  const filtered = hasFilters({ ...lf, page: 1 })
  // A query such as ?type=apartment on a location page points search engines at the matching type page.
  const onlyType = !ctx.typeSegment && ctx.filters.types.length > 0 && !hasFilters({ ...ctx.filters, types: [], page: 1 }) ? segmentForTypes(ctx.filters.types) : null
  const canonicalPath = onlyType ? `${ctx.basePath}/${onlyType}` : filtered ? ctx.basePath : `${ctx.basePath}${ctx.filters.page > 1 ? `?page=${ctx.filters.page}` : ''}`
  const description = truncateDescription(
    `Browse ${result.total > 0 ? `${result.total} ` : ''}${ctx.purpose === 'sale' ? 'homes, land and commercial property for sale' : 'homes and commercial property to rent'} in ${placeName(ctx)}. Every listing is reviewed by HagerLand before it goes live.`,
  )
  return buildMetadata({
    title: `${heading}${pageSuffix}`,
    description,
    path: canonicalPath,
    noindex: Boolean(ctx.location || ctx.typeSegment) && result.total < minResults,
  })
}

export async function getSummary(ctx: ResultsContext): Promise<LocationSummary | null> {
  return ctx.location ? getLocationSummary(ctx.location.id, ctx.purpose) : null
}
