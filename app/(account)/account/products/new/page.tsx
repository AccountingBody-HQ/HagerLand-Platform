import { Package } from 'lucide-react'
import { getActiveMembership, requireUser } from '@/lib/auth'
import { SELLER_KINDS } from '@/lib/validation/product'
import { ownerProductOptions } from '@/lib/data/owner-products'
import { saveOwnProductAction } from '../actions'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { EmptyState } from '@/components/ui/Layout'
import { ProductForm } from '@/components/supplies/ProductForm'

export const metadata = { title: 'Add product' }

export default async function NewProductPage() {
  await requireUser('/account/products/new')
  const active = await getActiveMembership()
  if (!active || !(SELLER_KINDS as readonly string[]).includes(active.org.kind)) return <EmptyState icon={<Package />} title="Products are for supplier accounts" />
  const o = await ownerProductOptions()
  return (
    <div className="space-y-6">
      <AccountPageHeader title="Add product" description="Save it as a draft, add photos, then submit it for review." />
      <ProductForm action={saveOwnProductAction} defaults={{ seller_org_id: active.org.id }} categories={o.categories} brands={o.brands} allowNewBrand={false} submitLabel="Save draft" />
    </div>
  )
}
