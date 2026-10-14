import Link from 'next/link'
import { ArrowRight, Building2, House, KeyRound, LandPlot, Store, Warehouse } from 'lucide-react'
import { searchProperties, getPopularLocations } from '@/lib/data/properties'
import { buildMetadata } from '@/lib/seo'
import { Container, Section, SectionHeader } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { PropertyCard } from '@/components/property/PropertyCard'
import { PropertyQuickSearch } from '@/components/property/PropertyQuickSearch'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { DevelopmentsStrip } from '@/components/development/DevelopmentsStrip'
import { GuidesTeaser } from '@/components/guides/GuidesTeaser'

export const revalidate = 300

export const metadata = buildMetadata({
  title: 'Property for sale and to rent in Ethiopia',
  description: 'Find homes, apartments, land and commercial property for sale and to rent across Ethiopia. Every listing is reviewed, and stale listings are removed.',
  path: '/property',
})

const TYPE_LINKS = [
  { label: 'Apartments', href: '/property/for-sale?type=apartment', icon: Building2 },
  { label: 'Houses & villas', href: '/property/for-sale?type=house,villa', icon: House },
  { label: 'Land & plots', href: '/property/for-sale?type=land', icon: LandPlot },
  { label: 'Condominiums', href: '/property/for-sale?type=condominium', icon: Building2 },
  { label: 'Shops & offices', href: '/property/to-rent?type=shop,office', icon: Store },
  { label: 'Warehouses', href: '/property/to-rent?type=warehouse', icon: Warehouse },
]

export default async function PropertyHub() {
  const [sale, rent, popular] = await Promise.all([
    searchProperties({ purpose: 'sale', filters: { sort: 'newest' }, pageSize: 8 }),
    searchProperties({ purpose: 'rent', filters: { sort: 'newest' }, pageSize: 8 }),
    getPopularLocations(null, 8),
  ])

  return (
    <>
      <section className="hl-blueprint bg-ink text-white">
        <Container className="py-10 sm:py-14">
          <Breadcrumbs inverse items={[{ label: 'Property' }]} />
          <h1 className="hl-h1 mt-5 max-w-3xl text-white">Property for sale and to rent across Ethiopia</h1>
          <p className="mt-3 max-w-2xl text-white/75">Homes, apartments, land and commercial space, reviewed before they go live and taken down when they go stale.</p>
          <div className="mt-8 rounded-xl bg-white p-4 text-ink shadow-lg sm:p-5">
            <PropertyQuickSearch idPrefix="hub" />
          </div>
        </Container>
      </section>

      {popular.length > 0 && (
        <Section compact>
          <SectionHeader title="Popular locations" />
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {popular.map((l) => (
              <li key={l.id}>
                <Link href={`/property/for-sale/${l.path}`} className="flex h-full flex-col rounded-lg border border-border bg-white p-4 hover:border-green">
                  <span className="font-semibold text-ink">{l.name}</span>
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

      {sale.items.length > 0 && (
        <Section tone="stone" compact>
          <SectionHeader title="Latest for sale" action={<ButtonLink href="/property/for-sale" variant="secondary">View all</ButtonLink>} />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sale.items.map((p) => (
              <li key={p.id}>
                <PropertyCard property={p} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {rent.items.length > 0 && (
        <Section compact>
          <SectionHeader title="Latest to rent" action={<ButtonLink href="/property/to-rent" variant="secondary">View all</ButtonLink>} />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {rent.items.map((p) => (
              <li key={p.id}>
                <PropertyCard property={p} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <DevelopmentsStrip title="New developments" />

      <Section tone="stone" compact>
        <SectionHeader title="Browse by property type" />
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {TYPE_LINKS.map((t) => (
            <li key={t.label}>
              <Link href={t.href} className="flex min-h-24 flex-col justify-between rounded-lg border border-border bg-white p-4 hover:border-green">
                <t.icon className="size-6 text-green" aria-hidden />
                <span className="mt-3 font-semibold text-ink">{t.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section compact>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col justify-between gap-6 rounded-xl border border-border bg-white p-6 sm:p-8">
            <div>
              <KeyRound className="size-7 text-green" aria-hidden />
              <h2 className="hl-h3 mt-4">Find an estate agent</h2>
              <p className="mt-2 text-muted">Agents and brokers who know the area, with their current listings in one place.</p>
            </div>
            <ButtonLink href="/agents" variant="secondary" className="self-start">
              Find an agent <ArrowRight />
            </ButtonLink>
          </div>
          <div className="flex flex-col justify-between gap-6 rounded-xl bg-green-darker p-6 text-white sm:p-8">
            <div>
              <House className="size-7 text-gold" aria-hidden />
              <h2 className="hl-h3 mt-4 text-white">Selling or letting a property?</h2>
              <p className="mt-2 text-white/80">List it on HagerLand. We review it, publish it and send enquiries straight to you.</p>
            </div>
            <ButtonLink href="/list-with-us#owners" variant="inverse" className="self-start">
              List your property
            </ButtonLink>
          </div>
        </div>
      </Section>
      <GuidesTeaser topic="property" title="Property guides" />
    </>
  )
}
