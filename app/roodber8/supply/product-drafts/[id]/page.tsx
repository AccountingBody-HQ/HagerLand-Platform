import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate, formatETBCents } from '@/lib/format'
import { unitLabel } from '@/lib/units'
import { AdminHeader, KeyValue, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { ApproveDraftForm, DraftReviewTools } from '@/components/admin/PartnerAdminTools'
import { must } from '@/lib/admin/must'
import { draftPhotoLinks, partnerCategories } from '@/lib/supply/partner-portal-data'
import { REVIEWABLE, specLines, type DraftStatus } from '@/lib/supply/partner-rules'

export const metadata = { title: 'Partner product draft' }

/** Columns every reviewer may see. The partner's price and product code are added for the owner only (S-6). */
const CONTENT = 'id, org_id, name, brand_name, category_id, unit, pack_size, description, specs, stock_note, lead_time_days, min_order_qty, photo_paths, status, submitted_at, decided_at, reviewer_note, product_id, updated_at'
const OWNER_ONLY = ', partner_sku, proposed_price_cents'

interface DraftRow {
  id: string
  org_id: string
  name: string
  brand_name: string | null
  category_id: string | null
  unit: string
  pack_size: string | null
  description: string | null
  specs: unknown
  stock_note: string | null
  lead_time_days: number | null
  min_order_qty: number | string | null
  photo_paths: string[]
  status: string
  submitted_at: string | null
  decided_at: string | null
  reviewer_note: string | null
  product_id: string | null
  partner_sku?: string | null
  proposed_price_cents?: number | null
}

/** S6-1: review one partner draft. */
export default async function PartnerDraftReviewPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  await requireAdminPage()
  if (!z.uuid().safeParse(id).success) notFound()
  const owner = await isOwnerSession()
  const db = getAdminSupabase()
  const { data } = must(await db.from('partner_product_drafts').select(owner ? CONTENT + OWNER_ONLY : CONTENT).eq('id', id).maybeSingle())
  const d = data as unknown as DraftRow | null
  if (!d) notFound()
  const [categories, photos, { data: reg }] = await Promise.all([
    partnerCategories(),
    draftPhotoLinks(d.photo_paths ?? []),
    db.from('partner_registrations').select('id, business_name').eq('org_id', d.org_id).limit(1).maybeSingle(),
  ])
  const status = d.status as DraftStatus
  const minOrder = d.min_order_qty === null ? null : Number(d.min_order_qty)
  return (
    <div className="max-w-4xl space-y-5">
      <AdminHeader title={d.name} description={`From ${reg?.business_name ?? 'a partner'} · sent ${formatDate(d.submitted_at)}`} />
      <Panel title="Draft">
        <KeyValue
          items={[
            ['Status', <StatusBadge key="s" status={d.status} />],
            ['Partner', reg ? <Link key="p" href={`/roodber8/supply/registrations/${reg.id}`} prefetch={false} className="underline">{reg.business_name}</Link> : ''],
            ['Brand', d.brand_name ?? ''],
            ['Category', categories.find((c) => c.id === d.category_id)?.name ?? ''],
            ['Unit', unitLabel(d.unit)],
            ['Pack size', d.pack_size ?? ''],
            ['Minimum order', minOrder === null ? '' : String(minOrder)],
            ['Lead time (days)', d.lead_time_days === null ? '' : String(d.lead_time_days)],
            ['Stock and availability', d.stock_note ?? ''],
            ['Description', d.description ?? ''],
            ['Specifications', <span key="sp" className="whitespace-pre-line">{specLines(d.specs)}</span>],
            ...(owner
              ? ([
                  ['Partner’s product code (owner only)', d.partner_sku ?? ''],
                  ['Partner’s price to HagerLand (owner only)', d.proposed_price_cents != null ? formatETBCents(d.proposed_price_cents) : ''],
                ] as [string, string][])
              : []),
            ['Note to the partner', d.reviewer_note ?? ''],
            ['HagerLand product', d.product_id ? <Link key="pr" href={`/roodber8/products/${d.product_id}`} prefetch={false} className="underline">Open</Link> : ''],
          ]}
        />
        {photos.some((p) => p.url) && (
          <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {photos.map((p) =>
              p.url ? (
                <li key={p.path}>
                  <a href={p.url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived private link */}
                    <img src={p.url} alt="" className="aspect-square w-full rounded-md border border-border object-cover" />
                  </a>
                </li>
              ) : null,
            )}
          </ul>
        )}
      </Panel>
      {REVIEWABLE.includes(status) && (
        <Panel title="Review">
          <DraftReviewTools id={d.id} owner={owner} />
        </Panel>
      )}
      {owner && REVIEWABLE.includes(status) && (
        <Panel title="Approve">
          <ApproveDraftForm
            id={d.id}
            categories={categories}
            defaults={{
              name: d.name,
              category_id: d.category_id,
              brand_name: d.brand_name,
              unit: d.unit,
              pack_size: d.pack_size,
              min_order_qty: minOrder,
              lead_time_days: d.lead_time_days,
              description: d.description,
              specs: specLines(d.specs),
              cost_price: d.proposed_price_cents != null ? (d.proposed_price_cents / 100).toFixed(2) : '',
              hasPhotos: (d.photo_paths ?? []).length > 0,
            }}
          />
        </Panel>
      )}
    </div>
  )
}
