import { requireAdminPage } from '@/lib/admin/guard'
import { AdminHeader } from '@/components/admin/AdminUi'
import { EnquiryList } from '@/components/admin/EnquiryList'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'HagerLand sales' }

export default async function SalesPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams
  await requireAdminPage()
  return (
    <div>
      <AdminHeader
        title="HagerLand sales"
        description="Estate agency enquiries (selling, letting, buying, sourcing, developer sales) and interest in HagerLand Developments. Move each lead through new → contacted → qualified → won or lost."
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
