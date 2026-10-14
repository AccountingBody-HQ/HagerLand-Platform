import Link from 'next/link'
import { ArrowRight, Siren } from 'lucide-react'
import { buildMetadata } from '@/lib/seo'
import { getRequestGroups } from '@/lib/data/service-requests'
import { getVerticals } from '@/lib/data/verticals'
import { isLive } from '@/lib/verticals'
import { brand } from '@/lib/brand'
import { verticalLandingMetadata } from '@/components/verticals/ComingSoonPage'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container, Section, SectionHeader } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { HowRequestsWork } from '@/components/service-requests/HowRequestsWork'
import { ServiceGroups } from '@/components/service-requests/ServiceGroups'

export const revalidate = 600

export function generateMetadata() {
  return verticalLandingMetadata('repairs-maintenance', () =>
    buildMetadata({
      title: 'Repairs and maintenance',
      description: 'Plumbing, electrical, roofing, cleaning, pest control and emergency repairs. Describe the job once and get quotes from up to three local providers.',
      path: '/repairs-maintenance',
    }),
  )
}

/** Repairs & Maintenance vertical (PLATFORM_VISION §6), running on the request engine. */
export default async function RepairsPage() {
  const [groups, verticals] = await Promise.all([getRequestGroups(['repairs-maintenance']), getVerticals()])
  const emergency = groups.flatMap((g) => g.categories).find((c) => c.slug === 'emergency-repairs')
  return (
    <>
      <section className="hl-blueprint bg-ink text-white">
        <Container className="py-12 sm:py-16">
          <Breadcrumbs inverse items={[{ label: 'Repairs & Maintenance' }]} />
          <h1 className="hl-h1 mt-8 max-w-3xl text-white">Repairs and maintenance, without the search.</h1>
          <p className="mt-4 max-w-2xl text-[1.0625rem] text-white/80">Tell us what needs fixing. We send it to up to three suitable providers near you, and you compare their quotes. Free for you, with no obligation.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row [&>*]:sm:min-w-56">
            <ButtonLink href="#services" size="lg">
              Choose a repair
            </ButtonLink>
            {emergency && (
              <ButtonLink href={`/request-service/${emergency.slug}`} variant="outline-inverse" size="lg">
                <Siren /> Emergency repair
              </ButtonLink>
            )}
          </div>
          <p className="mt-4 max-w-2xl text-small text-white/70">If anyone is in danger, call the emergency services first.</p>
        </Container>
      </section>
      <Section>
        <HowRequestsWork />
      </Section>
      <Section tone="stone" id="services">
        <SectionHeader title="What do you need?" description="Choose a service to describe the job. Emergency requests are looked at first." />
        <ServiceGroups groups={groups} />
      </Section>
      {isLive(verticals, 'diaspora') && (
        <Section compact>
          <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-border bg-white p-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="hl-h3">Live abroad and own property in Ethiopia?</h2>
              <p className="mt-1 text-muted">{brand.divisions.propertyCare} looks after your property for you: maintenance, inspections with photo reports, tenants and more.</p>
            </div>
            <Link href="/diaspora/property-care" className="inline-flex min-h-11 shrink-0 items-center gap-1 font-semibold text-green">
              About {brand.divisions.propertyCare} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </Section>
      )}
      <Section tone="tint" compact>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="hl-h3">Do repairs or maintenance work?</h2>
            <p className="mt-1 text-muted">List your business for free to receive requests in the areas you cover.</p>
          </div>
          <ButtonLink href="/list-with-us#professionals" variant="secondary">
            Join as a provider
          </ButtonLink>
        </div>
      </Section>
    </>
  )
}
