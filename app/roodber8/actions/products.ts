'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/lib/database.types'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit, changedFields } from '@/lib/admin/guard'
import { productSchema, preparePriceRows, type PriceRow } from '@/lib/validation/product'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { shortId, slugify } from '@/lib/slug'
import { revalidateEntity } from '@/lib/revalidate'
import { parseCsv } from '@/lib/admin/csv'

type ProductUpdate = Database['public']['Tables']['products']['Update']

/** Create or edit a catalogue product. price_updated_at is set automatically when the price changes. */
export async function saveProductAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  assertAdmin()
  const parsed = productSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  const db = getAdminSupabase()
  let brandId = d.brand_id ?? null
  if (!brandId && d.new_brand) {
    const slug = slugify(d.new_brand, 60)
    const { data: existing } = await db.from('brands').select('id').eq('slug', slug).maybeSingle()
    brandId = existing?.id ?? (await db.from('brands').insert({ name: d.new_brand, slug }).select('id').single()).data?.id ?? null
  }
  const values: ProductUpdate = {
    name: d.name,
    category_id: d.category_id,
    brand_id: brandId,
    seller_org_id: d.seller_org_id,
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
    stock_status: d.stock_status,
    lead_time_days: d.lead_time_days ?? null,
    country_of_origin: d.country_of_origin ?? null,
    warranty: d.warranty ?? null,
    delivery_available: d.delivery_available,
  }
  if (!d.id) {
    const { data, error } = await db
      .from('products')
      .insert({ ...values, name: d.name, category_id: d.category_id, seller_org_id: d.seller_org_id, slug: `${slugify(d.name, 70)}-${shortId(4)}`, status: 'draft' })
      .select('id')
      .single()
    if (error || !data) return fail(error?.code === '23505' ? 'A product with this SKU already exists for this seller.' : 'Could not create the product.')
    await audit('product.create', { type: 'product', id: data.id, label: d.name })
    redirect(`/roodber8/products/${data.id}?created=1`)
  }
  const { data: before } = await db.from('products').select('*').eq('id', d.id).maybeSingle()
  if (!before) return fail('Not found.')
  const { error } = await db.from('products').update(values).eq('id', d.id)
  if (error) return fail(error.code === '23505' ? 'Another product already uses this SKU.' : 'Could not save.')
  await audit('product.edit', { type: 'product', id: d.id, label: d.name }, changedFields(before as Record<string, unknown>, values as Record<string, unknown>))
  revalidateEntity('product', d.id)
  revalidatePath(`/roodber8/products/${d.id}`)
  return ok({ id: d.id }, 'Saved.')
}

async function priceContext() {
  const { data } = await getAdminSupabase().from('products').select('id, sku, name').not('sku', 'is', null)
  return data ?? []
}

export async function previewPriceCsvAction(csv: string): Promise<ActionResult<{ rows: PriceRow[] }>> {
  assertAdmin()
  const rows = parseCsv(csv)
  if (rows.length === 0) return fail('No rows found. The header must include sku and price and/or stock_status.')
  if (rows.length > 5000) return fail('Update up to 5,000 rows at a time.')
  return ok({ rows: preparePriceRows(rows, await priceContext()) })
}

export async function applyPriceCsvAction(csv: string): Promise<ActionResult<{ message: string }>> {
  assertAdmin()
  const ready = preparePriceRows(parseCsv(csv), await priceContext()).filter((r) => r.errors.length === 0 && r.productId)
  if (ready.length === 0) return fail('No valid rows to apply.')
  const db = getAdminSupabase()
  let done = 0
  for (const r of ready) {
    const update: ProductUpdate = {}
    if (r.priceCents !== null) {
      update.price_etb_cents = r.priceCents
      update.price_type = 'fixed'
    }
    if (r.stock) update.stock_status = r.stock as ProductUpdate['stock_status']
    const { error } = await db.from('products').update(update).eq('id', r.productId as string)
    if (!error) done++
  }
  await audit('product.price_import', { type: 'product', label: `${done} rows` })
  revalidatePath('/roodber8/products')
  revalidatePath('/supplies', 'layout')
  return ok({ message: `Updated ${done} product${done === 1 ? '' : 's'}.` })
}
