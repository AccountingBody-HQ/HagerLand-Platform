import { requireAdminPage } from '@/lib/admin/guard'
import { AdminHeader } from '@/components/admin/AdminUi'
import { EnquiryList } from '@/components/admin/EnquiryList'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'Enquiries' }

export default function AdminEnquiriesPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  requireAdminPage()
  return (
    <div>
      <AdminHeader
        title="Enquiries"
        description="Every message sent through the site. “Opened” shows when the receiving owner or company first read it."
        actions={
          <ButtonLink href={`/roodber8/export/enquiries${searchParams.status ? `?status=${encodeURIComponent(searchParams.status)}` : ''}`} variant="secondary" size="sm">
            Export CSV
          </ButtonLink>
        }
      />
      <EnquiryList basePath="/roodber8/enquiries" searchParams={searchParams} />
    </div>
  )
}
