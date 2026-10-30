import { notFound } from 'next/navigation'
import { Check } from 'lucide-react'
import { buildMetadata } from '@/lib/seo'
import { AGENCY_SERVICES } from '@/lib/content/agency'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container, Section } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { EnquiryForm } from '@/components/enquiry/EnquiryForm'
import { LicenceNote } from '@/components/content/LicenceNote'
import { getAgencyAvailability } from '@/lib/data/pillars'
import { getBusinessDetails } from '@/lib/data/business'
import { getSiteSettings } from '@/lib/data/reference'

export const revalidate = 300

export function generateStaticParams() {
  return AGENCY_SERVICES.map((s) => ({ service: s.slug }))
}

export async function generateMetadata(props: { params: Promise<{ service: string }> }) {
  const params = await props.params
  const s = AGENCY_SERVICES.find((x) => x.slug === params.service)
  if (!s) return {}
  return buildMetadata({ title: s.title, description: `${s.intro}`.slice(0, 158), path: `/agency/${s.slug}` })
}

/** One estate agency service with its enquiry form (spec 24.7). Enquiries go to the HagerLand sales inbox. */
export default async function AgencyServicePage(props: { params: Promise<{ service: string }> }) {
  const params = await props.params
  const s = AGENCY_SERVICES.find((x) => x.slug === params.service)
  if (!s) notFound()
  // Each service follows its side of the agency: sales need Buy & Sell Direct, lettings need Rent & Let Direct (26.1).
  const [agency, business, settings] = await Promise.all([getAgencyAvailability(), getBusinessDetails(), getSiteSettings()])
  if (s.side === 'sales' ? !agency.sales : !agency.lettings) notFound()
  const rentReady = s.slug === 'landlords' && Array.isArray(settings.rent_ready_checklist) ? settings.rent_ready_checklist.filter((x): x is string => typeof x === 'string') : []
  return (
    <>
      <section className="border-b border-border bg-stone-50">
        <Container className="py-10 sm:py-14">
          <Breadcrumbs items={[{ label: 'Estate agency', href: '/agency' }, { label: s.title }]} />
          <p className="hl-eyebrow mt-8 text-green">{s.forWho}</p>
          <h1 className="hl-h1 mt-2 max-w-3xl">{s.title}</h1>
          <p className="mt-4 max-w-2xl text-[1.0625rem] text-muted">{s.intro}</p>
        </Container>
      </section>
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_420px]">
          <div className="space-y-10">
            <div>
              <h2 className="hl-h2">What is included</h2>
              <ul className="mt-4 space-y-2">
                {s.includes.map((i) => (
                  <li key={i} className="flex gap-3">
                    <Check className="mt-1 size-5 shrink-0 text-green" aria-hidden /> {i}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="hl-h2">How it works</h2>
              <ol className="mt-4 grid gap-3 sm:grid-cols-2">
                {s.steps.map((st, i) => (
                  <li key={st.title} className="rounded-lg border border-border bg-stone-50 p-4">
                    <span className="font-display text-h3 font-extrabold text-green">{i + 1}</span>
                    <p className="mt-1 font-semibold">{st.title}</p>
                    <p className="text-small text-muted">{st.text}</p>
                  </li>
                ))}
              </ol>
            </div>
            {rentReady.length > 0 && (
              <div>
                <h2 className="hl-h2">Rent-ready checklist</h2>
                <ul className="mt-4 space-y-2">
                  {rentReady.map((i) => (
                    <li key={i} className="flex gap-3">
                      <Check className="mt-1 size-5 shrink-0 text-green" aria-hidden /> {i}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <h2 className="hl-h3">Fees</h2>
              {business.agencyFeeSchedule ? <p className="mt-2 whitespace-pre-line text-muted">{business.agencyFeeSchedule}</p> : <p className="mt-2 text-muted">Our fees and what we will do are agreed with you in writing before we start.</p>}
              <LicenceNote kind="estate_agency" licence={business.licences.estate_agency} className="mt-3" />
            </div>
            {(s.slug === 'sell' || s.slug === 'let' || s.slug === 'landlords') && (
              <ButtonLink href="/agency/valuation" variant="secondary">
                Book a market appraisal first
              </ButtonLink>
            )}
            {s.slug === 'landlords' && (
              <ButtonLink href="/diaspora/property-care" variant="secondary" className="ml-0 sm:ml-3">
                About HagerLand Property Care
              </ButtonLink>
            )}
          </div>
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <h2 className="hl-h3 mb-4">Talk to us</h2>
            <EnquiryForm askCallTimes target={{ type: 'general', recipientLabel: 'HagerLand' }} intents={[{ value: 'more_info', label: s.title, message: s.message }]} topic={s.topic} idPrefix={`ag-${s.slug}`} submitLabel="Send" />
          </div>
        </div>
      </Section>
    </>
  )
}
