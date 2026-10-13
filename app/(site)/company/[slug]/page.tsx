import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Building2, CalendarDays, MapPin, Users } from 'lucide-react'
import { getLocationNames, getOrganisationBySlug, getOrganisationProductCategories, getOrganisationServices, getPortfolio } from '@/lib/data/organisations'
import { searchProperties } from '@/lib/data/properties'
import { searchDevelopments } from '@/lib/data/developments'
import { getLocationChain, type Location } from '@/lib/data/reference'
import { buildMetadata, truncateDescription } from '@/lib/seo'
import { ORG_KIND_LABEL } from '@/lib/org-labels'
import { publicMediaUrl } from '@/lib/media'
import { COMPANY_INTENTS } from '@/lib/intents'
import { organisationJsonLd } from '@/lib/jsonld-org'
import { Container } from '@/components/ui/Layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { ChipLink } from '@/components/ui/Chip'
import { VerificationBadge } from '@/components/company/VerificationBadge'
import { OrgAvatar } from '@/components/company/CompanyCard'
import { PortfolioGrid } from '@/components/company/PortfolioGrid'
import { PropertyCard } from '@/components/property/PropertyCard'
import { DevelopmentCard } from '@/components/development/DevelopmentCard'
import { ContactPanel } from '@/components/enquiry/ContactPanel'
import { MediaImage } from '@/components/media/MediaImage'
import { ExpandableText } from '@/components/ui/ExpandableText'
import { ViewTracker } from '@/components/analytics/ViewTracker'
import { JsonLd } from '@/components/seo/JsonLd'

export const revalidate = 600

function cityOf(chain: Location[]): Location | null {
  return [...chain].reverse().find((l) => l.level === 'city') ?? chain[0] ?? null
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const o = await getOrganisationBySlug(params.slug)
  if (!o) return { title: 'Business not found' }
  const chain = o.location_id ? await getLocationChain(o.location_id) : []
  const city = cityOf(chain)?.name ?? 'Ethiopia'
  return buildMetadata({
    title: `${o.name} — ${ORG_KIND_LABEL[o.kind ?? ''] ?? 'Business'} in ${city}`,
    description: truncateDescription(o.tagline ?? o.description ?? `${o.name} on HagerLand: ${ORG_KIND_LABEL[o.kind ?? '']?.toLowerCase()} in ${city}. See their work and contact them directly.`),
    path: `/company/${o.slug}`,
    image: `/og/company/${o.slug}`,
  })
}

