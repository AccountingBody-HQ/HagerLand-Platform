import { requireAdminPage } from '@/lib/admin/guard'
import { developerOptions } from '@/lib/admin/options'
import { saveAdminDevelopmentAction } from '../../actions/developments'
import { AdminHeader, Panel } from '@/components/admin/AdminUi'
import { DevelopmentForm } from '@/components/account/DevelopmentForm'

export const metadata = { title: 'New development' }

export default async function NewAdminDevelopmentPage() {
  await requireAdminPage()
  return (
    <div className="max-w-4xl">
      <AdminHeader title="New development or building" description="Saved as a draft. Add photos, then publish with the status control." />
      <Panel>
        <DevelopmentForm defaults={{}} action={saveAdminDevelopmentAction} developerOptions={await developerOptions()} />
      </Panel>
    </div>
  )
}
