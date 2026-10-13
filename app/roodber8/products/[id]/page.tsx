import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { auditFor, notesFor, productFormOptions } from '@/lib/admin/options'
import { parseSpecs } from '@/lib/data/products'
import { formatDate } from '@/lib/format'
import { AdminHeader, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { ProductForm } from '@/components/admin/ProductForm'
import { FeatureTool, NotesTool, StatusTool } from '@/components/admin/RecordTools'
import { AuditTrail } from '@/components/admin/AuditTrail'
import { MediaManager } from '@/components/media/MediaManager'
import { FormAlert } from '@/components/forms/FormParts'
import type { MediaItem } from '@/lib/media-actions'

export const metadata = { title: 'Product' }

export default async function AdminProductPage({ params, searchParams }: { params: { id: string }; searchParams: { created?: string } }) {
  requireAdminPage()
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
          <Panel title="Photos">
            <MediaManager entityType="product" entityId={p.id} initial={(media ?? []) as MediaItem[]} label="Add product photos" hint="Square photos on a white background work best." />
          </Panel>
          <ProductForm
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
