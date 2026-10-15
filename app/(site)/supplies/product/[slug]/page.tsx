import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Truck } from 'lucide-react'
import { getProductBySlug, getSpecialBuyFor, parseSpecs, searchProducts } from '@/lib/data/products'
import { getEntityMedia } from '@/lib/data/properties'
import { getProductCategories } from '@/lib/data/reference'
import { buildMetadata, truncateDescription } from '@/lib/seo'
import { formatDate, formatETBCents } from '@/lib/format'
import { STOCK_LABEL, VOLATILE_CATEGORY_SLUGS, unitLabel } from '@/lib/units'
import { publicMediaUrl } from '@/lib/media'
import { canonicalUrl } from '@/lib/site'
import { brand } from '@/lib/brand'
import { productIntents } from '@/lib/intents'
import { Container } from '@/components/ui/Layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Badge } from '@/components/ui/Badge'
import { Gallery } from '@/components/media/Gallery'
import { ExpandableText } from '@/components/ui/ExpandableText'
import { AddToQuote } from '@/components/supplies/AddToQuote'
import { ProductCard } from '@/components/supplies/ProductCard'
import { productPrice } from '@/lib/product-price'
import { AskQuestion } from '@/components/supplies/AskQuestion'
import { ProfessionalsModule } from '@/components/company/ProfessionalsModule'
import { ViewTracker } from '@/components/analytics/ViewTracker'
import { JsonLd } from '@/components/seo/JsonLd'
import { ApproxPrice } from '@/components/currency/ApproxPrice'
import { TradePrice } from '@/components/supplies/TradePrice'
import { SaveButton } from '@/components/saved/SaveButton'

export const revalidate = 600

