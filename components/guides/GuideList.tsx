import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import type { GuideListItem } from '@/lib/data/guides'
import { GUIDE_TOPICS } from '@/lib/guides'

/** Cards linking to guides. */
export function GuideList({ guides }: { guides: GuideListItem[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {guides.map((g) => (
        <li key={g.id}>
          <article className="relative h-full rounded-lg border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <p className="flex items-center gap-1.5 text-small font-semibold text-green">
              <BookOpen className="size-4" aria-hidden /> {GUIDE_TOPICS.find((t) => t.value === g.topic)?.label}
            </p>
            <h3 className="mt-2 font-sans text-[1.0625rem] font-semibold text-ink">
              <Link href={`/guides/${g.slug}`} className="after:absolute after:inset-0">
                {g.title}
              </Link>
            </h3>
            <p className="mt-2 line-clamp-3 text-small text-muted">{g.summary}</p>
          </article>
        </li>
      ))}
    </ul>
  )
}
