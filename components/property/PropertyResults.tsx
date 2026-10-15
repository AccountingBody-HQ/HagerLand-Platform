import Link from 'next/link'
import { MapPin, SearchX } from 'lucide-react'
import type { ResultsContext } from '@/lib/property-pages'
import { getSummary, landingIntro, placeName, resultsHeading, linkFilters } from '@/lib/property-pages'
import { searchProperties } from '@/lib/data/properties'
import { activeChips, countActiveFilters, PROPERTY_PAGE_SIZE, toQuery } from '@/lib/property-search'
import { formatNumber } from '@/lib/format'
import { Breadcrumbs, type Crumb } from '@/components/ui/Breadcrumbs'
import { Container, EmptyState } from '@/components/ui/Layout'
import { FilterChip, ChipLink } from '@/components/ui/Chip'
import { Pagination } from '@/components/ui/Pagination'
import { ButtonLink } from '@/components/ui/Button'
import { PropertyCard, PropertyCardHorizontal } from './PropertyCard'
import { FiltersPanel } from './FiltersPanel'
import { SortSelect } from './SortSelect'
import { SaveSearchButton } from '@/components/saved/SaveSearchButton'
import { getUser } from '@/lib/auth'
import { getMapConfig } from '@/lib/map-config'
import { getAreaGuide, getMarketInsight } from '@/lib/data/advice'
import { InsightTable } from '@/components/advice/InsightTable'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqJsonLd } from '@/lib/seo'

