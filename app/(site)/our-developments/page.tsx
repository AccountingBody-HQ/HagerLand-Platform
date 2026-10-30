import { ArrowRight, Hammer, LandPlot, PencilRuler, Truck } from 'lucide-react'
import { searchDevelopments } from '@/lib/data/developments'
import { getBusinessDetails } from '@/lib/data/business'
import { buildMetadata, faqJsonLd } from '@/lib/seo'
import { brand } from '@/lib/brand'
import { DEVELOPMENTS_FAQ } from '@/lib/content/developments-faq'
import { Container, Section, SectionHeader } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { Accordion } from '@/components/ui/Accordion'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { DevelopmentCard } from '@/components/development/DevelopmentCard'
import { RegisterInterest } from '@/components/development/RegisterInterest'
import { JsonLd } from '@/components/seo/JsonLd'
import { verticalLandingMetadata } from '@/components/verticals/ComingSoonPage'

export const revalidate = 300

export function generateMetadata() {
  return verticalLandingMetadata('our-developments', () =>
    buildMetadata({
      title: `${brand.divisions.developments}: homes we build ourselves`,
      description: 'Homes built by HagerLand, with materials sourced through HagerLand Supply and every build managed directly. See our projects and register your interest.',
      path: '/our-developments',
    }),
  )
}

const STEPS = [
  { icon: LandPlot, title: 'Land', text: 'We will secure land with clear title and lease documents before we plan anything.' },
  { icon: PencilRuler, title: 'Design', text: 'Architects and engineers design homes for how families in Ethiopia live.' },
  { icon: Truck, title: 'Materials', text: `${brand.divisions.supply} sources the materials, so we control quality and cost.` },
  { icon: Hammer, title: 'Build & handover', text: 'We will manage the build directly and hand over with the documents in order.' },
]

/** Current, coming-soon and completed projects (Vision §11). */
const GROUPS: { title: string; match: (c: string | null) => boolean }[] = [
  { title: 'Current projects', match: (c) => c === 'under_construction' || c === null },
  { title: 'Upcoming projects', match: (c) => c === 'off_plan' },
  { title: 'Completed', match: (c) => c === 'ready' },
]

export default async function OurDevelopmentsPage() {
  const [{ items }, business] = await Promise.all([searchDevelopments({ isHagerland: true, pageSize: 48 }), getBusinessDetails()])
  const claims = business.developmentsClaims
  return (
    <>
      <section className="hl-blueprint relative bg-ink text-white">
        <Container className="py-14 sm:py-20">
          <Breadcrumbs inverse items={[{ label: brand.divisions.developments }]} />
          <p className="hl-eyebrow mt-8 text-gold">{brand.divisions.developments}</p>
          <h1 className="hl-display mt-3 max-w-3xl text-white">Homes we build ourselves.</h1>
          <p className="mt-5 max-w-2xl text-[1.0625rem] text-white/80">
            We source our own materials through {brand.divisions.supply} and manage every build directly — so we can build well, and price fairly.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row [&>*]:sm:min-w-56">
            <ButtonLink href="#projects" variant="gold" size="lg">
              View our projects
            </ButtonLink>
            <ButtonLink href="#register" variant="outline-inverse" size="lg">
              Register your interest
            </ButtonLink>
          </div>
        </Container>
      </section>

      <Section id="projects">
        <SectionHeader title="Our projects" />
        {items.length > 0 ? (
          <div className="space-y-10">
            {GROUPS.map((g) => {
              const list = items.filter((d) => g.match(d.completion_status))
              if (list.length === 0) return null
              return (
                <div key={g.title}>
                  <h3 className="hl-h3 mb-4">{g.title}</h3>
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((d) => (
                      <li key={d.id}>
                        <DevelopmentCard development={d} />
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        ) : (
          <div id="register" className="grid scroll-mt-24 gap-8 rounded-xl border border-gold/30 bg-gold-soft/40 p-6 sm:p-10 lg:grid-cols-[1fr_440px]">
            <div>
              <h3 className="hl-h2">Our first project is in preparation.</h3>
              <p className="mt-3 max-w-lg text-muted">Register your interest to hear first about location, plans and prices.</p>
            </div>
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <RegisterInterest idPrefix="ri-empty" />
            </div>
          </div>
        )}
      </Section>

      <Section tone="stone">
        <SectionHeader eyebrow="How we build" title="From the land to the keys" description={`Because ${brand.divisions.supply} supplies our materials, one team is responsible from start to finish.`} />
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-lg border border-border bg-white p-6">
              <div className="flex items-center justify-between">
                <s.icon className="size-7 text-gold" aria-hidden />
                <span className="font-display text-h2 font-extrabold text-stone-300">{i + 1}</span>
              </div>
              <h3 className="hl-h3 mt-4">{s.title}</h3>
              <p className="mt-2 text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      {claims.length > 0 && (
        <Section>
          <SectionHeader title={`Why buy from ${brand.name}`} />
          <ul className="grid gap-4 sm:grid-cols-2">
            {claims.map((c) => (
              <li key={c.title} className="rounded-lg border border-border p-6">
                <h3 className="hl-h3">{c.title}</h3>
                <p className="mt-2 text-muted">{c.text}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section tone={claims.length > 0 ? 'stone' : 'white'}>
        <SectionHeader title="Questions buyers ask" />
        <div className="max-w-3xl">
          <Accordion items={DEVELOPMENTS_FAQ.map((f, i) => ({ id: `faq-${i}`, title: f.question, content: f.answer }))} />
        </div>
      </Section>

      {items.length > 0 && (
        <section id="register" className="bg-ink text-white">
          <Container className="grid gap-10 py-14 sm:py-20 lg:grid-cols-[1fr_440px]">
            <div>
              <h2 className="hl-h2 text-white">Register your interest</h2>
              <p className="mt-3 max-w-lg text-white/75">Tell us what you&apos;re looking for. Our sales team will contact you with plans, prices and next steps.</p>
              <ButtonLink href="/developments" variant="outline-inverse" className="mt-6">
                See all developments <ArrowRight />
              </ButtonLink>
            </div>
            <div className="rounded-lg bg-white p-5 text-ink shadow-lg">
              <RegisterInterest idPrefix="ri-band" />
            </div>
          </Container>
        </section>
      )}
      <JsonLd data={faqJsonLd(DEVELOPMENTS_FAQ)} />
    </>
  )
}
