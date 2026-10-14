import { requireAdminPage } from '@/lib/admin/guard'
import { getProductCategories, getServiceCategories } from '@/lib/data/reference'
import { saveAdminOrgAction } from '../../actions/organisations'
import { AdminHeader, Panel } from '@/components/admin/AdminUi'
import { OrganisationForm } from '@/components/account/OrganisationForm'

export const metadata = { title: 'New organisation' }

export default async function NewOrgPage() {
  requireAdminPage()
  const [services, products] = await Promise.all([getServiceCategories(), getProductCategories()])
  return (
    <div className="max-w-4xl">
      <AdminHeader title="New organisation" description="Published straight away with the Listed badge. The owner can claim it later." />
      <Panel>
        <OrganisationForm
          action={saveAdminOrgAction}
          kinds={['contractor', 'professional_firm', 'sole_trader', 'agency', 'developer', 'supplier', 'manufacturer', 'lender', 'insurer', 'broker']}
          services={services.map((g) => ({ id: g.id, name: g.name, children: g.children }))}
          productCategories={products.map((c) => ({ id: c.id, name: c.name, children: [] }))}
          defaults={{ kind: 'contractor' }}
          submitLabel="Create and publish"
        />
      </Panel>
    </div>
  )
}
