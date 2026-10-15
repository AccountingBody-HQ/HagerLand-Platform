import Link from 'next/link'
import { Bell } from 'lucide-react'
import { brand } from '@/lib/brand'
import { buildMetadata, organizationJsonLd, websiteJsonLd } from '@/lib/seo'
import { getBusinessDetails } from '@/lib/data/business'
import { getServiceCategories, getSiteSettings } from '@/lib/data/reference'
import { getPopularLocations, getPropertiesByIds, searchProperties, type PublicProperty } from '@/lib/data/properties'
import { searchOrganisations } from '@/lib/data/organisations'
import { searchDevelopments } from '@/lib/data/developments'
import { SUPPLY_TOP_CATEGORIES } from '@/lib/navigation'
import { Container, Section } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { HomeSearch } from '@/components/home/HomeSearch'
import { LatestProperties } from '@/components/home/LatestProperties'
import { CompanyCard } from '@/components/company/CompanyCard'
import { DevelopmentCard } from '@/components/development/DevelopmentCard'
import { JsonLd } from '@/components/seo/JsonLd'
import { getVerticals } from '@/lib/data/verticals'
import { isLive } from '@/lib/verticals'
import { GuidesTeaser } from '@/components/guides/GuidesTeaser'
import { AbroadMoment, HomeHero, ProfessionalsMoment, SerifHeader, ServicesShowcase, StandardsRow } from '@/components/home/HomeSections'
import { getSiteNav } from '@/lib/data/site-nav'
import { getLocale } from '@/lib/i18n/server'
import { translator } from '@/lib/i18n/translate'
import { localizeHref } from '@/lib/i18n/config'

export const revalidate = 300

export const metadata = buildMetadata({
  title: `${brand.name} — ${brand.titleLine}`,
  absoluteTitle: true,
  description: 'Buy, rent, build and manage property in Ethiopia with verified partners, wherever you live: homes, building materials, contractors, repairs and property care.',
  path: '/',
})

/** Featured first, then newest, without duplicates. */
function featuredThenNewest(featured: PublicProperty[], newest: PublicProperty[], n: number): PublicProperty[] {
  const seen = new Set<string | null>()
  return [...featured, ...newest].filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true))).slice(0, n)
}

