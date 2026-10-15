import type { PublicProperty } from '@/lib/data/properties'
import { Tabs } from '@/components/ui/Tabs'
import { PropertyCard } from '@/components/property/PropertyCard'
import { ButtonLink } from '@/components/ui/Button'

function Grid({ items, href, label }: { items: PublicProperty[]; href: string; label: string }) {
  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p) => (
          <li key={p.id}>
            <PropertyCard property={p} />
          </li>
        ))}
      </ul>
      <div className="mt-8 text-center">
        <ButtonLink href={href} variant="secondary">
          View all properties {label}
        </ButtonLink>
      </div>
    </>
  )
}

/** Featured listings first (labelled on the card), then the newest (spec 14.5). Only kinds that have listings get a tab. */
export function LatestProperties({ sale, rent }: { sale: PublicProperty[]; rent: PublicProperty[] }) {
  const items = [
    { id: 'sale', label: 'For sale', content: <Grid items={sale} href="/property/for-sale" label="for sale" />, count: sale.length },
    { id: 'rent', label: 'To rent', content: <Grid items={rent} href="/property/to-rent" label="to rent" />, count: rent.length },
  ].filter((x) => x.count > 0)
  if (items.length <= 1) return items[0]?.content ?? null
  return <Tabs items={items.map(({ id, label, content }) => ({ id, label, content }))} />
}
