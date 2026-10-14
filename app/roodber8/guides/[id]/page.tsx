import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { asFaq, faqToText } from '@/lib/guides'
import { deleteGuideAction } from '../../actions/guides'
import { AdminHeader, StatusBadge } from '@/components/admin/AdminUi'
import { GuideForm } from '@/components/admin/GuideForm'
import { ActionButton } from '@/components/forms/ActionButton'
import { FormAlert } from '@/components/forms/FormParts'

export const metadata = { title: 'Guide' }

export default async function AdminGuidePage({ params, searchParams }: { params: { id: string }; searchParams: { created?: string } }) {
  requireAdminPage()
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound()
  const { data: g } = await getAdminSupabase().from('guides').select('*').eq('id', params.id).maybeSingle()
  if (!g) notFound()
  return (
    <div className="space-y-5">
      <AdminHeader
        title={g.title}
        description={<StatusBadge status={g.status} />}
        actions={
          <div className="flex gap-2">
            {g.status === 'published' && (
              <Link href={`/guides/${g.slug}`} target="_blank" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong bg-white px-3 text-small font-semibold">
                View live <ExternalLink className="size-4" aria-hidden />
              </Link>
            )}
            <ActionButton size="sm" variant="ghost" className="text-error" confirm="Delete this guide permanently?" action={deleteGuideAction.bind(null, g.id)}>
              Delete
            </ActionButton>
          </div>
        }
      />
      {searchParams.created && <FormAlert tone="success">Guide created.</FormAlert>}
      <GuideForm defaults={{ ...g, faq_text: faqToText(asFaq(g.faq)) }} />
    </div>
  )
}
