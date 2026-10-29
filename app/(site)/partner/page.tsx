import Link from 'next/link'
import { buildMetadata } from '@/lib/seo'
import { getServerSupabase } from '@/lib/supabase/server'
import { Container } from '@/components/ui/Layout'
import { Badge } from '@/components/ui/Badge'
import { PartnerDraftForm } from '@/components/partner/PartnerDraftForm'
import { partnerCategories, requirePartnerPage } from '@/lib/supply/partner-portal-data'
import { DRAFT_STATUS_LABEL, PORTAL_TEXT, type DraftStatus } from '@/lib/supply/partner-rules'
import { must } from '@/lib/admin/must'

export const dynamic = 'force-dynamic'
export const metadata = buildMetadata({ title: PORTAL_TEXT.heading, description: PORTAL_TEXT.intro, path: '/partner', noindex: true })

/** S6-1 private partner area: the partner's own product drafts, then a new one. */
export default async function PartnerHomePage() {
  await requirePartnerPage('/partner')
  // Read as the signed-in member through partner_my_products: the database itself limits it to their own partner.
  const [{ data: drafts }, categories] = await Promise.all([
    getServerSupabase().from('partner_my_products').select('id, name, status, updated_at').order('updated_at', { ascending: false }).limit(200).then(must),
    partnerCategories(),
  ])
  return (
    <Container className="max-w-3xl py-10 lg:py-16">
      <h1 className="hl-h1">{PORTAL_TEXT.heading}</h1>
      <p className="mt-4 text-[1.0625rem] text-muted">{PORTAL_TEXT.intro}</p>
      {(drafts ?? []).length > 0 && (
        <ul className="mt-8 divide-y divide-border rounded-lg border border-border bg-white">
          {(drafts ?? []).map((d) => (
            <li key={d.id}>
              <Link href={`/partner/${d.id}`} className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50">
                <span className="font-semibold text-ink">{d.name}</span>
                <Badge tone={d.status === 'approved' ? 'green' : d.status === 'changes_requested' ? 'warning' : 'neutral'}>{DRAFT_STATUS_LABEL[d.status as DraftStatus] ?? d.status}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-10 rounded-lg border border-border bg-white p-5 sm:p-8">
        <PartnerDraftForm draftId={crypto.randomUUID()} defaults={{}} categories={categories} photos={[]} />
      </div>
    </Container>
  )
}
