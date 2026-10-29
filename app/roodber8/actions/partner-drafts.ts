'use server'

/** Admin area these actions belong to: owner and operations; approving and declining also call assertOwner(). */
const AREA = '/roodber8/supply/product-drafts'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, assertOwner, audit } from '@/lib/admin/guard'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { checkbox, decimalFromForm, intFromForm, optionalText, optionalUuid, textSchema } from '@/lib/validation/common'
import { UNITS } from '@/lib/units'
import { shortId, slugify } from '@/lib/slug'
import { publishPrivateImage } from '@/lib/storage'
import { percentToBps } from '@/lib/supply/money'
import { ownPhotoPaths, parseSpecLines, REVIEWABLE, type DraftStatus } from '@/lib/supply/partner-rules'
import { log } from '@/lib/log'

type Msg = ActionResult<{ message: string }>

function refresh(id: string) {
  revalidatePath('/roodber8/supply/product-drafts')
  revalidatePath(`/roodber8/supply/product-drafts/${id}`)
  revalidatePath('/partner', 'layout')
}

async function loadReviewable(id: string) {
  if (!z.uuid().safeParse(id).success) return null
  const { data } = await getAdminSupabase().from('partner_product_drafts').select('id, org_id, name, status, photo_paths, partner_sku').eq('id', id).maybeSingle()
  return data && REVIEWABLE.includes(data.status as DraftStatus) ? data : null
}

/** Operations or owner: send a draft back to the partner with a note (shown to the partner in their area). */
export async function requestDraftChangesAction(id: string, note: string): Promise<Msg> {
  await assertAdmin(AREA)
  const why = note.trim().slice(0, 2000)
  if (why.length < 3) return fail('Write what the partner should change (a few words).')
  const draft = await loadReviewable(id)
  if (!draft) return fail('This draft is not waiting for review.')
  const { data, error } = await getAdminSupabase()
    .from('partner_product_drafts')
    .update({ status: 'changes_requested', reviewer_note: why, status_changed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'submitted')
    .select('id')
    .maybeSingle()
  if (error || !data) return fail('Could not save. Reload the page.')
  await audit('supply.draft.changes', { type: 'partner_product_draft', id, label: draft.name })
  refresh(id)
  return ok({ message: 'Sent back to the partner with your note. No email was sent.' })
}

/** Owner: decline a draft (the partner sees "Not accepted" and the note). */
export async function rejectDraftAction(id: string, note: string): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const draft = await loadReviewable(id)
  if (!draft) return fail('This draft is not waiting for review.')
  const now = new Date().toISOString()
  const { data, error } = await getAdminSupabase()
    .from('partner_product_drafts')
    .update({ status: 'rejected', reviewer_note: note.trim().slice(0, 2000) || null, status_changed_at: now, decided_at: now })
    .eq('id', id)
    .eq('status', 'submitted')
    .select('id')
    .maybeSingle()
  if (error || !data) return fail('Could not save. Reload the page.')
  await audit('supply.draft.reject', { type: 'partner_product_draft', id, label: draft.name })
  refresh(id)
  return ok({ message: 'Draft declined. No email was sent.' })
}

const blank = (v: unknown) => (v === '' || v === null ? undefined : v)
const approveSchema = z.object({
  id: z.uuid(),
  existing_product: optionalText(80, 'Existing product'),
  name: textSchema(160, { min: 2, label: 'Name' }),
  category_id: optionalUuid,
  brand_name: optionalText(80, 'Brand'),
  unit: z.enum(UNITS.map((u) => u.value) as [string, ...string[]]),
  pack_size: optionalText(60, 'Pack size'),
  min_order_qty: decimalFromForm({ min: 0.01, max: 1_000_000 }),
  lead_time_days: intFromForm({ min: 0, max: 365 }),
  description: optionalText(8000, 'Description'),
  specs: optionalText(6000, 'Specifications'),
  copy_photos: checkbox,
  cost_price: decimalFromForm({ min: 0, max: 1_000_000_000 }),
  commission: z.preprocess(blank, z.string().max(10).optional()),
  markup: z.preprocess(blank, z.string().max(10).optional()),
  settlement_timing: z.preprocess(blank, z.enum(['after_delivery', 'upfront', 'credit']).optional()),
  credit_days: intFromForm({ min: 0, max: 365 }),
})

/**
 * Owner: accepts a partner's draft. Creates a HagerLand Supply product as a draft (price on request, no partner code,
 * optionally with the partner's photos re-encoded), or links an existing HagerLand Supply product, and records the
 * private source with its terms. Publishing stays the usual product step. Nothing is sent to anyone.
 */