export default async function CompanyPage({ params }: { params: { slug: string } }) {
  const o = await getOrganisationBySlug(params.slug)
  if (!o || !o.id) notFound()
  const isLister = o.kind === 'agency' || o.kind === 'developer' || o.kind === 'hagerland'
  const [chain, services, productCats, portfolio, areaNames, forSale, toRent, developments] = await Promise.all([
    o.location_id ? getLocationChain(o.location_id) : Promise.resolve([] as Location[]),
    getOrganisationServices(o.id),
    getOrganisationProductCategories(o.id),
    getPortfolio(o.id),
    getLocationNames(o.areas_served ?? []),
    isLister ? searchProperties({ purpose: 'sale', listerOrgId: o.id, pageSize: 6 }) : Promise.resolve({ total: 0, items: [] }),
    isLister ? searchProperties({ purpose: 'rent', listerOrgId: o.id, pageSize: 6 }) : Promise.resolve({ total: 0, items: [] }),
    o.kind === 'developer' || o.kind === 'hagerland' ? searchDevelopments({ developerOrgId: o.id, pageSize: 6 }) : Promise.resolve({ total: 0, items: [] }),
  ])
  const city = cityOf(chain)
  const region = chain.find((l) => l.level === 'region') ?? null
  const kindLabel = ORG_KIND_LABEL[o.kind ?? ''] ?? 'Business'
  const claimable = o.verification_level === 'listed' && !o.has_members && !o.is_hagerland
  const hours = (o.opening_hours as Record<string, string> | null) ?? null
  const sections = [
    { id: 'overview', label: 'Overview', show: true },
    { id: 'portfolio', label: 'Portfolio', show: portfolio.length > 0 },
    { id: 'for-sale', label: 'For sale', show: forSale.total > 0 },
    { id: 'to-rent', label: 'To rent', show: toRent.total > 0 },
    { id: 'developments', label: 'Developments', show: developments.total > 0 },
    { id: 'areas', label: 'Areas served', show: areaNames.length > 0 },
  ].filter((s) => s.show)
  const directory = o.kind === 'agency' ? { label: 'Estate agents', href: '/agents' } : o.kind === 'developer' ? { label: 'Developers', href: '/developers' } : o.kind === 'supplier' || o.kind === 'manufacturer' ? { label: 'Suppliers', href: '/suppliers' } : { label: 'Professionals', href: '/professionals' }

  return (
    <>
      {o.cover_path && (
        <div className="relative h-40 bg-stone-200 sm:h-56">
          <MediaImage path={o.cover_path} alt={`${o.name} cover image`} fill sizes="100vw" priority className="object-cover" />
        </div>
      )}
      <Container className="py-6 lg:py-8">
        <Breadcrumbs items={[directory, { label: o.name ?? '' }]} />

        {claimable && (
          <div className="mt-5 flex flex-col gap-3 rounded-lg border border-gold/30 bg-gold-soft/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-small">
              <strong>Is this your business?</strong> Claim it to update the details, add your work and receive enquiries.
            </p>
            <ButtonLink href={`/company/${o.slug}/claim`} size="sm" variant="gold">
              Claim this business
            </ButtonLink>
          </div>
        )}

        <div className="mt-6 lg:grid lg:grid-cols-[1fr_380px] lg:gap-10">
          <div className="min-w-0 space-y-10">
            <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <OrgAvatar name={o.name ?? ''} logoPath={o.logo_path} size="lg" />
              <div>
                <h1 className="hl-h1">{o.name}</h1>
                <p className="mt-1 text-muted">{kindLabel}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <VerificationBadge level={o.verification_level} verifiedAt={o.verified_at} />
                  {o.is_hagerland && <Badge tone="gold">HagerLand</Badge>}
                  {o.serves_diaspora && <Badge tone="info">Serves the Ethiopian community abroad</Badge>}
                </div>
                <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-small text-muted">
                  {o.location_display && (
                    <li className="inline-flex items-center gap-1.5">
                      <MapPin className="size-4" aria-hidden /> {o.location_display}
                    </li>
                  )}
                  {o.year_established && (
                    <li className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-4" aria-hidden /> Since {o.year_established}
                    </li>
                  )}
                  {o.team_size && (
                    <li className="inline-flex items-center gap-1.5">
                      <Users className="size-4" aria-hidden /> {o.team_size} {o.team_size === '1' ? 'person' : 'people'}
                    </li>
                  )}
                </ul>
              </div>
            </header>

            {sections.length > 1 && (
              <nav aria-label="Profile sections" className="-mx-4 overflow-x-auto border-b border-border px-4">
                <ul className="flex gap-1">
                  {sections.map((s) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} className="inline-flex min-h-11 items-center whitespace-nowrap px-3 text-small font-semibold text-muted hover:text-ink">
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            <section id="overview" aria-labelledby="overview-heading" className="scroll-mt-24 space-y-6">
              <h2 id="overview-heading" className="hl-h3">
                About {o.name}
              </h2>
              {o.tagline && <p className="text-[1.0625rem] font-medium text-ink">{o.tagline}</p>}
              {o.description ? <ExpandableText text={o.description} /> : <p className="text-muted">This business hasn&apos;t added a description yet.</p>}
              {services.length > 0 && (
                <div>
                  <h3 className="mb-3 text-small font-semibold">Services</h3>
                  <ul className="flex flex-wrap gap-2">
                    {services.map((s) => (
                      <li key={s.slug}>
                        <ChipLink href={`/professionals/${s.slug}`}>{s.name}</ChipLink>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {productCats.length > 0 && (
                <div>
                  <h3 className="mb-3 text-small font-semibold">Supplies</h3>
                  <ul className="flex flex-wrap gap-2">
                    {productCats.map((c) => (
                      <li key={c.slug}>
                        <ChipLink href={`/supplies/${c.slug}`}>{c.name}</ChipLink>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(o.licence_category || o.licence_grade) && (
                <dl className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
                  {o.licence_category && (
                    <div>
                      <dt className="text-small text-muted">Licence category</dt>
                      <dd className="font-semibold">{o.licence_category}</dd>
                    </div>
                  )}
                  {o.licence_grade && (
                    <div>
                      <dt className="text-small text-muted">Licence grade</dt>
                      <dd className="font-semibold">{o.licence_grade}</dd>
                    </div>
                  )}
                </dl>
              )}
              {hours && Object.keys(hours).length > 0 && (
                <div>
                  <h3 className="mb-2 text-small font-semibold">Opening hours</h3>
                  <dl className="grid max-w-sm grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-small">
                    {Object.entries(hours).map(([day, time]) => (
                      <div key={day} className="contents">
                        <dt className="capitalize text-muted">{day}</dt>
                        <dd>{time}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              {o.website && (
                <a href={o.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-11 items-center font-semibold text-green hover:underline">
                  Visit website
                </a>
              )}
            </section>

            {portfolio.length > 0 && (
              <section id="portfolio" aria-labelledby="portfolio-heading" className="scroll-mt-24">
                <h2 id="portfolio-heading" className="hl-h3 mb-4">
                  Portfolio
                </h2>
                <PortfolioGrid items={portfolio} />
              </section>
            )}

            {forSale.total > 0 && (
              <section id="for-sale" aria-labelledby="sale-heading" className="scroll-mt-24">
                <div className="mb-4 flex items-end justify-between">
                  <h2 id="sale-heading" className="hl-h3">
                    Properties for sale ({forSale.total})
                  </h2>
                </div>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {forSale.items.map((p) => (
                    <li key={p.id}>
                      <PropertyCard property={p} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {toRent.total > 0 && (
              <section id="to-rent" aria-labelledby="rent-heading" className="scroll-mt-24">
                <h2 id="rent-heading" className="hl-h3 mb-4">
                  Properties to rent ({toRent.total})
                </h2>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {toRent.items.map((p) => (
                    <li key={p.id}>
                      <PropertyCard property={p} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {developments.total > 0 && (
              <section id="developments" aria-labelledby="dev-heading" className="scroll-mt-24">
                <h2 id="dev-heading" className="hl-h3 mb-4">
                  Developments
                </h2>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {developments.items.map((d) => (
                    <li key={d.id}>
                      <DevelopmentCard development={d} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {areaNames.length > 0 && (
              <section id="areas" aria-labelledby="areas-heading" className="scroll-mt-24">
                <h2 id="areas-heading" className="hl-h3 mb-3">
                  Areas served
                </h2>
                <p className="text-ink">{areaNames.join(' · ')}</p>
              </section>
            )}
          </div>

          <div className="mt-10 lg:mt-0">
            <div className="lg:sticky lg:top-24">
              <ContactPanel
                revealTarget={{ type: 'organisation', id: o.id }}
                enquiryTarget={{ type: 'organisation', id: o.id, recipientLabel: o.name ?? 'this business' }}
                intents={COMPANY_INTENTS}
                lister={{ name: o.name ?? '', verified: o.verification_level === 'verified', subtitle: kindLabel, logoUrl: publicMediaUrl(o.logo_path) }}
                channels={{ phone: Boolean(o.has_phone), whatsapp: Boolean(o.has_whatsapp), telegram: Boolean(o.has_telegram), email: Boolean(o.has_email) }}
                reportTarget={{ type: 'organisation', id: o.id }}
                mobileBar
              />
              {!o.has_phone && !o.has_whatsapp && (
                <p className="mt-3 flex items-center gap-2 text-small text-muted">
                  <Building2 className="size-4" aria-hidden /> Send an enquiry and the business will reply directly.
                </p>
              )}
              {claimable && (
                <p className="mt-3 text-small text-muted">
                  Run this business?{' '}
                  <Link href={`/company/${o.slug}/claim`} className="font-semibold text-green underline">
                    Claim it
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </Container>
      <ViewTracker entityType="organisation" id={o.id} label={o.kind ?? 'organisation'} />
      <JsonLd data={organisationJsonLd(o, city?.name ?? null, region?.name ?? null)} />
    </>
  )
}
