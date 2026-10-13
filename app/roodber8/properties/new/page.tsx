import { requireAdminPage } from '@/lib/admin/guard'
import { developmentOptions, listerOptions } from '@/lib/admin/options'
import { AdminHeader } from '@/components/admin/AdminUi'
import { AdminPropertyForm } from '@/components/admin/AdminPropertyForm'

export const metadata = { title: 'New listing' }

export default async function NewAdminPropertyPage() {
  requireAdminPage()
  const [listers, developments] = await Promise.all([listerOptions(), developmentOptions()])
  return (
    <div className="max-w-4xl">
      <AdminHeader title="New listing" description="Create a listing for an agency, developer or HagerLand Developments. It starts as a draft; add photos, then publish." />
      <AdminPropertyForm values={{ purpose: 'sale' }} listers={listers} developments={developments} />
    </div>
  )
}
