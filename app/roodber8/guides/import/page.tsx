import { requireAdminPage } from '@/lib/admin/guard'
import { AdminHeader } from '@/components/admin/AdminUi'
import { GuideImport } from '@/components/admin/GuideImport'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'Import guide JSON' }

export default async function ImportGuidePage() {
  await requireAdminPage()
  return (
    <div className="space-y-5">
      <AdminHeader
        title="Import guide JSON"
        description="Paste the JSON Claude returned for a Guide studio prompt. Validate it, check the preview and the CHECK notes, then import it as a draft."
        actions={
          <ButtonLink href="/roodber8/guides/studio" size="sm" variant="secondary" prefetch={false}>
            Guide studio
          </ButtonLink>
        }
      />
      <GuideImport />
    </div>
  )
}
