import 'server-only'
// Supplier offers (admin): the one way a price is saved, used by "Add price" (Phase 2) and by "Enter reply" on a
// quote (Phase 3). A new price for an item the partner already has a current price for replaces it: the database
// marks the old one "superseded" in the same statement (migration 0035), so history is kept.
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, audit } from '@/lib/admin/guard'
import { addDays, defaultValidityDays, itemKey } from './offers'

export const OFFER_RACE = 'Someone saved a price for the same item at the same moment. Reload the page to see it, then try again if needed.'

export interface OfferValues {
  branch_id?: string
  product_id?: string
  category_id?: string
  item_name?: string
  unit: string
  pack_size?: number
  price_cents: number
  price_date: string
  valid_until?: string
  min_order_qty?: number
  delivery_area_ids: string[]
  delivery_charge_cents?: number
  delivery_note?: string
  lead_time_days?: number
  vat_included: string
  fx_linked: boolean
  source: string
  source_note?: string
  confidence?: string
  evidence_paths: string[]
}

/** The partner's organisation name, or null when it has no supply partner record. */
export async function partnerName(orgId: string): Promise<string | null> {
  const db = getAdminSupabase()
  const [{ data: partner }, { data: org }] = await Promise.all([
    db.from('supply_partners').select('org_id').eq('org_id', orgId).maybeSingle(),
    db.from('organisations').select('name').eq('id', orgId).maybeSingle(),
  ])
  return partner && org ? org.name : null
}

export async function categorySlugs(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map()
  const { data } = await getAdminSupabase().from('product_categories').select('id, slug').in('id', ids)
  return new Map((data ?? []).map((c) => [c.id, c.slug]))
}

/** Saves one price (already validated by the caller) and records it in the audit log. */
export async function saveOffer(orgId: string, d: OfferValues): Promise<{ ok: true; offerId: string; replaced: boolean } | { ok: false; error: string }> {
  const name = await partnerName(orgId)
  if (!name) return { ok: false, error: 'Create the supply partner record first.' }
  const db = getAdminSupabase()
  let itemName = d.item_name ?? null
  let categoryId = d.category_id ?? null
  if (d.product_id) {
    const { data: product } = await db.from('products').select('name, category_id').eq('id', d.product_id).maybeSingle()
    if (!product) return { ok: false, error: 'That catalogue product no longer exists.' }
    itemName = itemName ?? product.name
    categoryId = categoryId ?? product.category_id
  }
  if (!itemName || (!d.product_id && !categoryId)) return { ok: false, error: 'Pick a catalogue product, or choose a category and type the item name.' }
  const slug = categoryId ? (await categorySlugs([categoryId])).get(categoryId) : null
  const validUntil = d.valid_until ?? addDays(d.price_date, defaultValidityDays({ categorySlug: slug, itemName, fxLinked: d.fx_linked }))
  if (validUntil < d.price_date) return { ok: false, error: '“Valid until” cannot be before the price date.' }
  if (d.branch_id) {
    const { data: branch } = await db.from('org_branches').select('id').eq('id', d.branch_id).eq('org_id', orgId).maybeSingle()
    if (!branch) return { ok: false, error: 'That branch does not belong to this partner.' }
  }
  const key = itemKey(itemName)
  const { data: previous } = await db.from('supplier_offers').select('id, price_etb_cents').eq('org_id', orgId).eq('status', 'current').eq('item_key', key).eq('unit', d.unit).filter('branch_id', d.branch_id ? 'eq' : 'is', d.branch_id ?? null).maybeSingle()
  const { data: created, error } = await db
    .from('supplier_offers')
    .insert({
      org_id: orgId,
      branch_id: d.branch_id ?? null,
      product_id: d.product_id ?? null,
      category_id: categoryId,
      item_name: itemName,
      item_key: key,
      unit: d.unit,
      pack_size: d.pack_size ?? null,
      price_etb_cents: d.price_cents,
      price_date: d.price_date,
      valid_until: validUntil,
      min_order_qty: d.min_order_qty ?? null,
      delivery_area_ids: Array.from(new Set(d.delivery_area_ids)),
      delivery_charge_etb_cents: d.delivery_charge_cents ?? null,
      delivery_note: d.delivery_note ?? null,
      lead_time_days: d.lead_time_days ?? null,
      vat_included: d.vat_included,
      fx_linked: d.fx_linked,
      source: d.source,
      source_note: d.source_note ?? null,
      captured_by: (await adminActor()).slice(0, 120),
      confidence: d.confidence ?? null,
      evidence_paths: d.evidence_paths,
    })
    .select('id')
    .single()
  if (error?.code === '23505') return { ok: false, error: OFFER_RACE }
  if (error || !created) return { ok: false, error: 'Could not save the price.' }
  await audit('supply.offer.create', { type: 'organisation', id: orgId, label: name }, { offer: created.id, item: itemName, unit: d.unit, price_etb_cents: d.price_cents, valid_until: validUntil, source: d.source })
  if (previous) await audit('supply.offer.supersede', { type: 'organisation', id: orgId, label: name }, { offer: previous.id, superseded_by: created.id, from_cents: previous.price_etb_cents, to_cents: d.price_cents })
  return { ok: true, offerId: created.id, replaced: Boolean(previous) }
}
