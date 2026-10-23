import { requireAdminPage } from '@/lib/admin/guard'
import { getProductCategories, getServiceCategories } from '@/lib/data/reference'
import { saveAdminOrgAction } from '../../actions/organisations'
import { AdminHeader, Panel } from '@/components/admin/AdminUi'
import { OrganisationForm } from '@/components/account/OrganisationForm'
import { Radio } from '@/components/ui/Field'

export const metadata = { title: 'New organisation' }

export default async function NewOrgPage(props: { searchParams: Promise<{ supplier?: string }> }) {
  const supplier = (await props.searchParams).supplier === '1'
  await requireAdminPage()
  const [services, products] = await Promise.all([getServiceCategories(), getProductCategories()])
  return (
    <div className="max-w-4xl">
      <AdminHeader
        title={supplier ? 'Add new supplier' : 'New organisation'}
        description={
          supplier
            ? 'Creates the business privately with its supply partner record (status “Discovered”). Publish it later, after confirming the details with the business.'
            : 'Keep it private until you have confirmed the details with the business, or publish it now with the Listed badge. The owner can claim it once it is published.'
        }
      />
      <Panel>
        <OrganisationForm
          action={saveAdminOrgAction}
          kinds={['contractor', 'professional_firm', 'sole_trader', 'agency', 'developer', 'supplier', 'manufacturer', 'lender', 'insurer', 'broker']}
          services={services.map((g) => ({ id: g.id, name: g.name, children: g.children }))}
          productCategories={products.map((c) => ({ id: c.id, name: c.name, children: [] }))}
          defaults={{ kind: supplier ? 'supplier' : 'contractor' }}
          submitLabel={supplier ? 'Create supplier' : 'Create organisation'}
          duplicateMode="admin"
          extra={
            <fieldset className="space-y-3">
              <legend className="hl-h3 mb-2">Visibility</legend>
              {supplier && <input type="hidden" name="supply_partner" value="1" />}
              <Radio
                id="org-vis-private"
                name="visibility"
                value="private"
                defaultChecked
                label="Keep private: not shown on the public site"
                description="Recommended until you have confirmed the details with the business."
              />
              <Radio id="org-vis-publish" name="visibility" value="publish" label="Publish now with the Listed badge" description="It appears on the public site straight away." />
            </fieldset>
          }
        />
      </Panel>
    </div>
  )
}