export async function PropertyResults({ ctx }: { ctx: ResultsContext }) {
  const root = `/property/${ctx.purpose === 'sale' ? 'for-sale' : 'to-rent'}`
  const [result, featured, summary] = await Promise.all([
    searchProperties({ purpose: ctx.purpose, locationId: ctx.location?.id, filters: ctx.filters, pageSize: PROPERTY_PAGE_SIZE }),
    ctx.filters.page === 1 ? searchProperties({ purpose: ctx.purpose, locationId: ctx.location?.id, filters: { ...ctx.filters, page: 1 }, featuredOnly: true, pageSize: 2 }) : Promise.resolve({ total: 0, items: [] }),
    getSummary(ctx),
  ])
  // Area guide (spec 26.10): live asking-price figures for this place once enough listings exist, plus AB's notes.
  const showArea = Boolean(ctx.location) && !ctx.typeSegment && ctx.filters.page === 1
  const [areaRows, areaGuide] = showArea && ctx.location ? await Promise.all([getMarketInsight({ purpose: ctx.purpose, locationId: ctx.location.id }), getAreaGuide(ctx.location.id)]) : [[], null]
  const user = await getUser()
  const totalPages = Math.ceil(result.total / PROPERTY_PAGE_SIZE)
  // On a type page the type lives in the path: removing its chip goes back to the location page.
  const chips = activeChips(ctx.filters, ctx.locationBase)
  const lf = linkFilters(ctx)
  const purposeLabel = ctx.purpose === 'sale' ? 'For sale' : 'To rent'
  const crumbs: Crumb[] = [
    { label: 'Property', href: '/property' },
    { label: purposeLabel, href: root },
    ...ctx.chain.map((l, i) => ({ label: l.name, href: i < ctx.chain.length - 1 ? `${root}/${l.path}` : undefined })),
  ]
  const intro = summary ? landingIntro(ctx, summary) : null
  const parent = ctx.chain.length > 1 ? ctx.chain[ctx.chain.length - 2] : null
  const heading = resultsHeading(ctx)
  const countLine = `${formatNumber(result.total)} ${result.total === 1 ? 'property' : 'properties'} ${ctx.purpose === 'sale' ? 'for sale' : 'to rent'} in ${placeName(ctx)}`

  return (
    <Container className="py-6 lg:py-10">
      <Breadcrumbs items={crumbs} />
      <div className="mt-4 flex flex-col gap-2">
        <h1 className="hl-h1">{heading}</h1>
        {intro && <p className="max-w-3xl text-muted">{intro}</p>}
      </div>

      {summary && summary.children.some((c) => c.count > 0) && (
        <nav aria-label="Areas" className="mt-5 flex flex-wrap gap-2">
          {summary.children
            .filter((c) => c.count > 0)
            .map((c) => (
              <ChipLink key={c.id} href={`${root}/${c.path}`} icon={<MapPin />}>
                {c.name} <span className="text-muted">({c.count})</span>
              </ChipLink>
            ))}
        </nav>
      )}

      <div className="mt-6 lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
        <FiltersPanel
          purpose={ctx.purpose}
          filters={ctx.filters}
          location={ctx.location ? { path: ctx.location.path, name: ctx.location.display_name } : null}
          activeCount={countActiveFilters(ctx.filters)}
          total={result.total}
        />

        <div className="min-w-0">
          <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between lg:pt-0">
            <p className="font-semibold text-ink" aria-live="polite">
              {countLine}
            </p>
            <SortSelect basePath={ctx.basePath} filters={lf} />
          </div>
          <div className="mb-4 flex flex-wrap items-start gap-2">
            {getMapConfig() && (
              <Link href={`/property/map?purpose=${ctx.purpose}${ctx.location ? `&loc=${ctx.location.path}` : ''}${toQuery(ctx.filters).replace(/^\?/, '&')}`} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border-strong bg-white px-4 text-small font-semibold text-ink hover:bg-stone-100">
                Map view
              </Link>
            )}
            <SaveSearchButton
              signedIn={Boolean(user)}
              purpose={ctx.purpose}
              location={ctx.location?.path ?? null}
              query={toQuery({ ...ctx.filters, page: 1 }).replace(/^\?/, '')}
              defaultName={heading}
              returnTo={`${ctx.basePath}${toQuery(lf)}`}
            />
          </div>
          {chips.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <FilterChip key={c.label} label={c.label} removeHref={c.href} />
              ))}
              <Link href={ctx.locationBase} className="ml-1 text-small font-semibold text-green hover:underline">
                Clear all
              </Link>
            </div>
          )}

          {featured.items.length > 0 && (
            <section aria-label="Featured listings" className="mb-6">
              <p className="hl-eyebrow mb-3 text-muted">Featured</p>
              <ul className="grid gap-4 sm:grid-cols-2">
                {featured.items.map((p) => (
                  <li key={p.id}>
                    <PropertyCard property={p} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.items.length === 0 ? (
            <EmptyState
              icon={<SearchX />}
              title="No properties match these filters yet"
              description="Try widening your search. Or tell us what you're looking for and we'll let you know when something comes up."
              actions={
                <>
                  {chips.length > 0 ? (
                    <ButtonLink href={chips[chips.length - 1].href}>Remove last filter</ButtonLink>
                  ) : parent ? (
                    <ButtonLink href={`${root}/${parent.path}`}>Search all of {parent.name}</ButtonLink>
                  ) : (
                    <ButtonLink href={ctx.purpose === 'sale' ? '/property/to-rent' : '/property/for-sale'}>{ctx.purpose === 'sale' ? 'See rentals' : 'See homes for sale'}</ButtonLink>
                  )}
                  <ButtonLink href={`/contact?topic=property-request`} variant="secondary">
                    Tell us what you need
                  </ButtonLink>
                </>
              }
            />
          ) : (
            <>
              <ul className="grid gap-4 sm:grid-cols-2 lg:hidden">
                {result.items.map((p) => (
                  <li key={p.id}>
                    <PropertyCard property={p} />
                  </li>
                ))}
              </ul>
              <ul className="hidden space-y-4 lg:block">
                {result.items.map((p) => (
                  <li key={p.id}>
                    <PropertyCardHorizontal property={p} />
                  </li>
                ))}
              </ul>
            </>
          )}

          <Pagination className="mt-10" page={ctx.filters.page} totalPages={totalPages} hrefFor={(page) => `${ctx.basePath}${toQuery(lf, { page })}`} />
        </div>
      </div>
      {ctx.location && (areaRows.length > 0 || areaGuide) && (
        <section aria-labelledby="area-guide" className="mt-14 border-t border-border pt-10">
          <h2 id="area-guide" className="hl-h2">
            About {ctx.location.name}
          </h2>
          {areaGuide?.notes && <p className="mt-3 max-w-3xl whitespace-pre-line text-ink">{areaGuide.notes}</p>}
          {areaRows.length > 0 && (
            <div className="mt-6">
              <InsightTable rows={areaRows.slice().sort((a, b) => (a.property_type === 'all' ? -1 : b.property_type === 'all' ? 1 : b.sample_count - a.sample_count))} caption={`${ctx.purpose === 'sale' ? 'For sale' : 'To rent'} in ${ctx.location.name}`} showPlace={false} />
            </div>
          )}
          {areaGuide && areaGuide.faqs.length > 0 && (
            <div className="mt-6 max-w-3xl">
              <h3 className="hl-h3">Questions about {ctx.location.name}</h3>
              <dl className="mt-3 space-y-4">
                {areaGuide.faqs.map((f) => (
                  <div key={f.question}>
                    <dt className="font-semibold text-ink">{f.question}</dt>
                    <dd className="mt-1 text-muted">{f.answer}</dd>
                  </div>
                ))}
              </dl>
              <JsonLd data={faqJsonLd(areaGuide.faqs)} />
            </div>
          )}
        </section>
      )}
    </Container>
  )
}
