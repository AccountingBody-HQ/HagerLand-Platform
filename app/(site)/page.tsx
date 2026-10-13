import Link from 'next/link'
import { ArrowRight, BadgeCheck, Building2, ClipboardList, Clock, Hammer, House, KeyRound, ShieldCheck, Store, Truck, HardHat, FileText } from 'lucide-react'
import { brand } from '@/lib/brand'
import { buildMetadata, organizationJsonLd, websiteJsonLd } from '@/lib/seo'
import { getBusinessDetails } from '@/lib/data/business'
import { getLocationByPath, getServiceCategories } from '@/lib/data/reference'
import { getPopularLocations, searchProperties, type PublicProperty } from '@/lib/data/properties'
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
import { RegisterInterest } from '@/components/development/RegisterInterest'
import { JsonLd } from '@/components/seo/JsonLd'

export const revalidate = 300

export const metadata = buildMetadata({
  title: `${brand.name} — ${brand.descriptor}`,
  absoluteTitle: true,
  description: 'Find homes and land, source construction materials, and hire trusted professionals across Ethiopia, all in one place. Every listing is reviewed.',
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
  const seen = new Set(featured.map((p) => p.id))
  return [...featured, ...newest.filter((p) => !seen.has(p.id))].slice(0, n)
}

export default async function HomePage() {
  const [bole, services] = await Promise.all([getLocationByPath('addis-ababa/bole'), getServiceCategories()])
  const architectsService = services.flatMap((g) => g.children).find((c) => c.slug === 'architects')
  const [business, saleFeatured, saleNewest, rentFeatured, rentNewest, boleApartments, land, architects, ownDevs, newDevs, verifiedPros, verifiedCount, popular] = await Promise.all([
    getBusinessDetails(),
    searchProperties({ purpose: 'sale', featuredOnly: true, pageSize: 8 }),
    searchProperties({ purpose: 'sale', filters: { sort: 'newest' }, pageSize: 8 }),
    searchProperties({ purpose: 'rent', featuredOnly: true, pageSize: 8 }),
    searchProperties({ purpose: 'rent', filters: { sort: 'newest' }, pageSize: 8 }),
    bole ? searchProperties({ purpose: 'sale', locationId: bole.id, filters: { types: ['apartment'] }, pageSize: 1 }) : Promise.resolve({ total: 0, items: [] }),
    searchProperties({ purpose: 'sale', filters: { types: ['land'] }, pageSize: 1 }),
    architectsService ? searchOrganisations({ serviceId: architectsService.id, pageSize: 1 }) : Promise.resolve({ total: 0, items: [] }),
    searchDevelopments({ isHagerland: true, pageSize: 2 }),
    searchDevelopments({ pageSize: 4 }),
    searchOrganisations({ verifiedOnly: true, kinds: ['contractor', 'professional_firm', 'sole_trader'], pageSize: 4 }),
    searchOrganisations({ verifiedOnly: true, pageSize: 1 }),
    getPopularLocations(null, 8),
  ])
  const totalProperties = saleNewest.total + rentNewest.total

  const quickLinks = [
    boleApartments.total > 0 && { label: 'Apartments in Bole', href: '/property/for-sale/addis-ababa/bole?type=apartment' },
    land.total > 0 && { label: 'Land for sale', href: '/property/for-sale?type=land' },
    { label: 'Request a materials quote', href: '/supplies/materials-list' },
    architects.total > 0 && { label: 'Find an architect', href: '/professionals/architects' },
  ].filter((x): x is { label: string; href: string } => Boolean(x))

  const pillars = [
    { title: 'Property', text: 'Homes, land and commercial property for sale and to rent.', href: '/property', icon: House, gold: false },
    { title: 'Supplies', text: 'Construction materials quoted fast and delivered to site.', href: '/supplies', icon: Truck, gold: false },
    { title: 'Professionals', text: 'Architects, contractors and trades with real portfolios.', href: '/professionals', icon: HardHat, gold: false },
    { title: brand.divisions.developments, text: 'Homes we build ourselves, with materials we source ourselves.', href: '/our-developments', icon: Building2, gold: true },
  ]

  const proofPoints = [
    { icon: ClipboardList, title: 'Every listing reviewed', text: 'Our team checks every listing before it goes live.' },
    { icon: BadgeCheck, title: 'Verified businesses', text: 'The Verified badge appears only after we check documents.' },
    { icon: Clock, title: 'Current, not stale', text: 'Property listings expire unless their owner renews them.' },
    { icon: Hammer, title: 'Built and supplied by us', text: 'HagerLand develops and supplies, so we know construction.' },
  ]

  const audiences = [
    { title: 'Sell or let your property', text: 'Private owners can list homes, plots and commercial space.', href: '/signup?type=owner', cta: 'List your property', icon: KeyRound },
    { title: 'Agents & developers', text: 'Show your listings and developments to buyers across Ethiopia.', href: '/list-with-us#agents', cta: 'List your portfolio', icon: Building2 },
    { title: 'Contractors & professionals', text: 'Show your work and receive enquiries from people building.', href: '/list-with-us#professionals', cta: 'Join as a professional', icon: HardHat },
    { title: 'Suppliers & manufacturers', text: 'Reach builders, contractors and homeowners.', href: '/list-with-us#suppliers', cta: 'Become a supplier', icon: Store },
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
          <p className="hl-eyebrow text-gold">{brand.descriptor}</p>
          <h1 className="hl-display mt-4 max-w-4xl text-white">{brand.heroHeadline}</h1>
          <p className="mt-5 max-w-2xl text-[1.0625rem] text-white/80">{brand.heroSupport}</p>
          <div className="mt-8 max-w-4xl">
            <HomeSearch services={services.map((g) => ({ name: g.name, children: g.children.map((c) => ({ name: c.name, slug: c.slug })) }))} />
          </div>
          {quickLinks.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-small">
              {quickLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-9 items-center gap-1 text-white/80 underline-offset-4 hover:text-white hover:underline">
                    {l.label} <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>

      <Section>
        <SectionHeader title="Everything property and construction, in one place" />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {pillars.map((p) => (
            <li key={p.title}>
              <Link href={p.href} className={`group flex h-full flex-col rounded-xl border p-5 transition-shadow hover:shadow-md sm:p-6 ${p.gold ? 'border-gold/40 bg-gold-soft/50' : 'border-border bg-white'}`}>
                <span className={`flex size-11 items-center justify-center rounded-lg ${p.gold ? 'bg-gold text-white' : 'bg-green-soft text-green'}`}>
                  <p.icon className="size-6" aria-hidden />
                </span>
                <span className="mt-4 font-display text-h3 font-bold text-ink">{p.title}</span>
                <span className="mt-1 text-small text-muted sm:text-body">{p.text}</span>
                <span className={`mt-auto inline-flex items-center gap-1 pt-4 text-small font-semibold ${p.gold ? 'text-gold-dark' : 'text-green'}`}>
                  Explore <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="stone">
        {totalProperties >= 4 ? (
          <>
            <SectionHeader title="Latest properties" />
            <LatestProperties sale={featuredThenNewest(saleFeatured.items, saleNewest.items, 8)} rent={featuredThenNewest(rentFeatured.items, rentNewest.items, 8)} />
          </>
        ) : (
          <div className="flex flex-col items-start justify-between gap-6 rounded-xl border border-border bg-white p-6 sm:flex-row sm:items-center sm:p-10">
            <div>
              <h2 className="hl-h2">List your property — be among the first</h2>
              <p className="mt-2 max-w-xl text-muted">We review every listing and send enquiries straight to you. Homes, plots and commercial space across Ethiopia.</p>
            </div>
            <ButtonLink href="/signup?type=owner" size="lg">
              List your property
            </ButtonLink>
          </div>
        )}
      </Section>

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
                <Link href={c.href} className="flex h-full min-h-28 flex-col justify-between rounded-lg border border-border bg-white p-4 hover:border-green">
                  <DynamicIcon name={c.icon} className="size-6 text-green" />
                  <span className="mt-3 text-small font-semibold text-ink">{c.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <section className="hl-blueprint bg-ink text-white">
        <Container className="grid gap-10 py-14 sm:py-20 lg:grid-cols-[1fr_440px] lg:items-start">
          <div>
            <p className="hl-eyebrow text-gold">{brand.divisions.developments}</p>
            <h2 className="hl-h2 mt-2 text-white">Homes we build ourselves.</h2>
            <p className="mt-4 max-w-xl text-white/80">
              We source our materials through {brand.divisions.supply} and manage every build directly. That lets us build well and price fairly.
            </p>
            <ol className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                ['Land', 'Clear title and lease documents first.'],
                ['Design', 'Homes designed for how families live.'],
                ['Materials', `Sourced through ${brand.divisions.supply}.`],
                ['Build & handover', 'Managed directly, documents in order.'],
              ].map(([title, text], i) => (
                <li key={title} className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <span className="font-display text-h3 font-extrabold text-gold">{i + 1}</span>
                  <p className="mt-1 font-semibold text-white">{title}</p>
                  <p className="text-small text-white/70">{text}</p>
                </li>
              ))}
            </ol>
            {ownDevs.items.length > 0 && (
              <ButtonLink href="/our-developments" variant="gold" className="mt-6">
                See our projects <ArrowRight />
              </ButtonLink>
            )}
          </div>
          {ownDevs.items.length > 0 ? (
            <ul className="grid gap-4">
              {ownDevs.items.map((d) => (
                <li key={d.id} className="text-ink">
                  <DevelopmentCard development={d} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl bg-white p-5 text-ink shadow-lg">
              <h3 className="hl-h3">Our first project is in preparation</h3>
              <p className="mb-4 mt-1 text-small text-muted">Register your interest to hear first about location, plans and prices.</p>
              <RegisterInterest idPrefix="home-ri" />
            </div>
          )}
        </Container>
      </section>

      <Section tone="stone">
        <SectionHeader title="Hire trusted professionals" action={<ButtonLink href="/professionals" variant="secondary">All services</ButtonLink>} />
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

      {newDevs.items.length >= 2 && (
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

      {totalProperties >= 10 && popular.length > 0 && (
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

      <Section tone="tint" compact>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {proofPoints.map((p) => (
            <li key={p.title} className="flex gap-4">
              <p.icon className="size-7 shrink-0 text-green" aria-hidden />
              <div>
                <h3 className="font-semibold text-ink">{p.title}</h3>
                <p className="mt-1 text-small text-muted">{p.text}</p>
              </div>
            </li>
          ))}
        </ul>
        {verifiedCount.total >= business.verifiedBusinessCountMin && (
          <p className="mt-8 flex items-center gap-2 font-semibold text-green-darker">
            <ShieldCheck className="size-5" aria-hidden /> {verifiedCount.total} verified businesses on {brand.name}
          </p>
        )}
      </Section>

      <Section>
        <SectionHeader title="List with us" description={business.freeListingConfirmed ? 'Listing is free while we launch.' : undefined} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {audiences.map((a) => (
            <li key={a.title} className="flex flex-col rounded-xl border border-border bg-white p-6">
              <a.icon className="size-7 text-green" aria-hidden />
              <h3 className="hl-h3 mt-4">{a.title}</h3>
              <p className="mt-2 flex-1 text-muted">{a.text}</p>
              <ButtonLink href={a.href} variant="secondary" fullWidth className="mt-6">
                {a.cta}
              </ButtonLink>
            </li>
          ))}
        </ul>
      </Section>

      <JsonLd data={[organizationJsonLd(business.social.map((s) => s.url)), websiteJsonLd()]} />
    </>
  )
}
