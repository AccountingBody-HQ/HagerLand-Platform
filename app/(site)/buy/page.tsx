import { requireVisiblePillar } from '@/lib/data/pillars'
import { searchProperties } from '@/lib/data/properties'
import { pillarMetadata } from '@/lib/pillar-page'
import { PillarHub } from '@/components/pillars/PillarHub'
import { PropertyCard } from '@/components/property/PropertyCard'
import { ButtonLink } from '@/components/ui/Button'
import { Section } from '@/components/ui/Layout'

export const revalidate = 300

export function generateMetadata() {
  return pillarMetadata('buy')
}

/** Buy & Sell hub (spec 26.2 pillar 1): agency services, the marketplace and the newest listings. */
export default async function Page() {
  const pillar = await requireVisiblePillar('buy')
  const latest = pillar.status === 'live' ? await searchProperties({ purpose: 'sale', filters: { sort: 'newest' }, pageSize: 4 }) : { items: [], total: 0 }
  return (
    <PillarHub pillar={pillar}>
      {latest.items.length > 0 && (
        <Section labelledBy="latest-sale">
          <h2 id="latest-sale" className="hl-h2">
            Newest for sale
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {latest.items.map((p) => (
              <li key={p.id}>
                <PropertyCard property={p} />
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <ButtonLink href="/property/for-sale" variant="secondary">
              View all property for sale
            </ButtonLink>
          </div>
        </Section>
      )}
    </PillarHub>
  )
}
