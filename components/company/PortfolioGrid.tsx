import { Building2 } from 'lucide-react'
import type { PortfolioItem } from '@/lib/data/organisations'
import { MediaImage } from '@/components/media/MediaImage'

export function PortfolioGrid({ items }: { items: PortfolioItem[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {items.map((p) => (
        <li key={p.id} className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="relative aspect-[4/3] bg-stone-100">
            {p.cover_path ? (
              <MediaImage path={p.cover_path} alt={`${p.title}: project photo`} fill sizes="(min-width: 1024px) 360px, 92vw" className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-stone-500">
                <Building2 className="size-8" aria-hidden />
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-semibold">{p.title}</h3>
            <p className="text-small text-muted">{[p.location_display, p.year].filter(Boolean).join(' · ')}</p>
            {p.description && <p className="mt-2 line-clamp-3 text-small text-ink">{p.description}</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}
