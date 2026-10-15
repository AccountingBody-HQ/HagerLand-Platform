import { notFound } from 'next/navigation'
import { getBuildRates } from '@/lib/data/reference'
import { buildMetadata } from '@/lib/seo'
import { brand } from '@/lib/brand'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container, Section, SectionHeader } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { Estimator } from '@/components/estimator/Estimator'

export const revalidate = 600

export const metadata = buildMetadata({
  title: 'How much does it cost to build a house in Ethiopia? Build-cost estimator',
  description: 'Estimate the cost of building a G, G+1 or larger house in Ethiopia from HagerLand’s indicative rates per m². An estimate only, not a quote.',
  path: '/build-cost-estimator',
})

/** Build-cost estimator (spec 25.2h). Hidden (404) until HagerLand has entered at least one rate. */
export default async function BuildCostEstimatorPage() {
  const rates = await getBuildRates()
  if (rates.length === 0) notFound()
  return (
    <>
      <Container className="py-6 lg:py-10">
        <Breadcrumbs items={[{ label: 'Contractors', href: '/contractors' }, { label: 'Build-cost estimator' }]} />
        <h1 className="hl-h1 mt-6">How much will it cost to build?</h1>
        <p className="mt-2 max-w-2xl text-muted">A quick, rough estimate for a new house or building, from the floor area, the number of floors and the finish you want.</p>
        <div className="mt-8">
          <Estimator rates={rates} />
        </div>
      </Container>
      <Section tone="stone">
        <SectionHeader title="Next steps" />
        <div className="grid gap-3 sm:grid-cols-3">
          <ButtonLink href="/contractors" className="w-full">
            Get building quotes
          </ButtonLink>
          <ButtonLink href="/supplies/materials-list" variant="secondary" className="w-full">
            Price your materials with {brand.divisions.supply}
          </ButtonLink>
          <ButtonLink href="/professionals" variant="secondary" className="w-full">
            Find an architect or engineer
          </ButtonLink>
        </div>
      </Section>
    </>
  )
}
