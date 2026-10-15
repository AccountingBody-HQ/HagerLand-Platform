import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { ownerProductOptions } from '@/lib/data/owner-products'
import { parseSpecs } from '@/lib/data/products'
import { LISTING_STATUS_LABELS } from '@/lib/labels'
import { saveOwnProductAction } from '../../actions'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Layout'
import { FormAlert } from '@/components/forms/FormParts'
import { MediaManager } from '@/components/media/MediaManager'
import { ProductForm } from '@/components/supplies/ProductForm'
import { OwnProductActions } from '@/components/supplies/OwnProductActions'
import type { MediaItem } from '@/lib/media-actions'

export const metadata = { title: 'Edit product' }

export default async function EditProductPage(
  props: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }
) {
  const searchParams = await props.searchParams
  const params = await props.params
  await requireUser(`/account/products/${params.id}/edit`)
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound()
  const supabase = getServerSupabase()
  const { data: p } = await supabase.from('products').select('*').eq('id', params.id).maybeSingle()
  if (!p) notFound()
  const [{ data: media }, o] = await Promise.all([
    supabase.from('media').select('id, kind, storage_path, thumb_path, width, height, alt, sort, is_cover, status').eq('entity_type', 'product').eq('entity_id', p.id).order('sort'),
    ownerProductOptions(),
  ])
  const s = LISTING_STATUS_LABELS[p.status]
  const shown = { ...p, ...((p.pending_changes as Record<string, unknown> | null) ?? {}) } as typeof p
  return (
    <div className="space-y-6">
      <AccountPageHeader
        title={p.name}
        description={<Badge tone={s.tone}>{s.label}</Badge>}
        action={p.status === 'published' ? <ButtonLink href={`/supplies/product/${p.slug}`} variant="secondary">View on HagerLand Supply</ButtonLink> : undefined}
      />
      {searchParams.created && <FormAlert tone="success">Saved as a draft. Add photos, then submit it for review.</FormAlert>}
      {p.status === 'rejected' && p.rejection_reason && <FormAlert>{p.rejection_reason}</FormAlert>}
      {p.pending_changes && <FormAlert tone="info">Your latest changes are waiting for HagerLand&apos;s review. The live product is unchanged until then.</FormAlert>}
      <OwnProductActions id={p.id} status={p.status} />
      <Card className="p-5 sm:p-6">
        <h2 className="hl-h3 mb-3">Photos</h2>
        <MediaManager entityType="product" entityId={p.id} initial={(media ?? []) as MediaItem[]} label="Add product photos" hint="Square photos on a white background work best." />
      </Card>
      {p.status !== 'removed' && (
        <ProductForm
          action={saveOwnProductAction}
          defaults={{ ...shown, id: p.id, seller_org_id: p.seller_org_id, min_order_qty: Number(shown.min_order_qty), specs: parseSpecs(shown.specs) }}
          categories={o.categories}
          brands={o.brands}
          allowNewBrand={false}
        />
      )}
    </div>
  )
}
