import { buildMetadata } from '@/lib/seo'
import { getRequestGroups } from '@/lib/data/service-requests'
import { searchOrganisations } from '@/lib/data/organisations'
import { verticalLandingMetadata } from '@/components/verticals/ComingSoonPage'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container, Section, SectionHeader } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { CompanyCard } from '@/components/company/CompanyCard'
import { HowRequestsWork } from '@/components/service-requests/HowRequestsWork'
import { ServiceGroups } from '@/components/service-requests/ServiceGroups'
import { FinanceAsk } from '@/components/verticals/FinanceAsk'
import Link from 'next/link'
import { Calculator } from 'lucide-react'
import { getBuildRates } from '@/lib/data/reference'

export const revalidate = 600

export function generateMetadata() {
  return verticalLandingMetadata('contractors', () =>
    buildMetadata({
      title: 'Builders and contractors in Ethiopia',
      description: 'House builders, general contractors, renovation firms and specialist trades. Describe your project once and get quotes from up to three contractors at a time.',
      path: '/contractors',
    }),
  )
}

/** Construction & Contractors vertical (PLATFORM_VISION §4): browse contractors or request quotes. */
export default async function ContractorsPage() {
  const [groups, verified, rates] = await Promise.all([getRequestGroups(['contractors']), searchOrganisations({ verifiedOnly: true, kinds: ['contractor'], pageSize: 4 }), getBuildRates()])
  const building = groups.flatMap((g) => g.categories).find((c) => c.slug === 'building-contractors' || c.slug === 'general-contractors')
  return (
    <>
      <section className="hl-blueprint bg-ink text-white">
        <Container className="py-12 sm:py-16">
          <Breadcrumbs inverse items={[{ label: 'Contractors' }]} />
          <h1 className="hl-h1 mt-8 max-w-3xl text-white">Builders and contractors, with quotes on request.</h1>
          <p className="mt-4 max-w-2xl text-[1.0625rem] text-white/80">From a new G+1 home to a kitchen refit: describe your project once and get quotes from up to three contractors at a time who do that work where you are building.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row [&>*]:sm:min-w-56">
            {building && (
              <ButtonLink href={`/request-service/${building.slug}`} size="lg">
                Get building quotes
              </ButtonLink>
            )}
            <ButtonLink href="/professionals/building-contracting" variant="outline-inverse" size="lg">
              Browse contractors
            </ButtonLink>
          </div>
        </Container>
      </section>
      <Section>
        <HowRequestsWork />
        {rates.length > 0 && (
          <p className="mt-6">
            <Link href="/build-cost-estimator" className="inline-flex min-h-11 items-center gap-2 font-semibold text-green underline">
              <Calculator className="size-5" aria-hidden /> How much will it cost to build? Try the build-cost estimator
            </Link>
          </p>
        )}
        <div className="mt-6 max-w-xl">
          <FinanceAsk categorySlug="construction-finance" text="Construction finance for your build, through licensed partners." />
        </div>
        <p className="mt-6 max-w-3xl text-small text-muted">Ethiopian contractors are licensed by category and grade. Businesses marked Verified have had their trade licence and tax number checked by HagerLand; always see the licence and agree the work in a written contract before paying.</p>
      </Section>
      <Section tone="stone">
        <SectionHeader title="Choose the work you need" />
        <ServiceGroups groups={groups} directory />
      </Section>
      {verified.items.length > 0 && (
        <Section>
          <SectionHeader title="Verified contractors" action={<ButtonLink href="/professionals/building-contracting" variant="secondary">See all</ButtonLink>} />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {verified.items.map((o) => (
              <li key={o.id}>
                <CompanyCard org={o} />
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section tone="tint" compact>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="hl-h3">Are you a contractor or tradesperson?</h2>
            <p className="mt-1 text-muted">Show your work and receive requests from people building in the areas you cover.</p>
          </div>
          <ButtonLink href="/list-with-us#professionals" variant="secondary">
            Join as a contractor
          </ButtonLink>
        </div>
      </Section>
    </>
  )
}
