import { BadgeCheck, ClipboardCheck, Clock, Scale } from 'lucide-react'
import { brand } from '@/lib/brand'
import { buildMetadata } from '@/lib/seo'
import { Section, SectionHeader } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { PageHero } from '@/components/content/PageHero'

export const metadata = buildMetadata({
  title: 'About HagerLand',
  description: "HagerLand brings Ethiopia's property and construction market together: homes and land, construction materials and trusted professionals, all reviewed and current.",
  path: '/about',
})

const WHAT_WE_DO = [
  { title: 'Property marketplace', text: 'Homes, land and commercial property for sale and to rent across Ethiopia, plus a growing database of developments and buildings. Every listing is reviewed before it goes live, and listings expire unless their owner renews them.' },
  { title: brand.divisions.supply, text: 'Our own construction materials business. Send us a materials list or build a quote from the catalogue, and we reply with one clear price and delivery details.' },
  { title: 'Professionals & services', text: 'Architects, engineers, contractors and tradespeople with real portfolios. Businesses earn the Verified badge only after we check their documents.' },
  { title: brand.divisions.developments, text: 'Homes we build ourselves, with materials we source ourselves. Our own projects are always clearly labelled.' },
]

const STANDARDS = [
  { icon: ClipboardCheck, title: 'Every listing reviewed', text: 'Our team checks every listing and profile before it is published.' },
  { icon: BadgeCheck, title: 'Verified means checked', text: 'The Verified badge appears only after we have checked a business’s documents.' },
  { icon: Clock, title: 'Stale listings removed', text: 'Property listings expire unless they are renewed, so what you see is current.' },
  { icon: Scale, title: 'Our own projects, clearly labelled', text: 'HagerLand’s own developments and supplies are always labelled and never given hidden priority in search.' },
]

export default function AboutPage() {
  return (
    <>
      <PageHero
        crumb="About"
        title="Building the land."
        intro="HagerLand brings Ethiopia's property and construction market together in one trusted place. Find a home or a plot, source the materials to build, and hire the people to build it — with listings that are reviewed, current and honest."
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
              {WHAT_WE_DO.map((w) => (
                <div key={w.title}>
                  <dt className="font-display text-h3 font-bold">{w.title}</dt>
                  <dd className="mt-2 text-muted">{w.text}</dd>
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
            Because we supply materials and build homes ourselves, we understand construction from the inside — prices, quality, timelines and the problems people face. That knowledge shapes every part of the platform.
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
