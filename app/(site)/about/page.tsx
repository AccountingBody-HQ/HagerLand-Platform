import { BadgeCheck, ClipboardCheck, Clock, Scale } from 'lucide-react'
import { brand } from '@/lib/brand'
import { buildMetadata } from '@/lib/seo'
import { Section, SectionHeader } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { PageHero } from '@/components/content/PageHero'
import { SoonBadge } from '@/components/verticals/SoonBadge'
import { getVerticals } from '@/lib/data/verticals'
import type { VerticalKey } from '@/lib/verticals'

export const metadata = buildMetadata({
  title: 'About HagerLand',
  description: "HagerLand is Ethiopia's construction and property platform: property, materials, professionals, contractors and repairs, for Ethiopians at home and abroad.",
  path: '/about',
})

/** What we do, one entry per vertical; the registry decides what shows and what is marked "coming soon" (spec 24.2, 24.11). */
const WHAT_WE_DO: { key: VerticalKey; title: string; text: string; soonText?: string }[] = [
  { key: 'property', title: 'Property marketplace', text: 'Homes, land and commercial property for sale and to rent across Ethiopia, developments and buildings, and our own estate agency services. Every listing is reviewed before it goes live, and listings expire unless their owner renews them.' },
  { key: 'building-supplies', title: brand.divisions.supply, text: 'Construction materials from our own supply business and approved suppliers. Send a materials list or build a quote, and get one clear price with delivery.' },
  { key: 'professionals', title: 'Professionals', text: 'Architects, engineers, surveyors and other specialists with real portfolios. Businesses earn the Verified badge only after we check their documents.' },
  { key: 'contractors', title: 'Contractors and trades', text: 'Describe your project once and we match it to up to three suitable contractors, who quote you directly.' },
  { key: 'repairs-maintenance', title: 'Repairs and maintenance', text: 'Plumbing, electrical, roofing, cleaning and emergency repairs, through the same request service.' },
  { key: 'diaspora', title: 'For Ethiopians abroad', text: `Buy, build and look after property in Ethiopia from wherever you live, including ${brand.divisions.propertyCare}, and find Ethiopian-run services near you.` },
  { key: 'finance', title: 'Finance', text: 'Requests for mortgages and construction finance go to approved, licensed partners. HagerLand does not give financial advice.', soonText: 'Finance through approved, licensed partners is coming soon.' },
  { key: 'insurance', title: 'Insurance', text: 'Requests for home, building and construction insurance go to approved, licensed partners. HagerLand does not give insurance advice.', soonText: 'Insurance through approved, licensed partners is coming soon.' },
  { key: 'jobs', title: 'Jobs and recruitment', text: 'A job board and recruitment help for construction, engineering and property.', soonText: 'A job board and recruitment help for construction, engineering and property are coming soon.' },
  { key: 'our-developments', title: brand.divisions.developments, text: 'Homes we build ourselves, with materials we source ourselves. Our own projects are always clearly labelled.', soonText: 'HagerLand intends to develop carefully selected projects. We are not building or selling any yet.' },
]

const STANDARDS = [
  { icon: ClipboardCheck, title: 'Every listing reviewed', text: 'Our team checks every listing and profile before it is published.' },
  { icon: BadgeCheck, title: 'Verified means checked', text: 'The Verified badge appears only after we have checked a business’s documents.' },
  { icon: Clock, title: 'Stale listings removed', text: 'Property listings expire unless they are renewed, so what you see is current.' },
  { icon: Scale, title: 'Our own projects, clearly labelled', text: 'HagerLand’s own developments and supplies are always labelled and never given hidden priority in search.' },
]

export default async function AboutPage() {
  const verticals = await getVerticals()
  const items = WHAT_WE_DO.flatMap((w) => {
    const v = verticals.find((x) => x.key === w.key)
    return v ? [{ ...w, soon: v.status === 'coming_soon' }] : []
  })
  return (
    <>
      <PageHero
        crumb="About"
        title="Building the land."
        intro={`${brand.masterLine} ${brand.audienceLine} Find land or a home, plan and finance it, source the materials, hire the people to build and maintain it, and sell or rent it later, with listings that are reviewed, current and honest.`}
      />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="hl-h2">Our name</h2>
            <p className="mt-4 text-[1.0625rem]">
              <span className="font-ethiopic">Hager (ሀገር)</span> means homeland in Amharic. Land means the same in English. Together they say what we do: we help people buy, build and live on the land they call home.
            </p>
            <p className="mt-4 text-muted">Our mark is three connected points: Supply, Build and Property.</p>
          </div>
          <div>
            <h2 className="hl-h2">What we do</h2>
            <dl className="mt-6 grid gap-6 sm:grid-cols-2">
              {items.map((w) => (
                <div key={w.key}>
                  <dt className="flex flex-wrap items-center gap-2 font-display text-h3 font-bold">
                    {w.title}
                    {w.soon && <SoonBadge long />}
                  </dt>
                  <dd className="mt-2 text-muted">{w.soon && w.soonText ? w.soonText : w.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Section>
      <Section tone="stone">
        <div className="max-w-3xl">
          <h2 className="hl-h2">Why it works together</h2>
          <p className="mt-4 text-[1.0625rem]">
            Because we supply construction materials ourselves, we understand building from the inside: prices, quality, timelines and the problems people face. That knowledge shapes every part of the platform, and each service leads to the next, from a plot of land to a finished, insured and well-kept home.
          </p>
        </div>
      </Section>
      <Section>
        <SectionHeader title="Our standards" />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STANDARDS.map((s) => (
            <li key={s.title}>
              <s.icon className="size-7 text-green" aria-hidden />
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-small text-muted">{s.text}</p>
            </li>
          ))}
        </ul>
      </Section>
      <Section tone="ink" compact>
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <h2 className="hl-h2 text-white">Start building with {brand.name}</h2>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row [&>*]:sm:min-w-52">
            <ButtonLink href="/property" variant="inverse">
              Explore property
            </ButtonLink>
            <ButtonLink href="/supplies/materials-list" variant="outline-inverse">
              Send a materials list
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  )
}
