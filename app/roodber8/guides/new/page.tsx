import { requireAdminPage } from '@/lib/admin/guard'
import { AdminHeader } from '@/components/admin/AdminUi'
import { GuideForm } from '@/components/admin/GuideForm'

export const metadata = { title: 'New guide' }

export default async function NewGuidePage() {
  await requireAdminPage()
  return (
    <div className="space-y-5">
      <AdminHeader title="New guide" />
      <GuideForm defaults={{ needs_review: false }} />
    </div>
  )
}
