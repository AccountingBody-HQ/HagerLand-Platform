import { notFound } from 'next/navigation'
import { z } from 'zod'
import { buildMetadata } from '@/lib/seo'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { Container } from '@/components/ui/Layout'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { ActionButton } from '@/components/forms/ActionButton'
import { PartnerDraftForm } from '@/components/partner/PartnerDraftForm'
import { withdrawPartnerDraftAction } from '@/app/actions/partner-portal-actions'
import { draftPhotoLinks, partnerCategories, requirePartnerPage } from '@/lib/supply/partner-portal-data'
import { DRAFT_STATUS_LABEL, PARTNER_EDITABLE, PARTNER_WITHDRAWABLE, PORTAL_TEXT, specLines, type DraftStatus } from '@/lib/supply/partner-rules'
import { formatETBCents } from '@/lib/format'
import { unitLabel } from '@/lib/units'
import { must } from '@/lib/admin/must'

export const dynamic = 'force-dynamic'
export const metadata = buildMetadata({ title: PORTAL_TEXT.heading, description: PORTAL_TEXT.intro, path: '/partner', noindex: true })

/** S6-1: one of the partner's own drafts: editable before sending (or when changes were asked for), otherwise read only. */
export default async function PartnerDraftPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const membership = await requirePartnerPage(`/partner/${id}`)
  if (!z.uuid().safeParse(id).success) notFound()
  const { data: d } = must(await getAdminSupabase().from('partner_product_drafts').select('*').eq('id', id).eq('org_id', membership.orgId).maybeSingle())
  if (!d) notFound()
  const status = d.status as DraftStatus
  const editable = PARTNER_EDITABLE.includes(status)
  const [categories, photos] = await Promise.all([partnerCategories(), draftPhotoLinks(d.photo_paths ?? [])])
  const category = categories.find((c) => c.id === d.category_id)?.name ?? ''
  const rows: [string, string][] = [
    ['Product name', d.name],
    ['Brand (as printed on the product)', d.brand_name ?? ''],
    ['Category', category],
    ['Unit', unitLabel(d.unit)],
    ['Pack size', d.pack_size ?? ''],
    ['Description', d.description ?? ''],
    ['Specifications', specLines(d.specs)],
    ['Your product code (private)', d.partner_sku ?? ''],
    ['Your price to HagerLand in ETB (private)', d.proposed_price_cents !== null ? formatETBCents(d.proposed_price_cents) : ''],
    ['Stock and availability', d.stock_note ?? ''],
    ['Typical lead time in days', d.lead_time_days !== null ? String(d.lead_time_days) : ''],
    ['Minimum order', d.min_order_qty !== null ? String(Number(d.min_order_qty)) : ''],
  ]
  return (
    <Container className="max-w-3xl py-10 lg:py-16">
      <ButtonLink href="/partner" variant="ghost" size="sm">
        {PORTAL_TEXT.heading}
      </ButtonLink>
      <h1 className="hl-h1 mt-3">{d.name}</h1>
      <div className="mt-3">
        <Badge tone={status === 'approved' ? 'green' : status === 'changes_requested' ? 'warning' : 'neutral'}>{DRAFT_STATUS_LABEL[status] ?? status}</Badge>
      </div>
      {d.reviewer_note && (status === 'changes_requested' || status === 'rejected') && <p className="mt-4 whitespace-pre-line rounded-md border border-warning bg-stone-50 p-4">{d.reviewer_note}</p>}
      <div className="mt-8 rounded-lg border border-border bg-white p-5 sm:p-8">
        {editable ? (
          <PartnerDraftForm
            draftId={d.id}
            categories={categories}
            photos={photos}
            defaults={{ ...d, min_order_qty: d.min_order_qty === null ? null : Number(d.min_order_qty), specs: specLines(d.specs) }}
          />
        ) : (
          <>
            <dl className="divide-y divide-border">
              {rows
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="grid gap-1 py-3 sm:grid-cols-3">
                    <dt className="text-muted">{label}</dt>
                    <dd className="whitespace-pre-line sm:col-span-2">{value}</dd>
                  </div>
                ))}
            </dl>
            {photos.some((p) => p.url) && (
              <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {photos.map((p) =>
                  p.url ? (
                    <li key={p.path}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived private link, not an optimisable public image */}
                      <img src={p.url} alt="" className="aspect-square w-full rounded-md border border-border object-cover" />
                    </li>
                  ) : null,
                )}
              </ul>
            )}
          </>
        )}
      </div>
      {PARTNER_WITHDRAWABLE.includes(status) && (
        <ActionButton variant="ghost" className="mt-4 w-full sm:w-auto" action={withdrawPartnerDraftAction.bind(null, d.id)}>
          {PORTAL_TEXT.withdraw}
        </ActionButton>
      )}
    </Container>
  )
}
