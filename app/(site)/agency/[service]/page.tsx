import { notFound } from 'next/navigation'
import { Check } from 'lucide-react'
import { buildMetadata } from '@/lib/seo'
import { AGENCY_SERVICES } from '@/lib/content/agency'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container, Section } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { EnquiryForm } from '@/components/enquiry/EnquiryForm'

export const revalidate = 3600

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
              <p className="mt-4 text-small text-muted">Our fees and what we will do are always agreed with you in writing before we start.</p>
            </div>
            {(s.slug === 'sell' || s.slug === 'let') && (
              <ButtonLink href="/request-service/property-valuers" variant="secondary">
                Request a valuation first
              </ButtonLink>
            )}
          </div>
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <h2 className="hl-h3 mb-4">Talk to us</h2>
            <EnquiryForm target={{ type: 'general', recipientLabel: 'HagerLand' }} intents={[{ value: 'more_info', label: s.title, message: s.message }]} topic={s.topic} idPrefix={`ag-${s.slug}`} submitLabel="Send" />
          </div>
        </div>
      </Section>
    </>
  )
}
