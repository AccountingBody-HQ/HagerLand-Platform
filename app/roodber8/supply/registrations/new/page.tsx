import { requireAdminPage } from '@/lib/admin/guard'
import { AdminHeader, Panel } from '@/components/admin/AdminUi'
import { StaffRegistrationForm } from '@/components/admin/PartnerAdminTools'
import { partnerCategories } from '@/lib/supply/partner-portal-data'

export const metadata = { title: 'Add partner registration' }

/** S6-1: staff add a business met in the field. Works whether or not the public form is switched on. */
export default async function AddPartnerRegistrationPage() {
  await requireAdminPage()
  const categories = (await partnerCategories()).filter((c) => !c.name.includes('›'))
  return (
    <div className="max-w-4xl space-y-5">
      <AdminHeader title="Add partner registration" description="For a business you met or spoke to. It gets a private supply partner record; it never gets a public page, and nothing is sent to it." />
      <Panel>
        <StaffRegistrationForm categories={categories} />
      </Panel>
    </div>
  )
}
