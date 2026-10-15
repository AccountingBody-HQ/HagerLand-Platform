import Link from 'next/link'
import { Bell, ClipboardList, ShieldCheck, Truck, FileText } from 'lucide-react'
import { brand } from '@/lib/brand'
import { buildMetadata, organizationJsonLd, websiteJsonLd } from '@/lib/seo'
import { getBusinessDetails } from '@/lib/data/business'
import { getServiceCategories, getSiteSettings } from '@/lib/data/reference'
import { getPopularLocations, getPropertiesByIds, searchProperties, type PublicProperty } from '@/lib/data/properties'
import { searchOrganisations } from '@/lib/data/organisations'
import { searchDevelopments } from '@/lib/data/developments'
import { SUPPLY_TOP_CATEGORIES } from '@/lib/navigation'
import { Container, Section, SectionHeader } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { ChipLink } from '@/components/ui/Chip'
import { DynamicIcon } from '@/components/ui/DynamicIcon'
import { HomeSearch } from '@/components/home/HomeSearch'
import { LatestProperties } from '@/components/home/LatestProperties'
import { CompanyCard } from '@/components/company/CompanyCard'
import { DevelopmentCard } from '@/components/development/DevelopmentCard'
import { JsonLd } from '@/components/seo/JsonLd'
import { getVerticals } from '@/lib/data/verticals'
import { isLive } from '@/lib/verticals'
import { GuidesTeaser } from '@/components/guides/GuidesTeaser'
import { ServicesSection } from '@/components/home/ServicesSection'
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

