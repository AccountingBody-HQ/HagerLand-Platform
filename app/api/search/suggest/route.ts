import { NextResponse, type NextRequest } from 'next/server'
import { searchAll } from '@/lib/data/search'
import type { SuggestGroup, SuggestResponse } from '@/lib/suggest-types'
import { formatETB } from '@/lib/format'
import { productPrice } from '@/lib/product-price'
import { ORG_KIND_LABEL } from '@/lib/org-labels'
import { developmentHref } from '@/components/development/DevelopmentCard'

/** Typeahead for the header search overlay: GET /api/search/suggest?q= */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 80)
  const r = await searchAll(q, 4)
  const groups: SuggestGroup[] = [
    {
      id: 'locations',
      label: 'Locations',
      items: r.locations.slice(0, 3).map((l) => ({ label: l.name, meta: `Property in ${l.display_name}`, href: `/property/for-sale/${l.path}` })),
    },
    {
      id: 'properties',
      label: 'Properties',
      items: r.properties.items.map((p) => ({ label: p.title ?? '', meta: [p.price_etb ? formatETB(p.price_etb) : 'Price on request', p.location_display].filter(Boolean).join(' · '), href: `/property/${p.slug}` })),
    },
    {
      id: 'developments',
      label: 'Developments',
      items: r.developments.items.map((d) => ({ label: d.name ?? '', meta: d.location_display ?? undefined, href: developmentHref({ slug: d.slug, is_hagerland: d.is_hagerland }) })),
    },
    {
      id: 'products',
      label: 'Supplies',
      items: r.products.items.map((p) => ({ label: p.name ?? '', meta: productPrice(p), href: `/supplies/product/${p.slug}` })),
    },
    {
      id: 'companies',
      label: 'Companies',
      items: r.organisations.items.map((o) => ({ label: o.name ?? '', meta: [ORG_KIND_LABEL[o.kind ?? ''], o.location_display].filter(Boolean).join(' · '), href: `/company/${o.slug}` })),
    },
    {
      id: 'categories',
      label: 'Services and categories',
      items: [
        ...r.services.map((s) => ({ label: s.name, meta: 'Professionals', href: `/professionals/${s.slug}` })),
        ...r.product_categories.map((c) => ({ label: c.name, meta: 'Supplies', href: c.parent_slug ? `/supplies/${c.parent_slug}/${c.slug}` : `/supplies/${c.slug}` })),
      ].slice(0, 4),
    },
  ]
  const body: SuggestResponse = { q, groups }
  return NextResponse.json(body, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } })
}
