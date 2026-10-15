import Link from 'next/link'
import { ArrowRight, Building, Calculator, ClipboardCheck, Hammer, HardHat, House, Landmark, ShieldCheck, Truck, Wrench, Ruler, Search, KeyRound, TrendingUp } from 'lucide-react'
import { buildMetadata } from '@/lib/seo'
import { brand } from '@/lib/brand'
import { getVerticals } from '@/lib/data/verticals'
import { getAgencyAvailability } from '@/lib/data/pillars'
import { verticalForPath } from '@/lib/verticals'
import { COUNTRIES } from '@/lib/countries'
import { verticalLandingMetadata } from '@/components/verticals/ComingSoonPage'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container, Section, SectionHeader } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { SoonBadge } from '@/components/verticals/SoonBadge'

export const revalidate = 600

export function generateMetadata() {
  return verticalLandingMetadata('diaspora', () =>
    buildMetadata({
      title: 'Diaspora services for Ethiopians abroad',
      description: 'For Ethiopians abroad: buy, build, renovate and look after property in Ethiopia, and find Ethiopian-run trades and professionals where you live.',
      path: '/diaspora',
    }),
  )
}

type Need = { icon: typeof House; title: string; text: string; href: string }

/**
 * Diaspora → Ethiopia (spec 24.6a), organised by the three customer segments of AB's ecosystem diagram (spec 26.11).
 * Each links into a live pillar page or the request engine; hidden areas disappear and coming-soon ones say so.
 */
const SEGMENTS: { id: string; title: string; text: string; needs: Need[] }[] = [
  {
    id: 'buyers',
    title: 'International buyers and investors',
    text: 'Buy a home, land or an investment in Ethiopia without having to be there for every step.',
    needs: [
      { icon: House, title: 'Buy property in Ethiopia', text: 'Homes, apartments and land, every listing reviewed.', href: '/property/for-sale' },
      { icon: Search, title: 'Have us find a property for you', text: 'Property sourcing and buyer representation from abroad.', href: '/agency/property-sourcing' },
      { icon: TrendingUp, title: 'Investment property', text: 'We source land, commercial and new-build opportunities for you.', href: '/agency/property-sourcing' },
      { icon: ClipboardCheck, title: 'Verification and due diligence', text: 'Inspections, and property lawyers to check documents.', href: '/request-service/property-inspections' },
      { icon: Landmark, title: 'Finance', text: 'Mortgages and construction finance through licensed partners.', href: '/finance' },
      { icon: ShieldCheck, title: 'Insurance', text: 'Home, landlord and construction cover through licensed partners.', href: '/insurance' },
    ],
  },
  {
    id: 'tenants-landlords',
    title: 'Overseas tenants and landlords',
    text: 'Let your property from abroad, or line up a place to rent before you arrive.',
    needs: [
      { icon: KeyRound, title: 'Let your property with HagerLand', text: 'We find and check tenants and handle the tenancy.', href: '/agency/let' },
      { icon: Building, title: 'Landlord services', text: 'Let only, let and manage, or management only.', href: '/agency/landlords' },
      { icon: House, title: 'Find a place to rent', text: 'Book a video viewing before you travel.', href: '/property/to-rent' },
    ],
  },
  {
    id: 'remote',
    title: 'Remote management and support',
    text: 'Look after, build or improve property at home, with one accountable team on the ground.',
    needs: [
      { icon: KeyRound, title: 'Property management', text: `${brand.divisions.propertyCare}, for owners abroad.`, href: '/diaspora/property-care' },
      { icon: Wrench, title: 'Maintain your property', text: 'Repairs and regular maintenance.', href: '/repairs-maintenance' },
      { icon: HardHat, title: 'Build a house', text: 'One brief for design, building and materials.', href: '/build/project' },
      { icon: Hammer, title: 'Renovate family property', text: 'Refurbishment quotes for a home you already own.', href: '/request-service/property-refurbishment' },
      { icon: ClipboardCheck, title: 'Supervise construction', text: 'Independent construction managers on site for you.', href: '/request-service/construction-managers' },
      { icon: Ruler, title: 'Find architects and engineers', text: 'Design and professional services.', href: '/professionals/design-consultancy' },
      { icon: Truck, title: 'Buy construction materials', text: 'One quote for your whole materials list.', href: '/supplies/materials-list' },
      { icon: Calculator, title: 'Accountants and tax advisers', text: 'Professionals who know property in Ethiopia.', href: '/professionals/property-accountants' },
    ],
  },
]

