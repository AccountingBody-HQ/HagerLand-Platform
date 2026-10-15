import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { auditFor, notesFor, productFormOptions } from '@/lib/admin/options'
import { parseSpecs } from '@/lib/data/products'
import { formatDate } from '@/lib/format'
import { AdminHeader, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { ProductForm } from '@/components/supplies/ProductForm'
import { saveProductAction, saveSpecialBuyAction } from '../../actions/products'
import { ActionForm } from '@/components/forms/ActionForm'
import { ModerationControls } from '@/components/admin/ModerationControls'
import { ChangesDiff } from '@/components/admin/ChangesDiff'
import { Input } from '@/components/ui/Field'
import { FeatureTool, NotesTool, StatusTool } from '@/components/admin/RecordTools'
import { AuditTrail } from '@/components/admin/AuditTrail'
import { MediaManager } from '@/components/media/MediaManager'
import { FormAlert } from '@/components/forms/FormParts'
import type { MediaItem } from '@/lib/media-actions'

export const metadata = { title: 'Product' }

export default async function AdminProductPage(
  props: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }
) {
  const searchParams = await props.searchParams
  const params = await props.params
  await requireAdminPage()
  const db = getAdminSupabase()
  const { data: p } = await db.from('products').select('*').eq('id', params.id).maybeSingle()
  if (!p) notFound()
  const [{ data: media }, o, notes, trail] = await Promise.all([
    db.from('media').select('id, kind, storage_path, thumb_path, width, height, alt, sort, is_cover, status').eq('entity_type', 'product').eq('entity_id', p.id).order('sort'),
    productFormOptions(),
    notesFor('product', p.id),
    auditFor(p.id),
  ])
  return (
    <div className="space-y-5">
      <AdminHeader
        title={p.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={p.status} /> {p.price_updated_at ? `price updated ${formatDate(p.price_updated_at)}` : ''}
          </span>
        }
        actions={
          p.status === 'published' ? (
            <Link href={`/supplies/product/${p.slug}`} target="_blank" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong bg-white px-3 text-small font-semibold">
              View live <ExternalLink className="size-4" aria-hidden />
            </Link>
          ) : undefined
        }
      />
      {searchParams.created && <FormAlert tone="success">Product created as a draft. Add photos, then publish it.</FormAlert>}
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          {p.status === 'pending_review' && (
            <Panel title="Waiting for review">
              <ModerationControls entity="product" id={p.id} size="md" />
            </Panel>
          )}
          {p.pending_changes && (
            <Panel title="Proposed changes">
              <ChangesDiff live={p as Record<string, unknown>} changes={p.pending_changes as Record<string, unknown>} />
              <div className="mt-3">
                <ModerationControls entity="product" id={p.id} mode="changes" />
              </div>
            </Panel>
          )}
          <Panel title="Photos">
            <MediaManager entityType="product" entityId={p.id} initial={(media ?? []) as MediaItem[]} label="Add product photos" hint="Square photos on a white background work best." />
          </Panel>
          <ProductForm action={saveProductAction}
            defaults={{ ...p, min_order_qty: Number(p.min_order_qty), specs: parseSpecs(p.specs) }}
            categories={o.categories}
            brands={o.brands}
            sellers={o.sellers}
          />
        </div>
        <aside className="space-y-5">
          <Panel title="Status">
            <StatusTool entity="product" id={p.id} status={p.status} />
          </Panel>
          <Panel title="Special Buy">
            <p className="mb-3 text-small text-muted">Surplus or clearance offer on /supplies/special-buys. It hides itself after the end date or when the quantity reaches zero.</p>
            <ActionForm action={saveSpecialBuyAction} submitLabel="Save offer" resetOnSuccess={false} className="grid gap-3">
              <input type="hidden" name="id" value={p.id} />
              <label className="flex min-h-11 items-center gap-2 font-semibold">
                <input type="checkbox" name="is_special_buy" defaultChecked={p.is_special_buy} className="size-5 accent-green" /> On Special Buy
              </label>
              <label className="grid gap-1 text-small font-semibold">
                Was price (ETB)
                <Input name="was_price_etb" inputMode="decimal" defaultValue={p.special_was_price_etb_cents ? (p.special_was_price_etb_cents / 100).toFixed(2) : ''} />
              </label>
              <label className="grid gap-1 text-small font-semibold">
                Quantity available
                <Input name="qty" inputMode="numeric" defaultValue={p.special_qty_available ?? ''} />
              </label>
              <label className="grid gap-1 text-small font-semibold">
                Ends on
                <Input name="ends_on" type="date" defaultValue={p.special_ends_at ? p.special_ends_at.slice(0, 10) : ''} />
              </label>
            </ActionForm>
          </Panel>
          <Panel title="Featured">
            <FeatureTool entity="product" id={p.id} featuredUntil={p.featured_until} />
          </Panel>
          <Panel title="Internal notes">
            <NotesTool entity="product" id={p.id} notes={notes} />
          </Panel>
          <Panel title="Audit trail">
            <AuditTrail entries={trail} />
          </Panel>
        </aside>
      </div>
    </div>
  )
}
