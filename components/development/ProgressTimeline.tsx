import type { DevelopmentUpdate } from '@/lib/data/developments'
import { formatDate } from '@/lib/format'
import { MediaImage } from '@/components/media/MediaImage'

/** Dated construction-progress posts on a development page (spec 25.2j, 9.3). */
export function ProgressTimeline({ updates, name }: { updates: DevelopmentUpdate[]; name: string }) {
  if (updates.length === 0) return null
  return (
    <section aria-labelledby="progress-heading">
      <h2 id="progress-heading" className="hl-h3 mb-4">
        Construction progress
      </h2>
      <ol className="relative space-y-8 border-l-2 border-green/30 pl-6">
        {updates.map((u) => (
          <li key={u.id} className="relative">
            <span className="absolute -left-[33px] top-1.5 size-4 rounded-full border-2 border-white bg-green" aria-hidden />
            <p className="text-small font-semibold text-green">
              <time dateTime={u.happened_on}>{formatDate(u.happened_on)}</time>
            </p>
            <h3 className="mt-1 font-semibold text-ink">{u.title}</h3>
            <p className="mt-2 whitespace-pre-line text-muted">{u.body}</p>
            {u.photo_paths.length > 0 && (
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {u.photo_paths.map((p, i) => (
                  <li key={p} className="relative aspect-[4/3] overflow-hidden rounded-md">
                    <MediaImage path={p} alt={`${name}: ${u.title}, photo ${i + 1}`} fill sizes="(min-width: 640px) 220px, 45vw" className="object-cover" />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
