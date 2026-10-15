import Link from 'next/link'
import { Building2, CalendarClock } from 'lucide-react'
import type { DevelopmentListItem } from '@/lib/data/developments'
import { COMPLETION_LABEL, DEVELOPMENT_KIND_LABEL } from '@/lib/development-labels'
import { formatDate, formatETB } from '@/lib/format'
import { MediaImage } from '@/components/media/MediaImage'
import { Badge } from '@/components/ui/Badge'
import { brand } from '@/lib/brand'
import { ApproxPrice } from '@/components/currency/ApproxPrice'

type Card = Pick<DevelopmentListItem, 'slug' | 'name' | 'kind' | 'is_hagerland' | 'cover_path' | 'location_display' | 'completion_status' | 'expected_completion' | 'price_from_etb' | 'developer_name' | 'floors_label' | 'total_units'>

export function developmentHref(d: Pick<Card, 'slug' | 'is_hagerland'>): string {
  return d.is_hagerland ? `/our-developments/${d.slug}` : `/developments/${d.slug}`
}

export function DevelopmentCard({ development: d }: { development: Card }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/9] bg-stone-100">
        {d.cover_path ? (
          <MediaImage path={d.cover_path} alt={`${d.name}: development photo`} fill sizes="(min-width: 1024px) 380px, 92vw" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-stone-500">
            <Building2 className="size-10" aria-hidden />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {d.is_hagerland && <Badge tone="gold">{brand.divisions.developments}</Badge>}
          {d.completion_status && <Badge tone="white">{COMPLETION_LABEL[d.completion_status]}</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-small text-muted">{DEVELOPMENT_KIND_LABEL[d.kind ?? ''] ?? 'Development'}{d.floors_label ? ` · ${d.floors_label}` : ''}{d.total_units ? ` · ${d.total_units} units` : ''}</p>
        <h3 className="font-sans text-body font-semibold text-ink">
          <Link href={developmentHref(d)} className="after:absolute after:inset-0">
            {d.name}
          </Link>
        </h3>
        <p className="text-small text-muted">{d.location_display}</p>
        {d.developer_name && !d.is_hagerland && <p className="text-small text-ink">By {d.developer_name}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <p className="font-display font-bold tabular-nums text-ink">{d.price_from_etb ? `From ${formatETB(d.price_from_etb)}` : 'Price on request'}</p>
          {d.price_from_etb ? <ApproxPrice etb={d.price_from_etb} className="block" /> : null}
          {d.expected_completion && d.completion_status !== 'ready' && (
            <span className="inline-flex items-center gap-1 text-caption text-muted">
              <CalendarClock className="size-3.5" aria-hidden /> {formatDate(d.expected_completion)}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
