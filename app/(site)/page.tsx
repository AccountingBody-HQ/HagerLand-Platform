import Link from 'next/link'
import { ArrowRight, BadgeCheck, Building2, ClipboardList, Clock, Hammer, KeyRound, ShieldCheck, Store, Truck, HardHat, FileText } from 'lucide-react'
import { brand } from '@/lib/brand'
import { buildMetadata, organizationJsonLd, websiteJsonLd } from '@/lib/seo'
import { getBusinessDetails } from '@/lib/data/business'
import { getLocationByPath, getServiceCategories, getSiteSettings } from '@/lib/data/reference'
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
import { RegisterInterest } from '@/components/development/RegisterInterest'
import { JsonLd } from '@/components/seo/JsonLd'
import { getVerticals } from '@/lib/data/verticals'
import { isLive, verticalHref, visibleVertical } from '@/lib/verticals'
import { COMING_SOON } from '@/lib/content/verticals'
import { SoonBadge } from '@/components/verticals/SoonBadge'
import { InterestForm } from '@/components/verticals/InterestForm'
import { GuidesTeaser } from '@/components/guides/GuidesTeaser'
import { getLocale } from '@/lib/i18n/server'
import { translator } from '@/lib/i18n/translate'
import { localizeHref } from '@/lib/i18n/config'

export const revalidate = 300

