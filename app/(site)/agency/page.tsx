import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { buildMetadata } from '@/lib/seo'
import { brand } from '@/lib/brand'
import { AGENCY_CAPABILITIES, AGENCY_SERVICES } from '@/lib/content/agency'
import { PageHero } from '@/components/content/PageHero'
import { Section, SectionHeader } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'

export const revalidate = 3600

export const metadata = buildMetadata({
  title: 'Estate agency services',
  description: 'HagerLand as your estate agent in Ethiopia: selling, letting, buyer representation, property sourcing for diaspora buyers and developer sales.',
  path: '/agency',
})

/** Estate agency services (spec 24.7, PLATFORM_VISION §3). */
export default function AgencyPage() {
  return (
    <>
      <PageHero crumb="Estate agency" eyebrow={brand.name} title="Estate agency services" intro={`As well as running the marketplace, ${brand.name} can act for you: selling, letting, buying and sourcing property. Listings we market are always labelled “Marketed by ${brand.name}” and are never given hidden priority in search.`} />
      <Section>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AGENCY_SERVICES.map((s) => (
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
            <Link href="/request-service/property-valuers" className="group flex h-full flex-col rounded-xl border border-border bg-stone-50 p-6 hover:border-green">
              <h2 className="hl-h3">Request a valuation</h2>
              <p className="mt-2 flex-1 text-muted">Get quotes from property valuers for a sale, a mortgage, insurance or a family matter.</p>
              <span className="mt-4 inline-flex items-center gap-1 font-semibold text-green">
                Request a valuation <ArrowRight className="size-4" aria-hidden />
              </span>
            </Link>
          </li>
        </ul>
      </Section>
      <Section tone="stone">
        <SectionHeader title="Everything we can help with" />
        <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {AGENCY_CAPABILITIES.map((c) => (
            <li key={c.label}>
              <Link href={`/agency/${c.slug}`} className="inline-flex min-h-11 items-center gap-2 text-ink hover:underline">
                <Check className="size-4 text-green" aria-hidden /> {c.label}
              </Link>
            </li>
          ))}
        </ul>
        <ButtonLink href="/contact?topic=agency" variant="secondary" className="mt-8">
          Talk to us
        </ButtonLink>
      </Section>
    </>
  )
}