export default async function HomePage() {
  const [services, settings, verticals, siteNav] = await Promise.all([getServiceCategories(), getSiteSettings(), getVerticals(), getSiteNav()])
  const live = {
    property: isLive(verticals, 'property'),
    supplies: isLive(verticals, 'building-supplies'),
    professionals: isLive(verticals, 'professionals'),
  }
  const pickIds = Array.isArray(settings.homepage_featured_ids) ? settings.homepage_featured_ids.filter((x): x is string => typeof x === 'string') : []
  const picks = await getPropertiesByIds(pickIds)
  const [business, saleFeatured, saleNewest, rentFeatured, rentNewest, newDevs, verifiedPros, verifiedCount, popular] = await Promise.all([
    getBusinessDetails(),
    searchProperties({ purpose: 'sale', featuredOnly: true, pageSize: 8 }),
    searchProperties({ purpose: 'sale', filters: { sort: 'newest' }, pageSize: 8 }),
    searchProperties({ purpose: 'rent', featuredOnly: true, pageSize: 8 }),
    searchProperties({ purpose: 'rent', filters: { sort: 'newest' }, pageSize: 8 }),
    searchDevelopments({ pageSize: 4 }),
    searchOrganisations({ verifiedOnly: true, kinds: ['contractor', 'professional_firm', 'sole_trader'], pageSize: 4 }),
    searchOrganisations({ verifiedOnly: true, pageSize: 1 }),
    getPopularLocations(null, 8),
  ])
  const totalProperties = saleNewest.total + rentNewest.total
  const locale = await getLocale()
  const t = translator(locale)
  const lh = (h: string) => localizeHref(h, locale)


  const standards = [
    { title: 'Every listing checked', text: 'Our team reviews every listing and profile before it goes live.' },
    { title: 'Verified means verified', text: 'A business shows the Verified badge only after we have checked its documents.' },
    { title: 'Always up to date', text: 'Listings expire unless their owner renews them, so what you see is available.' },
    { title: 'Built by construction people', text: `${brand.divisions.supply} sources building materials, so we know real costs and quality.` },
  ]

  return (
    <>
      {business.announcement && (
        <div className="bg-gold-soft text-small text-ink">
          <Container className="py-2 text-center">
            {business.announcement.href ? (
              <Link href={business.announcement.href} className="font-semibold underline">
                {business.announcement.text}
              </Link>
            ) : (
              business.announcement.text
            )}
          </Container>
        </div>
      )}

      <HomeHero
        eyebrow={t(brand.heroEyebrow)}
        title={t(brand.masterLine)}
        line={t(brand.supportLine)}
        search={<HomeSearch services={services.map((g) => ({ name: g.name, children: g.children.map((c) => ({ name: c.name, slug: c.slug })) }))} />}
      />

      <ServicesShowcase all={siteNav.all} t={t} lh={lh} />

      {siteNav.all.diaspora && <AbroadMoment tile={siteNav.all.diaspora} t={t} lh={lh} />}

      {live.property && (
        <section aria-labelledby="property-title" className="bg-mist">
          <Container className="py-16 sm:py-24">
            {totalProperties >= 4 ? (
              <>
                <h2 id="property-title" className="font-serif text-serif-h2 font-normal text-ink lg:text-serif-h2-lg">
                  Latest properties
                </h2>
                <div className="mt-8">
                  <LatestProperties sale={featuredThenNewest([...picks.filter((p) => p.purpose === 'sale'), ...saleFeatured.items], saleNewest.items, 8)} rent={featuredThenNewest([...picks.filter((p) => p.purpose === 'rent'), ...rentFeatured.items], rentNewest.items, 8)} />
                </div>
              </>
            ) : (
              <>
                <h2 id="property-title" className="font-serif text-serif-h2 font-normal text-ink lg:text-serif-h2-lg">
                  Property in Ethiopia
                </h2>
                <p className="mt-5 max-w-[36rem] text-lead text-muted">Homes, apartments, land and commercial space from owners, agents and developers, every listing checked before it goes live.</p>
                <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-ink/15">
                  <div className="lg:pr-14">
                    <h3 className="font-serif text-serif-h3 font-normal text-ink">Looking to buy or rent?</h3>
                    <p className="mt-3 max-w-[30rem] text-muted">Search what is listed today, or save a search and we will email you as soon as a home that matches goes live.</p>
                    <div className="mt-7 flex flex-col gap-3 sm:flex-row [&>*]:sm:flex-1">
                      <ButtonLink href="/property/for-sale">Property for sale</ButtonLink>
                      <ButtonLink href="/property/to-rent" variant="secondary">
                        Property to rent
                      </ButtonLink>
                    </div>
                    <Link href="/account/alerts" className="mt-4 inline-flex min-h-11 items-center gap-2 text-small font-semibold text-green underline decoration-green/30 underline-offset-4 hover:decoration-green">
                      <Bell className="size-4" aria-hidden /> Get alerts for new listings
                    </Link>
                  </div>
                  <div className="lg:pl-14">
                    <h3 className="font-serif text-serif-h3 font-normal text-ink">Selling or letting?</h3>
                    <p className="mt-3 max-w-[30rem] text-muted">List your property yourself and receive enquiries directly, or let our estate agents value it, market it and handle viewings and offers for you.</p>
                    <div className="mt-7 flex flex-col gap-3 sm:flex-row [&>*]:sm:flex-1">
                      <ButtonLink href="/signup?type=owner">List your property</ButtonLink>
                      <ButtonLink href="/agency" variant="secondary">
                        Use our estate agents
                      </ButtonLink>
                    </div>
                  </div>
                </div>
              </>
            )}
          </Container>
        </section>
      )}

      {live.supplies && (
        <section aria-labelledby="supply-title">
          <Container className="grid grid-cols-1 gap-12 py-16 sm:py-24 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
              <p className="font-medium text-gold-dark">{brand.divisions.supply}</p>
              <h2 id="supply-title" className="mt-3 font-serif text-serif-h2 font-normal text-ink lg:text-serif-h2-lg">
                Building something? Send us your materials list.
              </h2>
              <ol className="mt-8 space-y-5">
                {['Send your list, or add products to a quote', 'Get one clear price, including delivery', 'Materials delivered to your site'].map((text, i) => (
                  <li key={text} className="flex items-baseline gap-5">
                    <span className="w-6 shrink-0 font-serif text-serif-h3 text-gold-dark">{i + 1}</span>
                    <span className="text-lead text-ink">{text}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row [&>*]:sm:flex-1 lg:max-w-[30rem]">
                <ButtonLink href="/supplies/materials-list" size="lg">
                  Send your materials list
                </ButtonLink>
                <ButtonLink href="/supplies" variant="secondary" size="lg">
                  Browse supplies
                </ButtonLink>
              </div>
            </div>
            <div className="lg:col-span-5 lg:col-start-8">
              <h3 className="font-serif text-serif-h3 font-normal text-ink">Shop by category</h3>
              <ul className="mt-6 grid grid-cols-2 border-t border-border">
                {SUPPLY_TOP_CATEGORIES.map((c) => (
                  <li key={c.href} className="border-b border-border">
                    <Link href={c.href} className="flex min-h-12 items-center text-ink hover:text-green">
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </section>
      )}

      {live.property && newDevs.items.length >= 2 && (
        <Section>
          <SerifHeader title="New developments" action={<ButtonLink href="/developments" variant="secondary">All developments</ButtonLink>} />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {newDevs.items.map((d) => (
              <li key={d.id}>
                <DevelopmentCard development={d} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {live.property && totalProperties >= 10 && popular.length > 0 && (
        <Section>
          <SerifHeader title="Popular locations" />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {popular.map((l) => (
              <li key={l.id}>
                <Link href={`/property/for-sale/${l.path}`} className="flex h-full flex-col rounded-lg border border-border bg-white p-4 hover:border-green">
                  <span className="font-semibold">{l.name}</span>
                  <span className="text-small text-muted">{l.display_name.split(', ').slice(1).join(', ') || 'Ethiopia'}</span>
                  <span className="mt-2 text-small font-semibold tabular-nums text-green">
                    {l.count} {l.count === 1 ? 'property' : 'properties'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(siteNav.all.professionals || live.professionals) && <ProfessionalsMoment t={t} lh={lh} freeListing={business.freeListingConfirmed} showTrades={live.professionals} />}

      {live.professionals && verifiedPros.items.length > 0 && (
        <Section>
          <SerifHeader title="Verified professionals" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {verifiedPros.items.map((o) => (
              <li key={o.id}>
                <CompanyCard org={o} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <StandardsRow points={standards} />
      {verifiedCount.total >= business.verifiedBusinessCountMin && (
        <p className="bg-mist pb-10 text-center font-semibold text-green-darker">
          {verifiedCount.total} verified businesses on {brand.name}
        </p>
      )}

      <GuidesTeaser />
      <JsonLd data={[organizationJsonLd(business.social.map((s) => s.url)), websiteJsonLd()]} />
    </>
  )
}
