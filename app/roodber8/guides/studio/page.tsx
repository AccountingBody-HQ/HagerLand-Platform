import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { AdminHeader } from '@/components/admin/AdminUi'
import { GuideStudio } from '@/components/admin/GuideStudio'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'Guide studio' }

export default async function GuideStudioPage() {
  await requireAdminPage()
  const { data } = await getAdminSupabase().from('guides').select('title')
  return (
    <div className="space-y-5">
      <AdminHeader
        title="Guide studio"
        description="Build a prompt, paste it into your own Claude chat, then import the JSON it returns. The site never calls an AI service, and imported guides are drafts marked “Needs AB review”."
        actions={
          <ButtonLink href="/roodber8/guides/import" size="sm" variant="secondary" prefetch={false}>
            Import guide JSON
          </ButtonLink>
        }
      />
      <GuideStudio titles={(data ?? []).map((g) => g.title)} />
    </div>
  )
}