export const metadata = buildMetadata({
  title: `${brand.name} — ${brand.titleLine}`,
  absoluteTitle: true,
  description: 'Property, building supplies, professionals, contractors, repairs and diaspora services in one place, for Ethiopians in Ethiopia and around the world.',
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
  const [bole, services, settings, verticals] = await Promise.all([getLocationByPath('addis-ababa/bole'), getServiceCategories(), getSiteSettings(), getVerticals()])
  const live = {
    property: isLive(verticals, 'property'),
    supplies: isLive(verticals, 'building-supplies'),
    professionals: isLive(verticals, 'professionals'),
  }
  const ourDevs = visibleVertical(verticals, 'our-developments')
  const pickIds = Array.isArray(settings.homepage_featured_ids) ? settings.homepage_featured_ids.filter((x): x is string => typeof x === 'string') : []
  const picks = await getPropertiesByIds(pickIds)
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
  const locale = getLocale()
  const t = translator(locale)
  const lh = (h: string) => localizeHref(h, locale)

  const quickLinks = [
    live.property && boleApartments.total > 0 && { label: 'Apartments in Bole', href: '/property/for-sale/addis-ababa/bole?type=apartment' },
    live.property && land.total > 0 && { label: 'Land for sale', href: '/property/for-sale?type=land' },
    live.supplies && { label: 'Request a materials quote', href: '/supplies/materials-list' },
    live.professionals && architects.total > 0 && { label: 'Find an architect', href: '/professionals/architects' },
  ].filter((x): x is { label: string; href: string } => Boolean(x))

  // "Find land → finance → design → build → supply → insure → maintain → sell or rent" (spec 24.3).
  const journey = [
    { label: 'Find land', href: '/property/for-sale?type=land', vertical: 'property' as const },
    { label: 'Finance', href: '/finance', vertical: 'finance' as const },
    { label: 'Design', href: '/professionals/architects', vertical: 'professionals' as const },
    { label: 'Build', href: '/contractors', vertical: 'contractors' as const },
    { label: 'Supply', href: '/supplies', vertical: 'building-supplies' as const },
    { label: 'Insure', href: '/insurance', vertical: 'insurance' as const },
    { label: 'Maintain', href: '/repairs-maintenance', vertical: 'repairs-maintenance' as const },
    { label: 'Sell or rent', href: '/list-with-us#owners', vertical: 'property' as const },
  ].map((j) => ({ ...j, v: visibleVertical(verticals, j.vertical) }))

  const proofPoints = [
    { icon: ClipboardList, title: 'Every listing reviewed', text: 'Our team checks every listing before it goes live.' },
    { icon: BadgeCheck, title: 'Verified businesses', text: 'The Verified badge appears only after we check documents.' },
    { icon: Clock, title: 'Current, not stale', text: 'Property listings expire unless their owner renews them.' },
    { icon: Hammer, title: 'We know construction', text: `${brand.divisions.supply} sources building materials, so we understand costs and quality.` },
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
          <p className="hl-eyebrow text-gold">{t(brand.audienceLine)}</p>
          <h1 className="hl-display mt-4 max-w-4xl text-white">{t(brand.masterLine)}</h1>
          <p className="mt-5 max-w-2xl text-[1.0625rem] font-semibold text-white/85">{t(brand.supportLine)}</p>
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

      <Section labelledBy="ecosystem-title">
        <SectionHeader id="ecosystem-title" title={t('Everything around your property')} description={t('Services that work together, from finding land to selling or renting what you built.')} />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {verticals.map((v) => {
            const gold = v.key === 'our-developments'
            return (
              <li key={v.key}>
                <Link href={lh(verticalHref(v))} className={`group flex h-full flex-col rounded-xl border p-4 transition-shadow hover:shadow-md sm:p-5 ${gold ? 'border-gold/40 bg-gold-soft/50' : 'border-border bg-white'}`}>
                  <span className="flex items-start justify-between gap-2">
                    <span className={`flex size-11 items-center justify-center rounded-lg ${gold ? 'bg-gold text-white' : 'bg-green-soft text-green'}`}>
                      <DynamicIcon name={v.icon} className="size-6" />
                    </span>
                    {v.status === 'coming_soon' && <SoonBadge />}
                  </span>
                  <span className="mt-4 font-display text-body font-bold text-ink sm:text-h3">{t(v.name)}</span>
                  <span className="mt-1 text-small text-muted">{v.shortDescription ? t(v.shortDescription) : null}</span>
                  <span className={`mt-auto inline-flex items-center gap-1 pt-4 text-small font-semibold ${gold ? 'text-gold-dark' : 'text-green'}`}>
                    {v.status === 'live' ? t('Explore') : t('Register interest')} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
        <div className="mt-10 rounded-xl border border-border bg-stone-50 p-4 sm:p-6">
          <h3 className="hl-eyebrow text-muted">{t('One journey')}</h3>
          <ol className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-2">
            {journey.map((j, i) => (
              <li key={j.label} className="flex items-center gap-1">
                {j.v ? (
                  <Link href={lh(j.href)} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-3.5 text-small font-semibold text-ink ring-1 ring-border hover:ring-green">
                    {t(j.label)}
                    {j.v.status === 'coming_soon' && <SoonBadge />}
                  </Link>
                ) : (
                  <span className="inline-flex min-h-11 items-center rounded-full px-3.5 text-small font-semibold text-muted">{t(j.label)}</span>
                )}
                {i < journey.length - 1 && <ArrowRight className="size-4 text-subtle" aria-hidden />}
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {live.property && (
      <Section tone="stone">
        {totalProperties >= 4 ? (
          <>
            <SectionHeader title="Latest properties" />
            <LatestProperties sale={featuredThenNewest([...picks.filter((p) => p.purpose === 'sale'), ...saleFeatured.items], saleNewest.items, 8)} rent={featuredThenNewest([...picks.filter((p) => p.purpose === 'rent'), ...rentFeatured.items], rentNewest.items, 8)} />
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
                <Link href={c.href} className="flex h-full min-h-28 flex-col justify-between rounded-lg border border-border bg-white p-4 hover:border-green">
                  <DynamicIcon name={c.icon} className="size-6 text-green" />
                  <span className="mt-3 text-small font-semibold text-ink">{c.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>
      )}

      {ourDevs?.status === 'live' && (
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
      )}
      {ourDevs?.status === 'coming_soon' && (
        <section className="hl-blueprint bg-ink text-white">
          <Container className="grid gap-10 py-14 sm:py-20 lg:grid-cols-[1fr_440px] lg:items-start">
            <div>
              <p className="hl-eyebrow flex items-center gap-2 text-gold">
                {ourDevs.name} <SoonBadge long />
              </p>
              <h2 className="hl-h2 mt-2 text-white">{COMING_SOON['our-developments'].headline}</h2>
              {COMING_SOON['our-developments'].what.map((p) => (
                <p key={p} className="mt-4 max-w-xl text-white/80">
                  {p}
                </p>
              ))}
              <ButtonLink href={verticalHref(ourDevs)} variant="gold" className="mt-6">
                About {ourDevs.name} <ArrowRight />
              </ButtonLink>
            </div>
            <div className="rounded-xl bg-white p-5 text-ink shadow-lg">
              <h3 className="hl-h3">Hear first when we announce a project</h3>
              <p className="mb-4 mt-1 text-small text-muted">Register your interest. No obligation.</p>
              <InterestForm verticalKey="our-developments" verticalName={ourDevs.name} idPrefix="home-ri" />
            </div>
          </Container>
        </section>
      )}

      {live.professionals && (
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

      <GuidesTeaser />
      <JsonLd data={[organizationJsonLd(business.social.map((s) => s.url)), websiteJsonLd()]} />
    </>
  )
}
