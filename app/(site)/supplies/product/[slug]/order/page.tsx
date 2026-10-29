import { notFound } from 'next/navigation'
import { getProductBySlug } from '@/lib/data/products'
import { buildMetadata } from '@/lib/seo'
import { unitLabel } from '@/lib/units'
import { readSupplySwitches } from '@/lib/supply/partner-switches'
import { orderableProduct } from '@/lib/supply/order-requests-data'
import { CUSTOMER_TEXT } from '@/lib/supply/order-requests'
import { Container } from '@/components/ui/Layout'
import { OrderRequestForm } from '@/components/supply/OrderRequestForm'

// The owner's switch is read on every request, so switching off closes the form at once (L6).
export const dynamic = 'force-dynamic'

async function orderable(slug: string) {
  if (!(await readSupplySwitches()).catalogueOrdering) return null
  const p = await getProductBySlug(slug)
  if (!p?.id || !p.seller_is_hagerland || !(await orderableProduct(p.id))) return null
  return p
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  const p = await orderable((await props.params).slug)
  if (!p) return {}
  return buildMetadata({ title: `${CUSTOMER_TEXT.button}: ${p.name}`, description: CUSTOMER_TEXT.note, path: `/supplies/product/${p.slug}/order`, noindex: true })
}

/** S6-2: ask to order a HagerLand Supply product. No payment now: HagerLand checks stock first (approved text). */
export default async function OrderRequestPage(props: { params: Promise<{ slug: string }> }) {
  const p = await orderable((await props.params).slug)
  if (!p?.id) notFound()
  const minOrder = Number(p.min_order_qty ?? 1)
  return (
    <Container className="max-w-2xl py-10 lg:py-16">
      <h1 className="hl-h1">{CUSTOMER_TEXT.button}</h1>
      <p className="mt-3 text-[1.0625rem] font-semibold text-ink">{p.name}</p>
      <p className="mt-2 text-muted">{CUSTOMER_TEXT.note}</p>
      <div className="mt-8 rounded-lg border border-border bg-white p-5 sm:p-8">
        <OrderRequestForm productId={p.id} unit={unitLabel(p.unit, 2)} minOrder={minOrder} />
      </div>
    </Container>
  )
}
