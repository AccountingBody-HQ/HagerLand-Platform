import Link from 'next/link'
import { Package } from 'lucide-react'
import type { PublicProduct } from '@/lib/data/products'
import { STOCK_LABEL } from '@/lib/units'
import { productPrice } from '@/lib/product-price'
import { MediaImage } from '@/components/media/MediaImage'
import { Badge } from '@/components/ui/Badge'
import { AddToQuote } from './AddToQuote'
import { brand } from '@/lib/brand'
import { ApproxPrice } from '@/components/currency/ApproxPrice'


export function ProductCard({ product: p }: { product: PublicProduct }) {
  const stock = STOCK_LABEL[p.stock_status ?? 'available_on_request']
  const firstSpec = Array.isArray(p.specs) ? (p.specs[0] as { label?: string; value?: string } | undefined) : undefined
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="relative aspect-square bg-white">
        {p.image_path ? (
          <MediaImage path={p.image_path} alt={`${p.name}`} fill sizes="(min-width: 1024px) 240px, 45vw" className="bg-white object-contain p-3" />
        ) : (
          <div className="flex h-full items-center justify-center bg-stone-50 text-stone-500">
            <Package className="size-10" aria-hidden />
          </div>
        )}
        {p.is_featured && <Badge tone="ink" className="absolute left-2 top-2">Featured</Badge>}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {p.brand_name && <p className="text-caption font-semibold uppercase tracking-wide text-muted">{p.brand_name}</p>}
        <h3 className="line-clamp-2 font-sans text-body font-semibold text-ink">
          <Link href={`/supplies/product/${p.slug}`} className="after:absolute after:inset-0">
            {p.name}
          </Link>
        </h3>
        {firstSpec?.label && <p className="text-small text-muted">{firstSpec.label}: {firstSpec.value}</p>}
        <p className="font-display font-bold tabular-nums text-ink">{productPrice(p)}</p>
        {p.price_type !== 'on_request' && p.price_etb_cents !== null && <ApproxPrice etb={p.price_etb_cents / 100} className="block" />}
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={stock.tone}>{stock.label}</Badge>
          {p.seller_is_hagerland && <Badge tone="gold">{brand.divisions.supply}</Badge>}
        </div>
        <div className="relative z-10 mt-auto pt-3">
          <AddToQuote size="sm" product={{ id: p.id ?? '', slug: p.slug ?? '', name: p.name ?? '', unit: p.unit ?? 'piece', imagePath: p.image_path, minOrder: Number(p.min_order_qty ?? 1) }} />
        </div>
      </div>
    </article>
  )
}
