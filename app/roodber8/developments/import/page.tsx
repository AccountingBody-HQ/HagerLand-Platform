import { requireAdminPage } from '@/lib/admin/guard'
import { DEV_CSV_COLUMNS } from '@/lib/admin/dev-import'
import { AdminHeader, Panel } from '@/components/admin/AdminUi'
import { DevelopmentImport } from './DevelopmentImport'

export const metadata = { title: 'Import developments' }

export default async function ImportDevelopmentsPage() {
  await requireAdminPage()
  return (
    <div className="max-w-5xl">
      <AdminHeader title="Import developments and buildings" description="Create many development and building pages at once. Rows are checked first; duplicates (same name and location) are skipped." />
      <Panel>
        <DevelopmentImport columns={DEV_CSV_COLUMNS} />
      </Panel>
    </div>
  )
}
