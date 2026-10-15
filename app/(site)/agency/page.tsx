import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { buildMetadata } from '@/lib/seo'
import { brand } from '@/lib/brand'
import { AGENCY_CAPABILITIES, AGENCY_SERVICES } from '@/lib/content/agency'
import { PageHero } from '@/components/content/PageHero'
import { Section, SectionHeader } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { notFound } from 'next/navigation'
import { LicenceNote } from '@/components/content/LicenceNote'
import { getAgencyAvailability } from '@/lib/data/pillars'
import { getBusinessDetails } from '@/lib/data/business'

export const revalidate = 300

export const metadata = buildMetadata({
  title: 'Estate agency services',
  description: 'HagerLand as your estate agent in Ethiopia: selling, letting, buyer representation, property sourcing for diaspora buyers and developer sales.',
  path: '/agency',
})

/** Estate agency services (spec 24.7, PLATFORM_VISION §3). */
export default async function AgencyPage() {
  const [agency, business] = await Promise.all([getAgencyAvailability(), getBusinessDetails()])
  if (!agency.any) notFound()
  const services = AGENCY_SERVICES.filter((s) => (s.side === 'sales' ? agency.sales : agency.lettings))
  const capabilities = AGENCY_CAPABILITIES.filter((c) => services.some((s) => s.slug === c.slug))
  return (
    <>
      <PageHero crumb="Estate agency" eyebrow={brand.name} title="Estate agency services" intro={`As well as running the marketplace, ${brand.name} can act for you: selling, letting, buying and sourcing property. Listings we market are always labelled “Marketed by ${brand.name}” and are never given hidden priority in search.`} />
      <Section>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <li key={s.slug}>
              <Link href={`/agency/${s.slug}`} className="group flex h-full flex-col rounded-xl border border-border bg-white p-6 hover:border-green">
                <h2 className="hl-h3">{s.title}</h2>
                <p className="mt-2 flex-1 text-muted">{s.short}</p>
                <span className="mt-4 inline-flex items-center gap-1 font-semibold text-green">
                  Find out more <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/agency/valuation" className="group flex h-full flex-col rounded-xl border border-border bg-stone-50 p-6 hover:border-green">
              <h2 className="hl-h3">Book a valuation</h2>
              <p className="mt-2 flex-1 text-muted">A HagerLand agent visits and tells you what your property could sell or let for. For other purposes, get quotes from independent valuers.</p>
              <span className="mt-4 inline-flex items-center gap-1 font-semibold text-green">
                Book a valuation <ArrowRight className="size-4" aria-hidden />
              </span>
            </Link>
          </li>
        </ul>
      </Section>
      <Section tone="stone">
        <SectionHeader title="Everything we can help with" />
        <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((c) => (
            <li key={c.label}>
              <Link href={`/agency/${c.slug}`} className="inline-flex min-h-11 items-center gap-2 text-ink hover:underline">
                <Check className="size-4 text-green" aria-hidden /> {c.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-muted">{business.agencyFeeSchedule ? business.agencyFeeSchedule : 'Our fees and what we will do are agreed with you in writing before we start.'}</p>
        <LicenceNote kind="estate_agency" licence={business.licences.estate_agency} className="mt-2" />
        <ButtonLink href="/contact?topic=agency" variant="secondary" className="mt-6">
          Talk to us
        </ButtonLink>
      </Section>
    </>
  )
}
