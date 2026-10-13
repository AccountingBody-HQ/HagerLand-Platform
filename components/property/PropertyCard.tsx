import Link from 'next/link'
import { Bath, BedDouble, Building2, Camera, Ruler } from 'lucide-react'
import type { PublicProperty } from '@/lib/data/properties'
import { formatArea } from '@/lib/format'
import { propertyHeadline } from '@/lib/labels'
import { MediaImage } from '@/components/media/MediaImage'
import { PropertyBadges } from './PropertyBadges'
import { PriceLine } from './PriceLine'
import { cn } from '@/lib/cn'

type CardProperty = Pick<
  PublicProperty,
  'slug' | 'title' | 'purpose' | 'property_type' | 'price_etb' | 'price_period' | 'price_on_request' | 'price_negotiable' | 'bedrooms' | 'bathrooms' | 'area_m2' | 'plot_area_m2' | 'location_display' | 'cover_path' | 'photo_count' | 'published_at' | 'is_featured' | 'is_hagerland' | 'lister_verification'
>

function Facts({ p }: { p: CardProperty }) {
  const area = p.area_m2 ?? p.plot_area_m2
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-small text-muted">
      {p.bedrooms !== null && p.bedrooms > 0 && (
        <li className="inline-flex items-center gap-1.5">
          <BedDouble className="size-4" aria-hidden /> {p.bedrooms} bed{p.bedrooms === 1 ? '' : 's'}
        </li>
      )}
      {p.bathrooms !== null && p.bathrooms > 0 && (
        <li className="inline-flex items-center gap-1.5">
          <Bath className="size-4" aria-hidden /> {p.bathrooms} bath{p.bathrooms === 1 ? '' : 's'}
        </li>
      )}
      {area && (
        <li className="inline-flex items-center gap-1.5">
          <Ruler className="size-4" aria-hidden /> {formatArea(area)}
        </li>
      )}
    </ul>
  )
}

function CardImage({ p, sizes, className }: { p: CardProperty; sizes: string; className?: string }) {
  return (
    <div className={cn('relative overflow-hidden bg-stone-100', className)}>
      {p.cover_path ? (
        <MediaImage path={p.cover_path} alt={`${propertyHeadline(p.property_type ?? '', p.bedrooms)} in ${p.location_display ?? 'Ethiopia'}: photo 1`} fill sizes={sizes} className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
      ) : (
        <div className="flex h-full items-center justify-center text-stone-500">
          <Building2 className="size-10" aria-hidden />
        </div>
      )}
      <PropertyBadges className="absolute left-3 top-3" onImage purpose={p.purpose} publishedAt={p.published_at} isFeatured={p.is_featured} isHagerland={p.is_hagerland} listerVerification={p.lister_verification} />
      {(p.photo_count ?? 0) > 1 && (
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-ink/75 px-2 py-0.5 text-caption font-semibold text-white">
          <Camera className="size-3.5" aria-hidden /> {p.photo_count}
        </span>
      )}
    </div>
  )
}

export function PropertyCard({ property: p }: { property: CardProperty }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm transition-shadow hover:shadow-md">
      <CardImage p={p} sizes="(min-width: 1280px) 300px, (min-width: 640px) 45vw, 92vw" className="aspect-[4/3]" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <PriceLine price={p.price_etb} period={p.price_period} onRequest={p.price_on_request} negotiable={p.price_negotiable} />
        <h3 className="line-clamp-2 font-sans text-body font-semibold text-ink">
          <Link href={`/property/${p.slug}`} className="after:absolute after:inset-0">
            {p.title}
          </Link>
        </h3>
        <p className="line-clamp-1 text-small text-muted">{p.location_display}</p>
        <div className="mt-auto pt-1">
          <Facts p={p} />
        </div>
      </div>
    </article>
  )
}

export function PropertyCardHorizontal({ property: p }: { property: CardProperty }) {
  return (
    <article className="group relative grid overflow-hidden rounded-lg border border-border bg-white shadow-sm transition-shadow hover:shadow-md sm:grid-cols-[minmax(0,320px)_1fr]">
      <CardImage p={p} sizes="(min-width: 640px) 320px, 92vw" className="aspect-[4/3] sm:aspect-auto sm:min-h-[220px]" />
      <div className="flex flex-col gap-2 p-5">
        <PriceLine price={p.price_etb} period={p.price_period} onRequest={p.price_on_request} negotiable={p.price_negotiable} />
        <h3 className="line-clamp-2 font-sans text-[1.0625rem] font-semibold text-ink">
          <Link href={`/property/${p.slug}`} className="after:absolute after:inset-0">
            {p.title}
          </Link>
        </h3>
        <p className="text-small text-muted">{p.location_display}</p>
        <Facts p={p} />
      </div>
    </article>
  )
}
