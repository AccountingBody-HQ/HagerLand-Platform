import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { buildMetadata } from '@/lib/seo'
import { getRequestGroups } from '@/lib/data/service-requests'
import { getVerticals } from '@/lib/data/verticals'
import { PageHero } from '@/components/content/PageHero'
import { Section } from '@/components/ui/Layout'
import { DynamicIcon } from '@/components/ui/DynamicIcon'
import { HowRequestsWork } from '@/components/service-requests/HowRequestsWork'

export const revalidate = 600

export const metadata = buildMetadata({
  title: 'Request a service',
  description: 'Tell us what you need, from repairs to building work and professional services, and get quotes from up to three suitable providers at a time on HagerLand.',
  path: '/request-service',
})

/** Choose a service to request (spec 24.5). Lists services of live verticals only. */
export default async function RequestServicePage() {
  const [groups, verticals] = await Promise.all([getRequestGroups(), getVerticals()])
  const names = new Map(verticals.map((v) => [v.key, v.name]))
  return (
    <>
      <PageHero crumb="Request a service" eyebrow="Get quotes" title="Request a service" intro="Describe what you need once. We send it to up to three suitable providers at a time, they contact you, and you compare their quotes. Free for customers." />
      <Section>
        <HowRequestsWork />
        <div className="mt-12 space-y-10">
          {groups.map((g) => (
            <section key={g.slug} aria-labelledby={`grp-${g.slug}`}>
              <p className="hl-eyebrow text-muted">{names.get(g.verticalKey)}</p>
              <h2 id={`grp-${g.slug}`} className="hl-h3 mt-1">
                {g.name}
              </h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {g.categories.map((c) => (
                  <li key={c.id}>
                    <Link href={`/request-service/${c.slug}`} className="group flex min-h-14 items-center gap-3 rounded-lg border border-border bg-white px-4 py-3 hover:border-green">
                      <DynamicIcon name={c.icon} className="size-5 shrink-0 text-green" />
                      <span className="flex-1 font-semibold text-ink">{c.name}</span>
                      <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Section>
    </>
  )
}
