import Link from 'next/link'
import { BadgeCheck, ClipboardCheck, Clock, Scale } from 'lucide-react'
import { brand } from '@/lib/brand'
import { cn } from '@/lib/cn'
import { buildMetadata } from '@/lib/seo'
import { Section, SectionHeader } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { PageHero } from '@/components/content/PageHero'
import { getSiteNav } from '@/lib/data/site-nav'
import { SoonBadge } from '@/components/verticals/SoonBadge'

export const metadata = buildMetadata({
  title: 'About HagerLand',
  description: 'HagerLand helps people buy, rent, build and manage property in Ethiopia, with our own team and professionals across Ethiopia, for Ethiopians at home and abroad.',
  path: '/about',
})

const STANDARDS = [
  { icon: ClipboardCheck, title: 'Every listing checked', text: 'Our team reviews every listing and profile before it is published.' },
  { icon: BadgeCheck, title: 'Verified means verified', text: 'The Verified badge appears only after we have checked a business’s documents.' },
  { icon: Clock, title: 'Always up to date', text: 'Listings expire unless their owner renews them, so old listings do not stay up.' },
  { icon: Scale, title: 'Our own projects, clearly labelled', text: 'HagerLand’s own developments and supplies are always labelled and never given hidden priority in search.' },
]

export default async function AboutPage() {
  // What we do: the services in the same customer groups as the homepage and the "All services" menu (spec 26.16).
  const { all } = await getSiteNav()
  return (
    <>
      <PageHero
        crumb="About"
        title="Building the land."
        intro={`${brand.masterLine} ${brand.audienceLine} Find land or a home, plan and build it, source the materials, look after it, and sell or rent it later, with people and listings you can trust.`}
      />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="hl-h2">Our name</h2>
            <p className="mt-4 text-[1.0625rem]">
              <span className="font-ethiopic">Hager (ሀገር)</span> means homeland in Amharic. Land means the same in English. Together they say what we do: we help people buy, build and live on the land they call home.
            </p>
            <p className="mt-4 text-muted">Our mark is a simple house: the home at the centre of everything we do.</p>
          </div>
          <div>
            <h2 className="hl-h2">What we do</h2>
            <p className="mt-4 text-muted">Ten services that work together, so a plot of land can become a finished, well-kept home. Some we provide ourselves, such as our estate agency, {brand.divisions.propertyCare} and {brand.divisions.supply}; for the rest we work with professionals and partners we check.</p>
            <div className="mt-8 divide-y divide-border">
              {all.groups.map((g) => (
                <div key={g.id} className="py-8 first:pt-0 last:pb-0 sm:py-9">
                  <h3 className="hl-eyebrow text-green">{g.title}</h3>
                  <ul className={cn('mt-3 grid gap-4', g.tiles.length === 3 ? 'md:grid-cols-3' : g.tiles.length === 2 ? 'sm:grid-cols-2' : '')}>
                    {g.tiles.map((tile) => (
                      <li key={tile.key}>
                        <Link href={tile.href} className="font-display text-body font-bold text-ink hover:underline">
                          {tile.name}
                        </Link>
                        {tile.soon && <SoonBadge className="ml-2 align-middle" />}
                        <p className="mt-1 text-muted">{tile.tagline}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>
      <Section tone="stone">
        <div className="max-w-3xl">
          <h2 className="hl-h2">Why it works together</h2>
          <p className="mt-4 text-[1.0625rem]">
            Because we supply construction materials ourselves, we understand building from the inside: prices, quality, timelines and the problems people face. That knowledge shapes everything we do, and each service leads naturally to the next, from a plot of land to a finished, insured and well-kept home.
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
