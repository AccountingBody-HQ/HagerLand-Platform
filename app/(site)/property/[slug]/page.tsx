import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { CalendarDays, Check, Hash } from 'lucide-react'
import { getEntityMedia, getPropertyByShortId, getUnavailableProperty, searchProperties, type PublicProperty } from '@/lib/data/properties'
import { getLocationChain, type Location } from '@/lib/data/reference'
import { shortIdFromSlug } from '@/lib/slug'
import { buildMetadata, truncateDescription } from '@/lib/seo'
import { COMPLETION, FINISHING, FURNISHING, TENURE, featureLabel, labelOf, propertyHeadline, propertyTypeLabel, purposeSegment } from '@/lib/labels'
import { formatArea, formatDate, formatETB, relativeTime } from '@/lib/format'
import { publicMediaUrl } from '@/lib/media'
import { youtubeEmbedUrl } from '@/lib/youtube'
import { propertyIntents } from '@/lib/intents'
import { imageUrls, propertyJsonLd } from '@/lib/jsonld'
import { brand } from '@/lib/brand'
import { Breadcrumbs, type Crumb } from '@/components/ui/Breadcrumbs'
import { Container, EmptyState } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { Gallery } from '@/components/media/Gallery'
import { PropertyBadges } from '@/components/property/PropertyBadges'
import { PriceLine } from '@/components/property/PriceLine'
import { KeyFacts } from '@/components/property/KeyFacts'
import { MapBlock } from '@/components/property/MapBlock'
import { SafetyTips } from '@/components/property/SafetyTips'
import { PropertyCard } from '@/components/property/PropertyCard'
import { ContactPanel } from '@/components/enquiry/ContactPanel'
import { AgencyListingPanel } from '@/components/agency/AgencyListingPanel'
import { getAgencyAvailability } from '@/lib/data/pillars'
import { getBusinessDetails } from '@/lib/data/business'
import { ProfessionalsModule } from '@/components/company/ProfessionalsModule'
import { ViewTracker } from '@/components/analytics/ViewTracker'
import { JsonLd } from '@/components/seo/JsonLd'
import { ExpandableText } from '@/components/ui/ExpandableText'
import Link from 'next/link'
import { PropertyActions } from '@/components/property/PropertyActions'
import { getRequestableCategory } from '@/lib/data/service-requests'
import { financeAskHref } from '@/components/verticals/FinanceAsk'

export const revalidate = 600

function cityOf(chain: Location[]): Location | null {
  return [...chain].reverse().find((l) => l.level === 'city') ?? chain[0] ?? null
}

function placeLabel(p: Pick<PublicProperty, 'location_name'>, chain: Location[]): string {
  const city = cityOf(chain)
  return city && city.name !== p.location_name ? `${p.location_name}, ${city.name}` : p.location_name ?? 'Ethiopia'
}

async function load(slug: string) {
  const sid = shortIdFromSlug(slug)
  if (!sid) permanentRedirect('/property/for-sale')
  const property = await getPropertyByShortId(sid)
  return { sid, property }
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params
  const { sid, property: p } = await load(params.slug)
  if (!p) {
    const gone = await getUnavailableProperty(sid)
    return gone ? buildMetadata({ title: `${gone.title} (no longer available)`, description: 'This property is no longer available. See similar properties on HagerLand.', path: `/property/${params.slug}`, noindex: true }) : { title: 'Property not found' }
  }
  const chain = p.location_id ? await getLocationChain(p.location_id) : []
  const place = placeLabel(p, chain)
  const price = p.price_etb && !p.price_on_request ? ` — ${formatETB(p.price_etb)}` : ''
  const title = `${propertyHeadline(p.property_type ?? '', p.bedrooms)} for ${p.purpose === 'rent' ? 'rent' : 'sale'} in ${place}${price}`
  return buildMetadata({ title, description: truncateDescription(p.description || p.title || ''), path: `/property/${p.slug}`, image: `/og/property/${p.slug}` })
}

