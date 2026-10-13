import type { PublicProperty } from '@/lib/data/properties'
import { Tabs } from '@/components/ui/Tabs'
import { PropertyCard } from '@/components/property/PropertyCard'
import { ButtonLink } from '@/components/ui/Button'

function Grid({ items, href, label }: { items: PublicProperty[]; href: string; label: string }) {
  if (items.length === 0) return <p className="text-muted">No properties {label} yet.</p>
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

/** Featured listings first (labelled on the card), then the newest (spec 14.5). */
export function LatestProperties({ sale, rent }: { sale: PublicProperty[]; rent: PublicProperty[] }) {
  return (
    <Tabs
      items={[
        { id: 'sale', label: 'For sale', content: <Grid items={sale} href="/property/for-sale" label="for sale" /> },
        { id: 'rent', label: 'To rent', content: <Grid items={rent} href="/property/to-rent" label="to rent" /> },
      ]}
    />
  )
}
