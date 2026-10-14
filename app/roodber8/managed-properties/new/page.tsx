import { requireAdminPage } from '@/lib/admin/guard'
import { getLocations } from '@/lib/data/reference'
import { saveManagedPropertyAction } from '@/app/roodber8/actions/property-care'
import { AdminHeader, Panel } from '@/components/admin/AdminUi'
import { ActionForm } from '@/components/admin/ActionForm'
import { ManagedPropertyFields } from '@/components/admin/ManagedPropertyFields'

export const metadata = { title: 'Add a managed property' }

export default async function NewManagedPropertyPage() {
  requireAdminPage()
  const locations = (await getLocations()).filter((l) => l.country_code === 'ET').map((l) => ({ id: l.id, label: l.display_name })).sort((a, b) => a.label.localeCompare(b.label))
  return (
    <div className="max-w-3xl">
      <AdminHeader title="Add a managed property" />
      <Panel>
        <ActionForm action={saveManagedPropertyAction} submitLabel="Create" resetOnSuccess={false}>
          <ManagedPropertyFields d={{}} locations={locations} />
        </ActionForm>
      </Panel>
    </div>
  )
}
