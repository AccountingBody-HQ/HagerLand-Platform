import { Heart } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { EmptyState } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { PropertyCard } from '@/components/property/PropertyCard'
import { ProductCard } from '@/components/supplies/ProductCard'
import { CompanyCard } from '@/components/company/CompanyCard'
import { DevelopmentCard } from '@/components/development/DevelopmentCard'
import type { PublicProperty } from '@/lib/data/properties'
import type { PublicProduct } from '@/lib/data/products'
import type { OrganisationListItem } from '@/lib/data/organisations'
import type { DevelopmentListItem } from '@/lib/data/developments'

export const metadata = { title: 'Saved' }

/** Saved properties, products, businesses and developments (spec 25.2a). Only items still live are shown. */
export default async function SavedPage() {
  const user = await requireUser('/account/saved')
  const { data: saved } = await getServerSupabase().from('saved_items').select('entity_type, entity_id, created_at').eq('user_id', user.id).order('created_at', { ascending: false })
  const ids = (t: string) => (saved ?? []).filter((s) => s.entity_type === t).map((s) => s.entity_id)
  const db = getAdminSupabase()
  const [props, prods, orgs, devs] = await Promise.all([
    ids('property').length ? db.from('properties_public').select('*').in('id', ids('property')) : { data: [] },
    ids('product').length ? db.from('products_public').select('*').in('id', ids('product')) : { data: [] },
    ids('organisation').length ? db.from('organisations_public').select('*').in('id', ids('organisation')) : { data: [] },
    ids('development').length ? db.from('developments_public').select('*').in('id', ids('development')) : { data: [] },
  ])
  const total = (props.data?.length ?? 0) + (prods.data?.length ?? 0) + (orgs.data?.length ?? 0) + (devs.data?.length ?? 0)
  const unavailable = (saved?.length ?? 0) - total
  return (
    <div className="space-y-10">
      <AccountPageHeader title="Saved" description="Properties, products, businesses and developments you saved." />
      {total === 0 ? (
        <EmptyState icon={<Heart />} title="Nothing saved yet" description="Tap “Save” on a property, product or business page to keep it here." actions={<ButtonLink href="/property">Browse property</ButtonLink>} />
      ) : (
        <>
          {(props.data?.length ?? 0) > 0 && (
            <section>
              <h2 className="hl-h3 mb-4">Properties</h2>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {(props.data as unknown as PublicProperty[]).map((p) => (
                  <li key={p.id}>
                    <PropertyCard property={p} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {(prods.data?.length ?? 0) > 0 && (
            <section>
              <h2 className="hl-h3 mb-4">Products</h2>
              <ul className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                {(prods.data as unknown as PublicProduct[]).map((p) => (
                  <li key={p.id}>
                    <ProductCard product={p} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {(orgs.data?.length ?? 0) > 0 && (
            <section>
              <h2 className="hl-h3 mb-4">Businesses</h2>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {(orgs.data as unknown as OrganisationListItem[]).map((o) => (
                  <li key={o.id}>
                    <CompanyCard org={{ ...o, portfolio_count: 0, listings_count: 0, services: [] }} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          {(devs.data?.length ?? 0) > 0 && (
            <section>
              <h2 className="hl-h3 mb-4">Developments</h2>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {(devs.data as unknown as DevelopmentListItem[]).map((d) => (
                  <li key={d.id}>
                    <DevelopmentCard development={d} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      {unavailable > 0 && <p className="text-small text-muted">{unavailable} saved item{unavailable === 1 ? ' is' : 's are'} no longer available and not shown.</p>}
    </div>
  )
}
