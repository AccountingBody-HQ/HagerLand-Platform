import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { getServiceCategories } from '@/lib/data/reference'
import { searchOrganisations } from '@/lib/data/organisations'
import { CompanyCard } from './CompanyCard'

/** "Professionals for this property/area" cross-link module (spec 4.4). Renders nothing if none exist. */
export async function ProfessionalsModule({ title, serviceSlugs, locationId, locationLabel }: { title: string; serviceSlugs: string[]; locationId: string | null; locationLabel?: string }) {
  const tree = await getServiceCategories()
  const all = tree.flatMap((g) => [g, ...g.children])
  const services = serviceSlugs.map((s) => all.find((c) => c.slug === s)).filter((c): c is NonNullable<typeof c> => Boolean(c))
  if (!services.length) return null
  const results = await Promise.all(services.map((s) => searchOrganisations({ serviceId: s.id, locationId, pageSize: 3 })))
  const seen = new Set<string>()
  const orgs = results.flatMap((r) => r.items).filter((o) => (o.id && !seen.has(o.id) ? (seen.add(o.id), true) : false)).slice(0, 3)
  if (!orgs.length) return null
  return (
    <section aria-labelledby="pros-heading" className="border-t border-border pt-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2 id="pros-heading" className="hl-h3">
          {title}
          {locationLabel ? ` in ${locationLabel}` : ''}
        </h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {services.map((s) => (
            <Link key={s.slug} href={`/professionals/${s.slug}`} className="inline-flex min-h-9 items-center gap-1 text-small font-semibold text-green hover:underline">
              {s.name} <ArrowRight className="size-4" aria-hidden />
            </Link>
          ))}
        </div>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orgs.map((o) => (
          <li key={o.id}>
            <CompanyCard org={o} />
          </li>
        ))}
      </ul>
    </section>
  )
}
