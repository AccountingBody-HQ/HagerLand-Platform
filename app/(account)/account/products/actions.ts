'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import type { Database } from '@/lib/database.types'
import { getServerSupabase } from '@/lib/supabase/server'
import { getActiveMembership, requireUser } from '@/lib/auth'
import { SELLER_KINDS, productSchema, type ProductInput } from '@/lib/validation/product'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { shortId, slugify } from '@/lib/slug'
import { revalidateEntity } from '@/lib/revalidate'
import { log } from '@/lib/log'
import { STALE_EDIT, isStaleEdit } from '@/lib/concurrency'
import { withUniqueRetry } from '@/lib/unique-retry'

type ProductUpdate = Database['public']['Tables']['products']['Update']

function columns(d: ProductInput): ProductUpdate {
  return {
    name: d.name,
    category_id: d.category_id,
    brand_id: d.brand_id ?? null,
    sku: d.sku ?? null,
    model_number: d.model_number ?? null,
    summary: d.summary ?? null,
    description: d.description ?? null,
    specs: d.specs as ProductUpdate['specs'],
    unit: d.unit,
    pack_size: d.pack_size ?? null,
    min_order_qty: d.min_order_qty ?? 1,
    price_type: d.price_type,
    price_etb_cents: d.price_type === 'on_request' || d.price_etb === undefined ? null : Math.round(d.price_etb * 100),
    trade_price_etb_cents: d.trade_price_etb === undefined ? null : Math.round(d.trade_price_etb * 100),
    stock_status: d.stock_status,
    lead_time_days: d.lead_time_days ?? null,
    country_of_origin: d.country_of_origin ?? null,
    warranty: d.warranty ?? null,
    delivery_available: d.delivery_available,
  }
}

/**
 * Suppliers add and edit their own products (spec 25.2c). New products are drafts until submitted;
 * edits to live products wait for review as pending changes, like properties.
 */
export async function saveOwnProductAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  await requireUser('/account/products')
  const active = await getActiveMembership()
  if (!active || !(SELLER_KINDS as readonly string[]).includes(active.org.kind)) return fail('Only supplier and manufacturer accounts can list products.')
  const parsed = productSchema.safeParse({ ...Object.fromEntries(formData), seller_org_id: active.org.id, new_brand: '' })
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  if (d.id && (await isStaleEdit('products', d.id, formData.get('expected_updated_at')))) return fail(STALE_EDIT)
  const supabase = getServerSupabase()
  const changes = columns(d)
  if (!d.id) {
    const { data, error } = await withUniqueRetry(() =>
      supabase
      .from('products')
      .insert({ ...changes, name: d.name, category_id: d.category_id, seller_org_id: active.org.id, slug: `${slugify(d.name, 70)}-${shortId(4)}`, status: 'draft' })
      .select('id')
      .single(),
    )
    if (error || !data) {
      log.error('products', 'owner create failed', error)
      return fail(error?.code === '23505' ? 'You already have a product with this SKU.' : 'We could not save the product. Please try again.')
    }
    redirect(`/account/products/${data.id}/edit?created=1`)
  }
  const { data: row } = await supabase.from('products').select('id, status, pending_changes').eq('id', d.id).maybeSingle()
  if (!row) return fail('Product not found.')
  if (row.status === 'removed') return fail('HagerLand removed this product. It cannot be changed.')
  if (row.status === 'published' || row.status === 'paused') {
    const { error } = await supabase.from('products').update({ pending_changes: { ...((row.pending_changes as Record<string, unknown>) ?? {}), ...changes } as ProductUpdate['pending_changes'] }).eq('id', d.id)
    if (error) return fail('We could not save your changes.')
    revalidatePath(`/account/products/${d.id}/edit`)
    return ok({ id: d.id }, 'Thanks. Your changes will appear once HagerLand has reviewed them.')
  }
  const { error } = await supabase.from('products').update(changes).eq('id', d.id)
  if (error) return fail(error.code === '23505' ? 'You already have a product with this SKU.' : 'We could not save your changes.')
  revalidatePath(`/account/products/${d.id}/edit`)
  return ok({ id: d.id }, 'Saved.')
}

/** Submit a draft for review, or pause / archive a product. */
export async function ownProductStatusAction(id: string, action: 'submit' | 'pause' | 'archive'): Promise<ActionResult<{ message: string }>> {
  await requireUser('/account/products')
  const parsed = z.object({ id: z.uuid(), action: z.enum(['submit', 'pause', 'archive']) }).safeParse({ id, action })
  if (!parsed.success) return fail('Invalid request.')
  const supabase = getServerSupabase()
  const from: Database['public']['Enums']['listing_status'][] = parsed.data.action === 'submit' ? ['draft', 'rejected', 'paused'] : parsed.data.action === 'pause' ? ['published'] : ['draft', 'pending_review', 'published', 'paused', 'rejected', 'expired']
  const status: Database['public']['Enums']['listing_status'] = parsed.data.action === 'submit' ? 'pending_review' : parsed.data.action === 'pause' ? 'paused' : 'archived'
  if (parsed.data.action === 'submit') {
    const { count } = await supabase.from('media').select('id', { count: 'exact', head: true }).eq('entity_type', 'product').eq('entity_id', parsed.data.id).eq('kind', 'image')
    if (!count) return fail('Add at least one photo before you submit the product.')
  }
  const { data, error } = await supabase.from('products').update({ status }).eq('id', parsed.data.id).in('status', from).select('id').maybeSingle()
  if (error || !data) return fail('This product cannot be changed right now.')
  revalidateEntity('product', parsed.data.id, ['/account/products', `/account/products/${parsed.data.id}/edit`])
  return ok({ message: status === 'pending_review' ? 'Sent to HagerLand for review.' : status === 'paused' ? 'Paused. It is hidden from HagerLand Supply.' : 'Archived.' })
}
