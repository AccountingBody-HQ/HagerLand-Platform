import Link from 'next/link'
import { BadgeCheck, ClipboardCheck, Clock, Scale } from 'lucide-react'
import { brand } from '@/lib/brand'
import { buildMetadata } from '@/lib/seo'
import { Section, SectionHeader } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { PageHero } from '@/components/content/PageHero'
import { getPillars } from '@/lib/data/pillars'
import { pillarHref } from '@/lib/pillars'
import { ModeBadges } from '@/components/pillars/PillarHub'

export const metadata = buildMetadata({
  title: 'About HagerLand',
  description: "HagerLand is Ethiopia's construction and property platform: property, materials, professionals, contractors and repairs, for Ethiopians at home and abroad.",
  path: '/about',
})

const STANDARDS = [
  { icon: ClipboardCheck, title: 'Every listing reviewed', text: 'Our team checks every listing and profile before it is published.' },
  { icon: BadgeCheck, title: 'Verified means checked', text: 'The Verified badge appears only after we have checked a business’s documents.' },
  { icon: Clock, title: 'Stale listings removed', text: 'Property listings expire unless they are renewed, so what you see is current.' },
  { icon: Scale, title: 'Our own projects, clearly labelled', text: 'HagerLand’s own developments and supplies are always labelled and never given hidden priority in search.' },
]

export default async function AboutPage() {
  // What we do: the ten pillars around the property lifecycle, each with how it is provided today (spec 26.16).
  const pillars = await getPillars()
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
            <p className="mt-4 text-muted">Ten services around the property lifecycle, with help for Ethiopians abroad and a network of trusted professionals running through all of them. Each one says how it is provided: by {brand.name} itself, by trusted partners we check, or, while we prepare it, by registering your interest.</p>
            <dl className="mt-6 grid gap-6 sm:grid-cols-2">
              {pillars.map((p) => (
                <div key={p.key}>
                  <dt className="font-display text-h3 font-bold">
                    <Link href={pillarHref(p)} className="hover:underline">
                      {p.name}
                    </Link>
                  </dt>
                  <dd className="mt-2 text-muted">{p.description}</dd>
                  <dd className="mt-2">
                    <ModeBadges pillar={p} />
                  </dd>
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