const PRO_CHIPS: [string, string][] = [
  ['Architects', 'architects'],
  ['Contractors', 'building-contracting'],
  ['Engineers', 'design-consultancy'],
  ['Electricians', 'electricians'],
  ['Plumbers', 'plumbers'],
  ['Interior designers', 'interior-designers'],
  ['Solar installers', 'solar-installers'],
  ['Welders', 'welders'],
]

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


  const proofPoints = [
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

      <section className="hl-blueprint bg-ink text-white">
        <Container className="py-12 sm:py-20">
          <p className="hl-eyebrow text-gold">{t(brand.heroEyebrow)}</p>
          <h1 className="hl-display mt-4 max-w-4xl text-white">{t(brand.masterLine)}</h1>
          <p className="mt-6 max-w-2xl text-lg font-normal leading-relaxed text-white/80 sm:text-xl">{t(brand.supportLine)}</p>
          <div className="mt-10 max-w-4xl">
            <HomeSearch services={services.map((g) => ({ name: g.name, children: g.children.map((c) => ({ name: c.name, slug: c.slug })) }))} />
          </div>
        </Container>
      </section>

      <ServicesSection all={siteNav.all} t={t} lh={lh} freeListing={business.freeListingConfirmed} />

      {live.property && (
      <Section tone="stone">
        {totalProperties >= 4 ? (
          <>
            <SectionHeader title="Latest properties" />
            <LatestProperties sale={featuredThenNewest([...picks.filter((p) => p.purpose === 'sale'), ...saleFeatured.items], saleNewest.items, 8)} rent={featuredThenNewest([...picks.filter((p) => p.purpose === 'rent'), ...rentFeatured.items], rentNewest.items, 8)} />
          </>
        ) : (
          <>
            <SectionHeader title="Property in Ethiopia" description="Homes, apartments, land and commercial space from owners, agents and developers, every listing checked before it goes live." />
            <ul className="grid gap-4 lg:grid-cols-2">
              <li className="flex flex-col rounded-xl border border-border bg-white p-6 sm:p-8">
                <h3 className="hl-h3">Looking to buy or rent?</h3>
                <p className="mt-2 text-muted">Search what is listed today, or save a search and we will email you as soon as a home that matches goes live.</p>
                <Link href="/account/alerts" className="mt-3 inline-flex min-h-11 items-center gap-2 self-start font-semibold text-green hover:underline">
                  <Bell className="size-4" aria-hidden /> Get alerts for new listings
                </Link>
                <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row [&>*]:sm:flex-1">
                  <ButtonLink href="/property/for-sale">Property for sale</ButtonLink>
                  <ButtonLink href="/property/to-rent" variant="secondary">
                    Property to rent
                  </ButtonLink>
                </div>
              </li>
              <li className="flex flex-col rounded-xl border border-border bg-white p-6 sm:p-8">
                <h3 className="hl-h3">Selling or letting?</h3>
                <p className="mt-2 text-muted">List your property yourself and receive enquiries directly, or let our estate agents value it, market it and handle viewings and offers for you.</p>
                <div className="mt-auto flex flex-col gap-3 pt-6 sm:flex-row [&>*]:sm:flex-1">
                  <ButtonLink href="/signup?type=owner">List your property</ButtonLink>
                  <ButtonLink href="/agency" variant="secondary">
                    Use our estate agents
                  </ButtonLink>
                </div>
              </li>
            </ul>
          </>
        )}
      </Section>
      )}

      {live.supplies && (
      <Section>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="hl-eyebrow text-green">{brand.divisions.supply}</p>
            <h2 className="hl-h2 mt-2">Building something? Send us your materials list.</h2>
            <ol className="mt-6 space-y-4">
              {[
                { icon: FileText, text: 'Send your list, or add products to a quote' },
                { icon: ClipboardList, text: 'Get one clear price, including delivery' },
                { icon: Truck, text: 'Materials delivered to your site' },
              ].map((s, i) => (
                <li key={s.text} className="flex items-center gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-soft font-display font-bold text-green">{i + 1}</span>
                  <span className="font-medium">{s.text}</span>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row [&>*]:sm:flex-1">
              <ButtonLink href="/supplies/materials-list">Send your materials list</ButtonLink>
              <ButtonLink href="/supplies" variant="secondary">
                Browse supplies
              </ButtonLink>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {SUPPLY_TOP_CATEGORIES.map((c) => (
              <li key={c.href}>
                <Link href={c.href} className="flex h-full min-h-20 flex-col justify-between rounded-lg border border-border bg-white p-4 hover:border-green sm:min-h-28">
                  <DynamicIcon name={c.icon} className="size-6 text-green" />
                  <span className="mt-3 text-small font-semibold text-ink">{c.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>
      )}

      {live.professionals && (
      <Section tone="stone">
        <SectionHeader title="Hire trusted professionals" description="Tell us what you need and get quotes from up to three professionals, or browse by trade." />
        <ul className="flex flex-wrap gap-2">
          {PRO_CHIPS.map(([label, slug]) => (
            <li key={slug}>
              <ChipLink href={`/professionals/${slug}`}>{label}</ChipLink>
            </li>
          ))}
        </ul>
        {verifiedPros.items.length > 0 && (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {verifiedPros.items.map((o) => (
              <li key={o.id}>
                <CompanyCard org={o} />
              </li>
            ))}
          </ul>
        )}
      </Section>
      )}

      {live.property && newDevs.items.length >= 2 && (
        <Section>
          <SectionHeader title="New developments" action={<ButtonLink href="/developments" variant="secondary">All developments</ButtonLink>} />
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
          <SectionHeader title="Popular locations" />
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

      <Section className="border-t border-border">
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {proofPoints.map((p) => (
            <li key={p.title}>
              <h3 className="font-semibold text-ink">{p.title}</h3>
              <p className="mt-1 text-muted">{p.text}</p>
            </li>
          ))}
        </ul>
        {verifiedCount.total >= business.verifiedBusinessCountMin && (
          <p className="mt-8 flex items-center gap-2 font-semibold text-green-darker">
            <ShieldCheck className="size-5" aria-hidden /> {verifiedCount.total} verified businesses on {brand.name}
          </p>
        )}
      </Section>

      <GuidesTeaser />
      <JsonLd data={[organizationJsonLd(business.social.map((s) => s.url)), websiteJsonLd()]} />
    </>
  )
}
