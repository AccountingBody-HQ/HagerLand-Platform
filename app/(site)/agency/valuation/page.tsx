import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { buildMetadata } from '@/lib/seo'
import { getAgencyAvailability } from '@/lib/data/pillars'
import { getBusinessDetails } from '@/lib/data/business'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container, Section } from '@/components/ui/Layout'
import { LicenceNote } from '@/components/content/LicenceNote'
import { ValuationForm } from '@/components/agency/AgencyForms'

export const revalidate = 300

export const metadata = buildMetadata({
  title: 'Book a property valuation',
  description: 'A HagerLand estate agent visits your property in Ethiopia and tells you what it could sell or let for. No obligation to instruct us afterwards.',
  path: '/agency/valuation',
})

/** "Book a valuation" with HagerLand's estate agency (spec 26.5): creates a lead and a valuation request. */
export default async function ValuationPage() {
  const [agency, business] = await Promise.all([getAgencyAvailability(), getBusinessDetails()])
  if (!agency.any) notFound()
  const purposes = [...(agency.sales ? (['sale'] as const) : []), ...(agency.lettings ? (['rent'] as const) : [])]
  return (
    <>
      <section className="border-b border-border bg-stone-50">
        <Container className="py-10 sm:py-14">
          <Breadcrumbs items={[{ label: 'Estate agency', href: '/agency' }, { label: 'Book a valuation' }]} />
          <h1 className="hl-h1 mt-8 max-w-3xl">Book a valuation</h1>
          <p className="mt-4 max-w-2xl text-[1.0625rem] text-muted">A HagerLand agent visits your property and tells you what it could {agency.sales && agency.lettings ? 'sell or let' : agency.sales ? 'sell' : 'let'} for, and how we would market it. There is no obligation to instruct us afterwards.</p>
        </Container>
      </section>
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_480px]">
          <div className="space-y-6">
            <h2 className="hl-h2">What happens</h2>
            <ul className="space-y-2">
              {['We call you to arrange a visit at a time that suits you (we can talk to owners abroad in their time zone).', 'An agent visits, looks at the property and its documents, and asks about your plans.', 'We send you our valuation range and how we would market the property.', 'If you want us to act for you, we agree our service and fee in writing.'].map((t) => (
                <li key={t} className="flex gap-3">
                  <Check className="mt-1 size-5 shrink-0 text-green" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <p className="text-small text-muted">
              A valuation is our professional opinion of a likely price or rent, not a formal valuation for a bank or court. For those, <Link href="/request-service/property-valuers" className="font-semibold text-green underline">get quotes from independent valuers</Link>.
            </p>
            <LicenceNote kind="estate_agency" licence={business.licences.estate_agency} />
          </div>
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <ValuationForm purposes={purposes} />
          </div>
        </div>
      </Section>
    </>
  )
}
