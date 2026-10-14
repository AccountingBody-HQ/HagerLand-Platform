import Link from 'next/link'
import { Package } from 'lucide-react'
import type { SpecialBuy } from '@/lib/data/products'
import { formatDate, formatETBCents } from '@/lib/format'
import { brand } from '@/lib/brand'
import { MediaImage } from '@/components/media/MediaImage'
import { Badge } from '@/components/ui/Badge'

/** A surplus or clearance offer: was-price, current price, quantity left and end date (spec 25.2d). */
export function SpecialBuyCard({ item: s }: { item: SpecialBuy }) {
  const price = s.price_etb_cents === null ? null : formatETBCents(s.price_etb_cents)
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-lg border border-gold/40 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-square bg-white">
        {s.image_path ? (
          <MediaImage path={s.image_path} alt={s.name ?? ''} fill sizes="(min-width: 1024px) 240px, 45vw" className="bg-white object-contain p-3" />
        ) : (
          <div className="flex h-full items-center justify-center bg-stone-50 text-stone-500">
            <Package className="size-10" aria-hidden />
          </div>
        )}
        <Badge tone="gold" className="absolute left-2 top-2">
          Special Buy
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-caption font-semibold uppercase tracking-wide text-muted">{s.category_name}</p>
        <h3 className="line-clamp-2 font-sans text-body font-semibold text-ink">
          <Link href={`/supplies/product/${s.slug}`} className="after:absolute after:inset-0">
            {s.name}
          </Link>
        </h3>
        <p className="flex flex-wrap items-baseline gap-2">
          {price && <span className="font-display font-bold tabular-nums text-ink">{price}</span>}
          {s.special_was_price_etb_cents !== null && (
            <span className="text-small text-muted">
              was <s>{formatETBCents(s.special_was_price_etb_cents)}</s>
            </span>
          )}
        </p>
        <ul className="mt-auto space-y-0.5 pt-1 text-small text-muted">
          {s.special_qty_available !== null && <li>{s.special_qty_available} {s.unit ?? 'units'} left</li>}
          {s.special_ends_at && <li>Ends {formatDate(s.special_ends_at)}</li>}
          <li>{s.seller_is_hagerland ? brand.divisions.supply : s.seller_name}</li>
        </ul>
      </div>
    </article>
  )
}