export async function approveDraftAction(_prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const parsed = approveSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  const commissionBps = d.commission ? percentToBps(d.commission) : null
  if (d.commission && commissionBps === null) return fail('Please check the highlighted fields.', { commission: 'Enter the commission rate, like 5 or 2.5.' })
  const markupBps = d.markup ? percentToBps(d.markup) : null
  if (d.markup && markupBps === null) return fail('Please check the highlighted fields.', { markup: 'Enter the markup, like 10 or 12.5.' })
  const draft = await loadReviewable(d.id)
  if (!draft) return fail('This draft is not waiting for review.')
  const db = getAdminSupabase()
  const { data: seller } = await db.from('organisations').select('id').eq('slug', 'hagerland-supply').eq('is_hagerland', true).maybeSingle()
  if (!seller) return fail('The HagerLand Supply organisation was not found.')
  const actor = (await adminActor()).slice(0, 120)

  let productId: string
  let created = false
  if (d.existing_product) {
    const key = d.existing_product.trim()
    const { data: existing } = z.uuid().safeParse(key).success
      ? await db.from('products').select('id, seller_org_id').eq('id', key).maybeSingle()
      : await db.from('products').select('id, seller_org_id').eq('short_id', key).maybeSingle()
    if (!existing) return fail('Please check the highlighted fields.', { existing_product: 'No product with this ID.' })
    if (existing.seller_org_id !== seller.id) return fail('Please check the highlighted fields.', { existing_product: 'Only a HagerLand Supply product can be linked.' })
    productId = existing.id
  } else {
    if (!d.category_id) return fail('Please check the highlighted fields.', { category_id: 'Choose a category' })
    let brandId: string | null = null
    if (d.brand_name) {
      const slug = slugify(d.brand_name, 60)
      const { data: brand } = await db.from('brands').select('id').eq('slug', slug).maybeSingle()
      brandId = brand?.id ?? (await db.from('brands').insert({ name: d.brand_name, slug }).select('id').single()).data?.id ?? null
    }
    const { data: product, error } = await db
      .from('products')
      .insert({
        name: d.name,
        slug: `${slugify(d.name, 70)}-${shortId(4)}`,
        category_id: d.category_id,
        brand_id: brandId,
        seller_org_id: seller.id,
        description: d.description ?? null,
        specs: parseSpecLines(d.specs).filter((s) => s.value),
        unit: d.unit,
        pack_size: d.pack_size ?? null,
        min_order_qty: d.min_order_qty ?? 1,
        lead_time_days: d.lead_time_days ?? null,
        price_type: 'on_request',
        stock_status: 'available_on_request',
        status: 'draft',
      })
      .select('id')
      .single()
    if (error || !product) return fail('Could not create the product.')
    productId = product.id
    created = true
    await audit('product.create', { type: 'product', id: productId, label: d.name }, { from_partner_draft: draft.id })
  }

  const { data: primary } = await db.from('product_sources').select('id').eq('product_id', productId).eq('is_primary', true).maybeSingle()
  const { error: sourceError } = await db.from('product_sources').insert({
    product_id: productId,
    org_id: draft.org_id,
    draft_id: draft.id,
    partner_sku: draft.partner_sku,
    cost_price_cents: d.cost_price === undefined ? null : Math.round(d.cost_price * 100),
    commission_bps: commissionBps,
    markup_bps: markupBps,
    settlement_timing: d.settlement_timing ?? null,
    credit_days: d.credit_days ?? null,
    is_primary: !primary,
    created_by: actor,
  })
  if (sourceError) {
    log.error('partner-drafts', 'source insert failed', sourceError)
    return fail(sourceError.code === '23505' ? 'This partner is already a source of that product.' : created ? 'The product draft was created, but the source could not be saved. Open the draft again to retry with “Existing product”.' : 'Could not save the source.')
  }
  await audit('supply.source.create', { type: 'product', id: productId, label: d.name }, { partner: draft.org_id, draft: draft.id })

  let copied = 0
  if (created && d.copy_photos) {
    for (const path of ownPhotoPaths(draft.id, draft.photo_paths)) {
      try {
        const image = await publishPrivateImage(path, 'product', productId)
        const { error } = await db.from('media').insert({
          entity_type: 'product',
          entity_id: productId,
          kind: 'image',
          storage_path: image.storage_path,
          thumb_path: image.thumb_path,
          width: image.width,
          height: image.height,
          bytes: image.bytes,
          sort: copied,
          is_cover: copied === 0,
          status: 'approved',
        })
        if (!error) copied++
      } catch (err) {
        log.error('partner-drafts', 'photo copy failed', err)
      }
    }
  }

  const now = new Date().toISOString()
  const { error: doneError } = await db
    .from('partner_product_drafts')
    .update({ status: 'approved', product_id: productId, status_changed_at: now, decided_at: now })
    .eq('id', draft.id)
    .eq('status', 'submitted')
  if (doneError) return fail('The product and source were saved, but the draft could not be marked approved. Reload the page.')
  await audit('supply.draft.approve', { type: 'partner_product_draft', id: draft.id, label: d.name }, { product: productId, created, photos: copied })
  refresh(draft.id)
  revalidatePath('/roodber8/products')
  redirect(`/roodber8/products/${productId}`)
}