export default async function PropertyPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const { sid, property: p } = await load(params.slug)

  if (!p) {
    const gone = await getUnavailableProperty(sid)
    if (!gone) notFound()
    const similar = await searchProperties({ purpose: gone.purpose, locationId: gone.location_id, filters: { types: [gone.property_type as PublicProperty['property_type'] & string] }, pageSize: 8 })
    return (
      <Container className="py-10">
        <EmptyState
          title="This property is no longer available"
          description={`"${gone.title}" in ${gone.location_display} has been taken down. Here are similar properties.`}
          actions={<ButtonLink href={`/property/${purposeSegment(gone.purpose)}/${gone.location_path}`}>See more in {gone.location_display.split(', ')[0]}</ButtonLink>}
        />
        {similar.items.length > 0 && (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {similar.items.map((s) => (
              <li key={s.id}>
                <PropertyCard property={s} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    )
  }

  if (p.slug && params.slug !== p.slug) permanentRedirect(`/property/${p.slug}`)

  const [chain, media, similar, agencyOn, business] = await Promise.all([
    p.location_id ? getLocationChain(p.location_id) : Promise.resolve([] as Location[]),
    p.id ? getEntityMedia('property', p.id) : Promise.resolve([]),
    searchProperties({ purpose: p.purpose ?? undefined, locationId: p.location_id, filters: { types: p.property_type ? [p.property_type] : [] }, excludeId: p.id ?? undefined, pageSize: 8 }),
    getAgencyAvailability(),
    getBusinessDetails(),
  ])
  // Book a viewing / make an offer / apply to rent: only on listings HagerLand markets, while the agency is on (26.5).
  const agencyListing = p.lister_type === 'hagerland' && !p.is_hagerland && (p.purpose === 'sale' ? agencyOn.sales : agencyOn.lettings)
  const place = placeLabel(p, chain)
  const headline = propertyHeadline(p.property_type ?? '', p.bedrooms)
  const root = `/property/${purposeSegment(p.purpose ?? 'sale')}`
  const crumbs: Crumb[] = [
    { label: 'Property', href: '/property' },
    { label: p.purpose === 'rent' ? 'To rent' : 'For sale', href: root },
    ...chain.map((l) => ({ label: l.name, href: `${root}/${l.path}` })),
    { label: p.title ?? headline },
  ]
  const images = media.filter((m) => m.kind === 'image').map((m, i) => ({ path: m.storage_path ?? '', alt: m.alt ?? `${headline} in ${place}: photo ${i + 1}`, width: m.width, height: m.height }))
  const floorplans = media.filter((m) => m.kind === 'floorplan').map((m, i) => ({ path: m.storage_path ?? '', alt: m.alt ?? `Floor plan ${i + 1}`, width: m.width, height: m.height }))
  const city = cityOf(chain)
  const region = chain.find((l) => l.level === 'region') ?? null
  const proServices = p.property_type === 'land' ? ['architects', 'building-contractors', 'design-build'] : p.purpose === 'rent' ? ['movers', 'cleaning'] : ['estate-agents', 'movers', 'interior-designers']

  const lister = p.is_hagerland
    ? { name: brand.divisions.developments, href: '/our-developments', verified: true, subtitle: 'Built by HagerLand' }
    : { name: p.lister_name ?? 'Private owner', href: p.lister_org_slug ? `/company/${p.lister_org_slug}` : null, verified: p.lister_verification === 'verified', subtitle: p.lister_type === 'agent' ? 'Estate agent' : p.lister_type === 'developer' ? 'Developer' : 'Private owner', logoUrl: publicMediaUrl(p.lister_logo_path) }

  const facts = [
    { label: 'Property type', value: propertyTypeLabel(p.property_type) },
    { label: 'Bedrooms', value: p.bedrooms },
    { label: 'Bathrooms', value: p.bathrooms },
    { label: 'Floor area', value: p.area_m2 ? formatArea(p.area_m2) : null },
    { label: 'Plot area', value: p.plot_area_m2 ? formatArea(p.plot_area_m2) : null },
    { label: 'Building height', value: p.floors_label },
    { label: 'Floor', value: p.floor_number !== null ? (p.floor_number === 0 ? 'Ground' : p.floor_number) : null },
    { label: 'Finishing', value: labelOf(FINISHING, p.finishing_status) },
    { label: 'Furnishing', value: labelOf(FURNISHING, p.furnishing) },
    { label: 'Tenure', value: labelOf(TENURE, p.tenure) },
    { label: 'Title deed (carta)', value: p.has_title_deed === null ? null : p.has_title_deed ? 'Available' : 'Not yet' },
    { label: 'Completion', value: labelOf(COMPLETION, p.completion_status) },
    { label: 'Parking spaces', value: p.parking_spaces },
    { label: 'Year built', value: p.year_built },
    { label: 'Advance payment', value: p.advance_months ? `${p.advance_months} month${p.advance_months === 1 ? '' : 's'}` : null },
    { label: 'Service charge', value: p.service_charge_etb ? `${formatETB(p.service_charge_etb)}/month` : null },
  ]

  const [valuation, finance] = await Promise.all([getRequestableCategory('property-valuers'), financeAskHref(p.purpose === 'rent' ? 'home-improvement-finance' : 'mortgages')])
  return (
    <>
      <Container className="py-6 lg:py-8">
        <Breadcrumbs items={crumbs} />
        <div className="mt-5">
          <Gallery images={images} floorplans={floorplans} videoEmbed={youtubeEmbedUrl(p.video_url)} />
        </div>

        <div className="mt-8 lg:grid lg:grid-cols-[1fr_380px] lg:gap-10">
          <div className="min-w-0 space-y-10">
            <header>
              <PropertyBadges purpose={p.purpose} publishedAt={p.published_at} isFeatured={p.is_featured} isHagerland={p.is_hagerland} listerVerification={p.lister_verification} developmentId={p.development_id} />
              <PriceLine className="mt-3" size="lg" price={p.price_etb} period={p.price_period} onRequest={p.price_on_request} negotiable={p.price_negotiable} />
              <h1 className="hl-h2 mt-2 font-bold">{p.title}</h1>
              <p className="mt-1 text-muted">{p.location_display}</p>
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-body text-ink">
                <li>{propertyTypeLabel(p.property_type)}</li>
                {p.bedrooms ? <li>{p.bedrooms} bedrooms</li> : null}
                {p.bathrooms ? <li>{p.bathrooms} bathrooms</li> : null}
                {p.area_m2 ? <li>{formatArea(p.area_m2)}</li> : null}
              </ul>
              <PropertyActions id={p.id ?? ''} slug={p.slug ?? ''} title={p.title ?? ''} valuationHref={valuation ? `/request-service/${valuation.slug}` : null} financeHref={finance?.href ?? null} financeSoon={Boolean(finance?.soon)} />
            </header>

            <section aria-labelledby="facts-heading">
              <h2 id="facts-heading" className="hl-h3 mb-4">
                Key facts
              </h2>
              <KeyFacts facts={facts} />
            </section>

            {p.description && (
              <section aria-labelledby="desc-heading">
                <h2 id="desc-heading" className="hl-h3 mb-3">
                  Description
                </h2>
                <ExpandableText text={p.description} />
              </section>
            )}

            {p.features && p.features.length > 0 && (
              <section aria-labelledby="features-heading">
                <h2 id="features-heading" className="hl-h3 mb-4">
                  Features
                </h2>
                <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <Check className="size-5 text-green" aria-hidden /> {featureLabel(f)}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="location-heading">
              <h2 id="location-heading" className="hl-h3 mb-3">
                Location
              </h2>
              <p className="text-ink">{p.address_line ? `${p.address_line}, ${p.location_display}` : p.location_display}</p>
              {!p.show_exact_location && <p className="mt-1 text-small text-muted">The exact address is shared by the lister when you get in touch.</p>}
              {p.lat && p.lng && (
                <div className="mt-4">
                  <MapBlock lat={Number(p.lat)} lng={Number(p.lng)} exact={Boolean(p.show_exact_location)} label={place} />
                </div>
              )}
            </section>

            {p.development_slug && (
              <section aria-labelledby="dev-heading" className="rounded-lg border border-border bg-stone-50 p-5">
                <h2 id="dev-heading" className="font-semibold">
                  Part of a development
                </h2>
                <Link href={`/developments/${p.development_slug}`} className="mt-1 inline-block font-display text-h3 font-bold text-green hover:underline">
                  {p.development_name}
                </Link>
              </section>
            )}

            <section aria-label="Listing information" className="flex flex-wrap gap-x-6 gap-y-2 text-small text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Hash className="size-4" aria-hidden /> Reference {p.short_id?.toUpperCase()}
              </span>
              {p.published_at && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4" aria-hidden /> Added {formatDate(p.published_at)}
                </span>
              )}
              {p.updated_at && <span>Updated {relativeTime(p.updated_at)}</span>}
              {(p.views_count ?? 0) >= 50 && <span>{p.views_count} views</span>}
            </section>

            <SafetyTips />
          </div>

          <div className="mt-10 lg:mt-0">
            <div className="lg:sticky lg:top-24">
              {agencyListing && p.slug && <AgencyListingPanel slug={p.slug} purpose={p.purpose === 'rent' ? 'rent' : 'sale'} licence={business.licences.estate_agency} />}
              <ContactPanel
                revealTarget={p.id ? { type: 'property', id: p.id } : null}
                enquiryTarget={{ type: 'property', id: p.id ?? undefined, recipientLabel: lister.name }}
                intents={propertyIntents(p.purpose, p.title ?? headline)}
                lister={lister}
                channels={{ phone: Boolean(p.has_phone), whatsapp: Boolean(p.has_whatsapp), telegram: Boolean(p.has_telegram), email: Boolean(p.has_email) }}
                reportTarget={p.id ? { type: 'property', id: p.id } : undefined}
                mobileBar
              />
            </div>
          </div>
        </div>

        {similar.items.length > 0 && (
          <section aria-labelledby="similar-heading" className="mt-14 border-t border-border pt-10">
            <h2 id="similar-heading" className="hl-h3 mb-5">
              Similar properties
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {similar.items.map((s) => (
                <li key={s.id}>
                  <PropertyCard property={s} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-14">
          <ProfessionalsModule
            title={p.property_type === 'land' ? 'Build on this plot' : 'Professionals for this property'}
            serviceSlugs={proServices}
            locationId={city?.id ?? p.location_id}
            locationLabel={city?.name}
          />
        </div>
      </Container>
      {p.id && <ViewTracker entityType="property" id={p.id} label={p.property_type ?? 'property'} />}
      <JsonLd data={propertyJsonLd(p, imageUrls(images.map((i) => i.path)), city?.name ?? null, region?.name ?? null)} />
    </>
  )
}
