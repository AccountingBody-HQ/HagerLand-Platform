import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { RequestGroup } from '@/lib/data/service-requests'
import { DynamicIcon } from '@/components/ui/DynamicIcon'

/** Requestable services grouped by type, each with "Get quotes" and, optionally, a directory link. */
export function ServiceGroups({ groups, directory }: { groups: RequestGroup[]; directory?: boolean }) {
  return (
    <div className="space-y-10">
      {groups.map((g) => (
        <section key={g.slug} aria-labelledby={`sg-${g.slug}`}>
          <h3 id={`sg-${g.slug}`} className="hl-h3">
            {g.name}
          </h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.categories.map((c) => (
              <li key={c.id} className="flex flex-col rounded-lg border border-border bg-white p-4">
                <span className="flex items-center gap-3 font-semibold text-ink">
                  <DynamicIcon name={c.icon} className="size-5 shrink-0 text-green" />
                  {c.name}
                </span>
                <span className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-3 text-small">
                  <Link href={`/request-service/${c.slug}`} className="inline-flex min-h-11 items-center gap-1 font-semibold text-green" aria-label={`Get quotes: ${c.name}`}>
                    Get quotes <ArrowRight className="size-4" aria-hidden />
                  </Link>
                  {directory && (
                    <Link href={`/professionals/${c.slug}`} className="inline-flex min-h-11 items-center font-semibold text-ink underline-offset-4 hover:underline" aria-label={`Browse ${c.name}`}>
                      Browse businesses
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
