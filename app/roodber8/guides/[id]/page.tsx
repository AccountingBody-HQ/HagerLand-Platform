import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { asFaq, checkNotesMessage, faqToText, guideCheckMarkers } from '@/lib/guides'
import { deleteGuideAction } from '../../actions/guides'
import { AdminHeader, StatusBadge } from '@/components/admin/AdminUi'
import { GuideForm } from '@/components/admin/GuideForm'
import { ActionButton } from '@/components/forms/ActionButton'
import { FormAlert } from '@/components/forms/FormParts'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Guide' }

export default async function AdminGuidePage(
  props: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }
) {
  const searchParams = await props.searchParams
  const params = await props.params
  await requireAdminPage()
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound()
  const { data: g } = must(await getAdminSupabase().from('guides').select('*').eq('id', params.id).maybeSingle())
  if (!g) notFound()
  const markers = guideCheckMarkers(g)
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
      {markers.length > 0 && (
        <div role="status" className="rounded-md border border-gold/40 bg-gold-soft px-4 py-3 text-small text-ink">
          <p className="font-semibold">{checkNotesMessage(markers.length)}</p>
          <p className="mt-1">Each note marks a fact to verify. Check it, correct the text and delete the [CHECK: …] note. Until none remain, “Content checked” and publishing are blocked.</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            {markers.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </div>
      )}
      <GuideForm defaults={{ ...g, faq_text: faqToText(asFaq(g.faq)) }} checkNotes={markers.length} />
    </div>
  )
}
