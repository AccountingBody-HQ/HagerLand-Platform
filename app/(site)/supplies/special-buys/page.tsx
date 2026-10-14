import { Tag } from 'lucide-react'
import { getSpecialBuys } from '@/lib/data/products'
import { buildMetadata } from '@/lib/seo'
import { brand } from '@/lib/brand'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { SpecialBuyCard } from '@/components/supplies/SpecialBuyCard'

export const revalidate = 120

export async function generateMetadata() {
  const items = await getSpecialBuys(1)
  return buildMetadata({
    title: 'Special Buys: surplus and clearance building supplies',
    description: `Limited surplus and clearance offers on building materials from ${brand.divisions.supply} and approved suppliers, while stocks last.`,
    path: '/supplies/special-buys',
    noindex: items.length === 0,
  })
}

/** Surplus and clearance offers (spec 25.2d). Offers disappear by themselves when they end or sell out. */
export default async function SpecialBuysPage() {
  const items = await getSpecialBuys()
  return (
    <Container className="py-6 lg:py-10">
      <Breadcrumbs items={[{ label: brand.divisions.supply, href: '/supplies' }, { label: 'Special Buys' }]} />
      <h1 className="hl-h1 mt-6">Special Buys</h1>
      <p className="mt-2 max-w-2xl text-muted">Surplus and clearance stock at reduced prices, for a limited time and while quantities last. Add items to your quote list to order.</p>
      {items.length > 0 ? (
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {items.map((s) => (
            <li key={s.id}>
              <SpecialBuyCard item={s} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed border-border-strong bg-white p-8 text-center">
          <Tag className="mx-auto size-8 text-gold" aria-hidden />
          <h2 className="hl-h3 mt-3">No Special Buys right now</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">Surplus and clearance offers appear here when we have them. Browse the full range in the meantime.</p>
          <ButtonLink href="/supplies" variant="secondary" className="mt-4">
            Browse building supplies
          </ButtonLink>
        </div>
      )}
    </Container>
  )
}
