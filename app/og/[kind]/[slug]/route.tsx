import { NextResponse } from 'next/server'
import { getPropertyByShortId } from '@/lib/data/properties'
import { getDevelopmentBySlug } from '@/lib/data/developments'
import { getOrganisationBySlug } from '@/lib/data/organisations'
import { getProductBySlug } from '@/lib/data/products'
import { shortIdFromSlug } from '@/lib/slug'
import { publicMediaUrl, thumbPath } from '@/lib/media'
import { formatETB } from '@/lib/format'
import { productPrice } from '@/lib/product-price'
import { propertyHeadline } from '@/lib/labels'
import { ORG_KIND_LABEL } from '@/lib/org-labels'
import { DEVELOPMENT_KIND_LABEL } from '@/lib/development-labels'
import { renderOg } from '@/lib/og'

export const revalidate = 3600

const photo = (path: string | null | undefined) => (path ? publicMediaUrl(thumbPath(path)) : null)

/** Share images for detail pages: /og/property|development|company|product/<slug>. Only published records. */
export async function GET(_req: Request, { params }: { params: { kind: string; slug: string } }) {
  switch (params.kind) {
    case 'property': {
      const sid = shortIdFromSlug(params.slug)
      const p = sid ? await getPropertyByShortId(sid) : null
      if (!p) break
      return renderOg({
        eyebrow: p.purpose === 'rent' ? 'To rent' : 'For sale',
        title: `${propertyHeadline(p.property_type ?? '', p.bedrooms)} in ${p.location_name ?? 'Ethiopia'}`,
        subtitle: p.location_display,
        highlight: p.price_on_request || !p.price_etb ? 'Price on request' : `${formatETB(p.price_etb)}${p.purpose === 'rent' ? ' / month' : ''}`,
        photo: photo(p.cover_path),
      })
    }
    case 'development': {
      const d = await getDevelopmentBySlug(params.slug)
      if (!d) break
      return renderOg({
        eyebrow: d.is_hagerland ? 'HagerLand Developments' : DEVELOPMENT_KIND_LABEL[d.kind ?? ''] ?? 'Development',
        title: d.name ?? '',
        subtitle: [d.developer_name, d.location_display].filter(Boolean).join(' · '),
        highlight: d.price_from_etb ? `From ${formatETB(d.price_from_etb)}` : null,
        photo: photo(d.cover_path),
        gold: Boolean(d.is_hagerland),
      })
    }
    case 'company': {
      const o = await getOrganisationBySlug(params.slug)
      if (!o) break
      return renderOg({ eyebrow: ORG_KIND_LABEL[o.kind ?? ''] ?? 'Business', title: o.name ?? '', subtitle: o.location_display, highlight: o.verification_level === 'verified' ? 'Verified by HagerLand' : null, photo: photo(o.cover_path) })
    }
    case 'product': {
      const p = await getProductBySlug(params.slug)
      if (!p) break
      return renderOg({ eyebrow: p.seller_is_hagerland ? 'HagerLand Supply' : p.seller_name ?? 'Supplies', title: p.name ?? '', subtitle: p.brand_name, highlight: productPrice({ price_type: p.price_type, price_etb_cents: p.price_etb_cents, unit: p.unit }), photo: photo(p.image_path) })
    }
  }
  return new NextResponse('Not found', { status: 404 })
}