export default async function DiasporaPage() {
  const verticals = await getVerticals()
  const status = (href: string) => {
    const key = verticalForPath(href)
    return key ? verticals.find((v) => v.key === key)?.status ?? 'hidden' : 'live'
  }
  const agency = await getAgencyAvailability()
  const agencyHidden = (href: string) => (href.startsWith('/agency/let') || href.startsWith('/agency/landlords') ? !agency.lettings : href.startsWith('/agency/') ? !agency.sales : false)
  const segments = SEGMENTS.map((g) => ({ ...g, needs: g.needs.filter((n) => status(n.href) !== 'hidden' && !agencyHidden(n.href)) })).filter((g) => g.needs.length > 0)
  return (
    <>
      <section className="hl-blueprint bg-ink text-white">
        <Container className="py-12 sm:py-20">
          <Breadcrumbs inverse items={[{ label: 'Diaspora Services' }]} />
          <p className="hl-eyebrow mt-8 text-gold">{brand.audienceLine}</p>
          <h1 className="hl-display mt-3 max-w-3xl text-white">Your trusted bridge to property in Ethiopia.</h1>
          <p className="mt-5 max-w-2xl text-[1.0625rem] text-white/80">Buy, build, renovate and look after property at home from wherever you live, and find Ethiopian-run services in your own city.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row [&>*]:sm:min-w-56">
            <ButtonLink href="#home" size="lg">
              Property in Ethiopia
            </ButtonLink>
            <ButtonLink href="#abroad" variant="outline-inverse" size="lg">
              Services where you live
            </ButtonLink>
          </div>
        </Container>
      </section>

      <Section tone="ink" className="hl-blueprint">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="hl-eyebrow text-gold">{brand.divisions.propertyCare}</p>
            <h2 className="hl-h2 mt-2 text-white">Property management for owners abroad</h2>
            <p className="mt-3 max-w-2xl text-white/80">Management, maintenance, security, inspections with photo reports, tenants, rent collection and representation, with one accountable team instead of relying on friends and relatives.</p>
          </div>
          <ButtonLink href="/diaspora/property-care" variant="gold" size="lg">
            About Property Care <ArrowRight />
          </ButtonLink>
        </div>
      </Section>

      <Section id="home">
        <SectionHeader eyebrow="Property at home" title="Property in Ethiopia, from wherever you are" />
        <div className="space-y-10">
          {segments.map((g) => (
            <div key={g.id} id={g.id} className="scroll-mt-24">
              <h3 className="hl-h3">{g.title}</h3>
              <p className="mb-4 mt-1 text-muted">{g.text}</p>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.needs.map((n) => (
                  <li key={n.title}>
                    <Link href={n.href} className="group flex h-full gap-4 rounded-lg border border-border bg-white p-4 hover:border-green">
                      <n.icon className="size-6 shrink-0 text-green" aria-hidden />
                      <span>
                        <span className="flex items-center gap-2 font-semibold text-ink">
                          {n.title} {status(n.href) === 'coming_soon' && <SoonBadge />}
                        </span>
                        <span className="mt-1 block text-small text-muted">{n.text}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="stone" id="abroad">
        <SectionHeader eyebrow="Services where you live" title="Ethiopian-run trades and professionals near you" description="Plumbers, electricians, builders, decorators, architects, agents, mortgage advisers, lawyers, cleaners, removals and more, in the cities where many Ethiopians live." />
        <ul className="flex flex-wrap gap-2">
          {COUNTRIES.filter((c) => c.code !== 'ET').map((c) => (
            <li key={c.code}>
              <Link href={`/diaspora/services-abroad?country=${c.code}`} className="inline-flex min-h-11 items-center rounded-full border border-border-strong bg-white px-4 text-small font-semibold text-ink hover:border-green">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row [&>*]:sm:flex-1 sm:max-w-xl">
          <ButtonLink href="/diaspora/services-abroad">Find a service</ButtonLink>
          <ButtonLink href="/list-with-us#professionals" variant="secondary">
            List your business abroad
          </ButtonLink>
        </div>
      </Section>
    </>
  )
}
