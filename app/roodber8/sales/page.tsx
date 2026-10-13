import { requireAdminPage } from '@/lib/admin/guard'
import { AdminHeader } from '@/components/admin/AdminUi'
import { EnquiryList } from '@/components/admin/EnquiryList'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'HagerLand sales' }

export default function SalesPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  requireAdminPage()
  return (
    <div>
      <AdminHeader
        title="HagerLand sales"
        description="Enquiries and “register interest” requests for HagerLand Developments. Move each lead through new → contacted → qualified → won or lost."
        actions={
          <ButtonLink href="/roodber8/export/sales" variant="secondary" size="sm">
            Export CSV
          </ButtonLink>
        }
      />
      <EnquiryList basePath="/roodber8/sales" searchParams={searchParams} salesOnly />
    </div>
  )
}
