import { requireAdminPage } from '@/lib/admin/guard'
import { productFormOptions } from '@/lib/admin/options'
import { AdminHeader } from '@/components/admin/AdminUi'
import { ProductForm } from '@/components/admin/ProductForm'

export const metadata = { title: 'New product' }

export default async function NewProductPage() {
  requireAdminPage()
  const o = await productFormOptions()
  return (
    <div className="max-w-4xl">
      <AdminHeader title="New product" description="Saved as a draft. Add photos, then publish it." />
      <ProductForm defaults={{}} categories={o.categories} brands={o.brands} sellers={o.sellers} />
    </div>
  )
}
