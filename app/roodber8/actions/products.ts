'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15). */
const AREA = '/roodber8/products'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/lib/database.types'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { readAll, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import { assertAdmin, audit, changedFields } from '@/lib/admin/guard'
import { productSchema, preparePriceRows, type PriceRow } from '@/lib/validation/product'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { shortId, slugify } from '@/lib/slug'
import { revalidateEntity } from '@/lib/revalidate'
import { parseCsv } from '@/lib/admin/csv'
import { sendEmail } from '@/lib/email/send'
import { tradeDecisionEmail } from '@/lib/email/templates'
import { STALE_EDIT, isStaleEdit } from '@/lib/concurrency'

type ProductUpdate = Database['public']['Tables']['products']['Update']

/** Create or edit a catalogue product. price_updated_at is set automatically when the price changes. */
export async function saveProductAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  await assertAdmin(AREA)
  const parsed = productSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  if (d.id && (await isStaleEdit('products', d.id, formData.get('expected_updated_at')))) return fail(STALE_EDIT)
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
    trade_price_etb_cents: d.trade_price_etb === undefined ? null : Math.round(d.trade_price_etb * 100),
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
  const { data } = await readAll(() => getAdminSupabase().from('products').select('id, sku, name').not('sku', 'is', null), { maxRows: REPORT_MAX_ROWS })
  return data
}

export async function previewPriceCsvAction(csv: string): Promise<ActionResult<{ rows: PriceRow[] }>> {
  await assertAdmin(AREA)
  const rows = parseCsv(csv)
  if (rows.length === 0) return fail('No rows found. The header must include sku and price and/or stock_status.')
  if (rows.length > 5000) return fail('Update up to 5,000 rows at a time.')
  return ok({ rows: preparePriceRows(rows, await priceContext()) })
}

export async function applyPriceCsvAction(csv: string): Promise<ActionResult<{ message: string }>> {
  await assertAdmin(AREA)
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

const specialSchema = z
  .object({
    id: z.uuid(),
    is_special_buy: z.preprocess((v) => v === 'on' || v === 'true', z.boolean()),
    was_price_etb: z.preprocess((v) => (v === '' || v === null ? undefined : Number(v)), z.number().min(0).max(1_000_000_000).optional()),
    qty: z.preprocess((v) => (v === '' || v === null ? undefined : Number(v)), z.number().int().min(0).max(10_000_000).optional()),
    ends_on: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.iso.date().optional()),
  })
  .refine((d) => !d.is_special_buy || d.ends_on !== undefined, { message: 'Set an end date for the offer', path: ['ends_on'] })

/** Special Buys (spec 25.2d): HagerLand sets the was-price, quantity and end date; offers hide themselves when expired or sold out. */
export async function saveSpecialBuyAction(_prev: { ok: true; data: { message: string } } | { ok: false; error: string } | null, formData: FormData): Promise<{ ok: true; data: { message: string } } | { ok: false; error: string }> {
  await assertAdmin(AREA)
  const parsed = specialSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the offer.' }
  const d = parsed.data
  const db = getAdminSupabase()
  const { data: p } = await db.from('products').select('name, price_type, price_etb_cents').eq('id', d.id).maybeSingle()
  if (!p) return { ok: false, error: 'Not found.' }
  if (d.is_special_buy && (p.price_type === 'on_request' || p.price_etb_cents === null)) return { ok: false, error: 'A Special Buy needs a price. Set the product price first.' }
  if (d.is_special_buy && d.was_price_etb !== undefined && p.price_etb_cents !== null && Math.round(d.was_price_etb * 100) <= p.price_etb_cents) return { ok: false, error: 'The was-price must be higher than the current price.' }
  const values = d.is_special_buy
    ? { is_special_buy: true, special_was_price_etb_cents: d.was_price_etb === undefined ? null : Math.round(d.was_price_etb * 100), special_qty_available: d.qty ?? null, special_ends_at: d.ends_on ? new Date(`${d.ends_on}T23:59:59+03:00`).toISOString() : null }
    : { is_special_buy: false, special_was_price_etb_cents: null, special_qty_available: null, special_ends_at: null }
  const { error } = await db.from('products').update(values).eq('id', d.id)
  if (error) return { ok: false, error: 'Could not save the offer.' }
  await audit(d.is_special_buy ? 'product.special_buy' : 'product.special_buy_end', { type: 'product', id: d.id, label: p.name }, values)
  revalidateEntity('product', d.id, ['/supplies/special-buys'])
  return { ok: true, data: { message: d.is_special_buy ? 'Special Buy saved.' : 'Special Buy ended.' } }
}

/** Approve, reject or revoke a trade account (spec 25.2e). The applicant is emailed. */
export async function tradeDecisionAction(id: string, decision: 'approved' | 'rejected' | 'revoked', note?: string): Promise<{ ok: true; data: { message: string } } | { ok: false; error: string }> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(id).success || !['approved', 'rejected', 'revoked'].includes(decision)) return { ok: false, error: 'Invalid request.' }
  const db = getAdminSupabase()
  const { data, error } = await db.from('trade_accounts').update({ status: decision, admin_note: note?.trim().slice(0, 2000) || null, decided_at: new Date().toISOString() }).eq('id', id).select('user_id, business_name').single()
  if (error || !data) return { ok: false, error: 'Please try again.' }
  const { data: u } = await db.auth.admin.getUserById(data.user_id)
  const { data: profile } = await db.from('profiles').select('full_name').eq('id', data.user_id).maybeSingle()
  if (u.user?.email && decision !== 'revoked') await sendEmail({ to: u.user.email, from: 'supply', ...tradeDecisionEmail({ name: (profile?.full_name ?? '').split(' ')[0] || 'there', approved: decision === 'approved', note }) })
  await audit(`trade_account.${decision}`, { type: 'trade_account', id, label: data.business_name }, note ? { note } : null)
  revalidatePath('/roodber8/trade-accounts')
  return { ok: true, data: { message: decision === 'approved' ? 'Trade account approved.' : decision === 'rejected' ? 'Application rejected.' : 'Trade account closed.' } }
}
