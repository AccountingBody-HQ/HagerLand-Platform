import Link from 'next/link'
import { Package, Plus } from 'lucide-react'
import { getActiveMembership, requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { LISTING_STATUS_LABELS } from '@/lib/labels'
import { SELLER_KINDS } from '@/lib/validation/product'
import { formatETBCents } from '@/lib/format'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { ButtonLink } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Layout'
import { LoadFailed } from '@/components/account/LoadFailed'
import { log } from '@/lib/log'

export const metadata = { title: 'Products' }

/** Supplier dashboard: the organisation's products (spec 25.2c). */
export default async function MyProductsPage() {
  await requireUser('/account/products')
  const active = await getActiveMembership()
  if (!active || !(SELLER_KINDS as readonly string[]).includes(active.org.kind))
    return <EmptyState icon={<Package />} title="Products are for supplier accounts" description="Suppliers and manufacturers can list their products on HagerLand Supply." />
  const { data, error } = await getServerSupabase().from('products').select('id, name, status, price_type, price_etb_cents, pending_changes, is_special_buy, updated_at').eq('seller_org_id', active.org.id).neq('status', 'archived').order('updated_at', { ascending: false })
  if (error) log.error('account', 'products failed to load', error)
  const rows = data ?? []
  return (
    <div>
      <AccountPageHeader
        title="Products"
        description={`Products sold by ${active.org.name}. HagerLand reviews each product before it appears on HagerLand Supply.`}
        action={
          <ButtonLink href="/account/products/new">
            <Plus /> Add product
          </ButtonLink>
        }
      />
      {error ? (
        <LoadFailed what="your products" />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Package />} title="No products yet" actions={<ButtonLink href="/account/products/new">Add your first product</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => {
            const s = LISTING_STATUS_LABELS[p.status]
            return (
              <li key={p.id}>
                <Link href={`/account/products/${p.id}/edit`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white p-4 shadow-sm hover:border-green">
                  <div className="min-w-0">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-small text-muted">{p.price_type === 'on_request' || p.price_etb_cents === null ? 'Price on request' : `${p.price_type === 'from' ? 'From ' : ''}${formatETBCents(p.price_etb_cents)}`}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {p.is_special_buy && <Badge tone="gold">Special Buy</Badge>}
                    {p.pending_changes && <Badge tone="info">Changes in review</Badge>}
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