/** "Need it installed?" service suggestions by product category (spec 4.4). */
const INSTALLERS: Record<string, string[]> = {
  'tiles-flooring': ['tilers', 'flooring'],
  plumbing: ['plumbers'],
  bathroom: ['plumbers'],
  kitchen: ['carpenters', 'plumbers'],
  electrical: ['electricians'],
  'solar-power': ['solar-installers', 'electricians'],
  roofing: ['roofers'],
  'paint-decorating': ['painters'],
  'doors-windows': ['carpenters', 'aluminium-glass'],
  'building-materials': ['masons', 'general-contractors'],
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getProductBySlug(params.slug)
  if (!p) return { title: 'Product not found' }
  return buildMetadata({
    title: `${p.name}${p.brand_name ? ` — ${p.brand_name}` : ''} | ${brand.divisions.supply}`,
    absoluteTitle: true,
    description: truncateDescription(p.summary ?? p.description ?? `${p.name} from ${brand.divisions.supply}. Add to your quote list for a clear price with delivery.`),
    path: `/supplies/product/${p.slug}`,
    image: `/og/product/${p.slug}`,
  })
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const p = await getProductBySlug(params.slug)
  if (!p || !p.id) notFound()
  const [tree, special] = await Promise.all([getProductCategories(), getSpecialBuyFor(p.id)])
  const root = tree.find((c) => c.id === p.category_parent_id) ?? tree.find((c) => c.id === p.category_id) ?? null
  const [media, related] = await Promise.all([getEntityMedia('product', p.id), searchProducts({ categoryId: p.category_id ?? undefined, excludeId: p.id, pageSize: 4 })])
  const images = media.filter((m) => m.kind === 'image').map((m, i) => ({ path: m.storage_path ?? '', alt: m.alt ?? `${p.name}: photo ${i + 1}`, width: m.width, height: m.height }))
  const specs = parseSpecs(p.specs)
  const stock = STOCK_LABEL[p.stock_status ?? 'available_on_request']
  const volatile = VOLATILE_CATEGORY_SLUGS.includes(p.category_slug ?? '')
  const installers = INSTALLERS[root?.slug ?? ''] ?? []

  return (
    <Container className="py-6 lg:py-8">
      <Breadcrumbs
        items={[
          { label: 'Supplies', href: '/supplies' },
          ...(root && root.id !== p.category_id ? [{ label: root.name, href: `/supplies/${root.slug}` }] : []),
          { label: p.category_name ?? 'Category', href: root && root.id !== p.category_id ? `/supplies/${root.slug}/${p.category_slug}` : `/supplies/${p.category_slug}` },
          { label: p.name ?? '' },
        ]}
      />
      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div>
          <Gallery images={images} aspect="aspect-square" />
        </div>
        <div className="space-y-5">
          <div>
            {p.brand_name && <p className="hl-eyebrow text-muted">{p.brand_name}</p>}
            <h1 className="hl-h1 mt-1">{p.name}</h1>
            {(p.sku || p.model_number) && <p className="mt-1 text-small text-muted">{[p.sku && `SKU ${p.sku}`, p.model_number && `Model ${p.model_number}`].filter(Boolean).join(' · ')}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {p.seller_is_hagerland && <Badge tone="gold">Sold by {brand.divisions.supply}</Badge>}
            <Badge tone={stock.tone}>{stock.label}</Badge>
          </div>
          <div className="rounded-lg bg-stone-50 p-4">
            <p className="font-display text-h2 font-bold tabular-nums">{productPrice(p)}</p>
            {special && (
              <p className="mt-1 text-small">
                <span className="font-semibold text-gold">Special Buy</span>
                {special.special_was_price_etb_cents !== null && (
                  <>
                    {' '}
                    · was <s>{formatETBCents(special.special_was_price_etb_cents)}</s>
                  </>
                )}
                {special.special_qty_available !== null && ` · ${special.special_qty_available} left`}
                {special.special_ends_at && ` · ends ${formatDate(special.special_ends_at)}`}
              </p>
            )}
            {p.price_type !== 'on_request' && p.price_etb_cents !== null && <ApproxPrice etb={p.price_etb_cents / 100} className="block" />}
            <TradePrice productId={p.id} />
            {p.price_type !== 'on_request' && p.price_updated_at && <p className="mt-1 text-small text-muted">Price updated {formatDate(p.price_updated_at)}</p>}
            {volatile && <p className="mt-1 text-small text-warning-dark">Prices change often — we confirm today&apos;s price on your quote.</p>}
            <ul className="mt-3 space-y-1 text-small text-muted">
              {Number(p.min_order_qty) > 1 && <li>Minimum order: {Number(p.min_order_qty)} {unitLabel(p.unit, Number(p.min_order_qty))}</li>}
              {p.pack_size && <li>Pack size: {p.pack_size}</li>}
              {p.lead_time_days ? <li>Lead time: about {p.lead_time_days} day{p.lead_time_days === 1 ? '' : 's'}</li> : null}
            </ul>
          </div>
          {p.summary && <p className="text-[1.0625rem]">{p.summary}</p>}
          {specs.length > 0 && (
            <ul className="list-disc space-y-1 pl-5">
              {specs.slice(0, 4).map((s) => (
                <li key={s.label}>
                  {s.label}: {s.value}
                  {s.unit ? ` ${s.unit}` : ''}
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <AddToQuote withQuantity size="lg" product={{ id: p.id, slug: p.slug ?? '', name: p.name ?? '', unit: p.unit ?? 'piece', imagePath: p.image_path, minOrder: Number(p.min_order_qty ?? 1) }} />
            <SaveButton entityType="product" entityId={p.id ?? ''} className="w-full justify-center" />
            <AskQuestion productId={p.id} productName={p.name ?? ''} intents={productIntents(p.name ?? 'this product')} />
          </div>
          {p.delivery_available && (
            <p className="flex items-center gap-2 text-small text-muted">
              <Truck className="size-4 text-green" aria-hidden /> Delivery is arranged with your quote.
            </p>
          )}
        </div>
      </div>

      {(p.description || specs.length > 0) && (
        <div className="mt-14 grid gap-10 lg:grid-cols-2">
          {p.description && (
            <section aria-labelledby="pd-desc">
              <h2 id="pd-desc" className="hl-h3 mb-3">
                Description
              </h2>
              <ExpandableText text={p.description} />
            </section>
          )}
          {specs.length > 0 && (
            <section aria-labelledby="pd-specs">
              <h2 id="pd-specs" className="hl-h3 mb-3">
                Specifications
              </h2>
              <table className="w-full text-left text-small">
                <tbody className="divide-y divide-border">
                  {specs.map((s) => (
                    <tr key={s.label}>
                      <th scope="row" className="w-1/2 py-2.5 pr-4 font-normal text-muted">
                        {s.label}
                      </th>
                      <td className="py-2.5 font-semibold">
                        {s.value}
                        {s.unit ? ` ${s.unit}` : ''}
                      </td>
                    </tr>
                  ))}
                  {p.country_of_origin && (
                    <tr>
                      <th scope="row" className="py-2.5 pr-4 font-normal text-muted">Country of origin</th>
                      <td className="py-2.5 font-semibold">{p.country_of_origin}</td>
                    </tr>
                  )}
                  {p.warranty && (
                    <tr>
                      <th scope="row" className="py-2.5 pr-4 font-normal text-muted">Warranty</th>
                      <td className="py-2.5 font-semibold">{p.warranty}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          )}
        </div>
      )}

      {related.items.length > 0 && (
        <section aria-labelledby="related" className="mt-14 border-t border-border pt-10">
          <h2 id="related" className="hl-h3 mb-5">
            Related products
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {related.items.map((r) => (
              <li key={r.id}>
                <ProductCard product={r} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {installers.length > 0 && (
        <div className="mt-14">
          <ProfessionalsModule title="Need it installed?" serviceSlugs={installers} locationId={null} />
        </div>
      )}
      <ViewTracker entityType="product" id={p.id} label={p.category_slug ?? 'product'} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: p.name,
          url: canonicalUrl(`/supplies/product/${p.slug}`),
          ...(p.description ? { description: p.description.slice(0, 500) } : {}),
          ...(images.length ? { image: images.map((i) => publicMediaUrl(i.path)).filter(Boolean) } : {}),
          ...(p.sku ? { sku: p.sku } : {}),
          ...(p.brand_name ? { brand: { '@type': 'Brand', name: p.brand_name } } : {}),
          ...(p.price_type === 'fixed' && p.price_etb_cents !== null
            ? {
                offers: {
                  '@type': 'Offer',
                  price: (p.price_etb_cents / 100).toFixed(2),
                  priceCurrency: 'ETB',
                  availability: p.stock_status === 'out_of_stock' ? 'https://schema.org/OutOfStock' : p.stock_status === 'in_stock' || p.stock_status === 'low_stock' ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
                  seller: { '@type': 'Organization', name: p.seller_name },
                },
              }
            : {}),
        }}
      />
    </Container>
  )
}
