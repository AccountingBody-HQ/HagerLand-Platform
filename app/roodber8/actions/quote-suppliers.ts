'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15): owner and operations. */
const AREA = '/roodber8/supply/partners'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { parsePriceEtb } from '@/lib/supply/offers'
import { saveOffer } from '@/lib/supply/offer-write'
import { CLOSED_QUOTE_STATUSES } from '@/lib/supply/quote-supply-data'
import { todayInAddis } from '@/lib/supply/shortlist'
import { UNITS } from '@/lib/units'

type Msg = ActionResult<{ message: string }>

const units = UNITS.map((u) => u.value) as [string, ...string[]]
const blank = (v: unknown) => (v === null || (typeof v === 'string' && v.trim() === '') ? undefined : v)
const cents = (label: string) => z.preprocess((v) => (blank(v) === undefined ? undefined : parsePriceEtb(String(v)) ?? Number.NaN), z.number({ error: `Enter the ${label} in birr, like 1250 or 1,250.50` }).int().positive().optional())
/** Like cents, but 0 is fine (free delivery). */
const chargeCents = (label: string) =>
  z.preprocess((v) => (blank(v) === undefined ? undefined : /^0+(\.0+)?$/.test(String(v).trim()) ? 0 : parsePriceEtb(String(v)) ?? Number.NaN), z.number({ error: `Enter the ${label} in birr, like 500 (or 0 if free)` }).int().min(0).optional())

/** The quote, if it exists and is still open (finished quotes are read-only). */
async function openQuote(quoteId: string): Promise<{ ok: true; reference: string; locationId: string | null } | { ok: false; error: string }> {
  if (!z.uuid().safeParse(quoteId).success) return { ok: false, error: 'Quote not found.' }
  const { data } = await getAdminSupabase().from('quote_requests').select('reference, status, delivery_location_id').eq('id', quoteId).maybeSingle()
  if (!data) return { ok: false, error: 'Quote not found.' }
  if (CLOSED_QUOTE_STATUSES.includes(data.status)) return { ok: false, error: `This quote is ${data.status}: its items and suppliers can no longer be changed.` }
  return { ok: true, reference: data.reference, locationId: data.delivery_location_id }
}

function refresh(quoteId: string) {
  revalidatePath(`/roodber8/quotes/${quoteId}`)
}

const itemSchema = z.object({
  name: z.string().trim().min(1, 'Type the item name').max(300),
  categoryId: z.preprocess(blank, z.uuid().optional()),
  quantity: z.preprocess((v) => (blank(v) === undefined ? undefined : Number(String(v).replace(/[,\s]/g, ''))), z.number({ error: 'Enter the quantity' }).positive('Enter the quantity').max(1_000_000)),
  unit: z.enum(units, { error: 'Choose a unit' }),
  note: z.preprocess(blank, z.string().trim().max(500).optional()),
})
export type QuoteItemInput = z.input<typeof itemSchema>

/** Adds an item to a customer's quote (for example from their uploaded list). Customers never see these items. */
export async function addQuoteItemAction(quoteId: string, input: QuoteItemInput): Promise<Msg> {
  await assertAdmin(AREA)
  const quote = await openQuote(quoteId)
  if (!quote.ok) return fail(quote.error)
  const parsed = itemSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the item.')
  const d = parsed.data
  const { data, error } = await getAdminSupabase()
    .from('quote_request_items')
    .insert({ quote_request_id: quoteId, free_text_item: d.name, category_id: d.categoryId ?? null, quantity: d.quantity, unit: d.unit, notes: d.note ?? null, added_by_admin: true })
    .select('id')
    .single()
  if (error || !data) return fail('Could not add the item.')
  await audit('supply.quote.item_add', { type: 'quote', id: quoteId, label: quote.reference }, { item: data.id, name: d.name, quantity: d.quantity, unit: d.unit })
  refresh(quoteId)
  return ok({ message: 'Item added.' })
}

async function adminItem(quoteId: string, itemId: string) {
  if (!z.uuid().safeParse(itemId).success) return null
  const { data } = await getAdminSupabase().from('quote_request_items').select('id, free_text_item, quantity, unit, category_id, notes, added_by_admin, removed_at').eq('id', itemId).eq('quote_request_id', quoteId).maybeSingle()
  return data && data.added_by_admin && !data.removed_at ? data : null
}

export async function editQuoteItemAction(quoteId: string, itemId: string, input: QuoteItemInput): Promise<Msg> {
  await assertAdmin(AREA)
  const quote = await openQuote(quoteId)
  if (!quote.ok) return fail(quote.error)
  const before = await adminItem(quoteId, itemId)
  if (!before) return fail('Only items added by HagerLand can be changed here.')
  const parsed = itemSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the item.')
  const d = parsed.data
  const after = { free_text_item: d.name, category_id: d.categoryId ?? null, quantity: d.quantity, unit: d.unit, notes: d.note ?? null }
  const { error } = await getAdminSupabase().from('quote_request_items').update(after).eq('id', itemId)
  if (error) return fail('Could not save the item.')
  await audit('supply.quote.item_edit', { type: 'quote', id: quoteId, label: quote.reference }, { item: itemId, from: { name: before.free_text_item, quantity: Number(before.quantity), unit: before.unit }, to: { name: d.name, quantity: d.quantity, unit: d.unit } })
  refresh(quoteId)
  return ok({ message: 'Item saved.' })
}

/** Removes an item HagerLand added (kept in the database as removed). Not possible once a supplier is chosen for it. */
export async function removeQuoteItemAction(quoteId: string, itemId: string): Promise<Msg> {
  await assertAdmin(AREA)
  const quote = await openQuote(quoteId)
  if (!quote.ok) return fail(quote.error)
  const before = await adminItem(quoteId, itemId)
  if (!before) return fail('Only items added by HagerLand can be removed here.')
  const db = getAdminSupabase()
  const { data: chosen } = await db.from('supply_quote_lines').select('id').eq('quote_item_id', itemId).eq('status', 'chosen').limit(1)
  if (chosen?.length) return fail('A supplier is chosen for this item. Undo the choice first.')
  const { error } = await db.from('quote_request_items').update({ removed_at: new Date().toISOString(), removed_by: (await adminActor()).slice(0, 120) }).eq('id', itemId)
  if (error) return fail('Could not remove the item.')
  await audit('supply.quote.item_remove', { type: 'quote', id: quoteId, label: quote.reference }, { item: itemId, name: before.free_text_item })
  refresh(quoteId)
  return ok({ message: 'Item removed.' })
}

/** The item exists on this quote and is not removed. */
async function liveItem(quoteId: string, itemId: string) {
  if (!z.uuid().safeParse(itemId).success) return null
  const { data } = await getAdminSupabase().from('quote_request_items').select('id, free_text_item, quantity, unit, category_id, removed_at, product:products(name, category_id)').eq('id', itemId).eq('quote_request_id', quoteId).maybeSingle()
  return data && !data.removed_at ? data : null
}

/** A partner that may be asked: active or on trial, and not marked "do not contact" (partner or every contact). */
async function askable(orgId: string): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  if (!z.uuid().safeParse(orgId).success) return { ok: false, error: 'Supplier not found.' }
  const db = getAdminSupabase()
  const [{ data: partner }, { data: contacts }] = await Promise.all([
    db.from('supply_partners').select('relationship_status, org:organisations(name)').eq('org_id', orgId).maybeSingle(),
    db.from('supply_contacts').select('do_not_contact').eq('org_id', orgId),
  ])
  if (!partner) return { ok: false, error: 'Supplier not found.' }
  const name = (partner.org as { name: string } | null)?.name ?? ''
  if (partner.relationship_status === 'do_not_contact' || ((contacts ?? []).length > 0 && (contacts ?? []).every((c) => c.do_not_contact))) return { ok: false, error: `${name} asked not to be contacted.` }
  if (!['active', 'terms_agreed'].includes(partner.relationship_status)) return { ok: false, error: `${name} is not an active or trial partner.` }
  return { ok: true, name }
}

const manualSchema = z.object({ itemId: z.uuid(), orgId: z.uuid() })

/** Adds any active or trial partner to an item's list by hand ("Added by staff"). */
export async function addSupplierManuallyAction(quoteId: string, itemId: string, orgId: string): Promise<Msg> {
  await assertAdmin(AREA)
  const quote = await openQuote(quoteId)
  if (!quote.ok) return fail(quote.error)
  if (!manualSchema.safeParse({ itemId, orgId }).success) return fail('Choose a supplier.')
  const item = await liveItem(quoteId, itemId)
  if (!item) return fail('Item not found.')
  const partner = await askable(orgId)
  if (!partner.ok) return fail(partner.error)
  const { error } = await getAdminSupabase()
    .from('supply_quote_lines')
    .insert({ quote_request_id: quoteId, quote_item_id: itemId, org_id: orgId, status: 'shortlisted', unit: item.unit, quantity: Number(item.quantity), added_manually: true, reason: 'Added by staff', created_by: (await adminActor()).slice(0, 120) })
  if (error?.code === '23505') return fail(`${partner.name} is already listed for this item.`)
  if (error) return fail('Could not add the supplier.')
  await audit('supply.quote.shortlist', { type: 'quote', id: quoteId, label: quote.reference }, { item: itemId, org: orgId, manual: true })
  refresh(quoteId)
  return ok({ message: `${partner.name} added.` })
}

const askSchema = z.array(
  z.object({
    itemId: z.uuid(),
    orgId: z.uuid(),
    offerId: z.preprocess(blank, z.uuid().optional()),
    unit: z.enum(units).optional(),
    quantity: z.number().positive().max(10_000_000).optional(),
    reason: z.preprocess(blank, z.string().max(500).optional()),
  }),
).min(1, 'Tick at least one supplier.').max(200)
export type AskEntry = z.input<typeof askSchema>[number]

/**
 * Records that HagerLand asked these suppliers (by phone, WhatsApp or Telegram, outside the site). Nothing is sent
 * automatically. Suggested suppliers are added to the item's list at the same time.
 */
export async function markAskedAction(quoteId: string, entries: AskEntry[]): Promise<Msg> {
  await assertAdmin(AREA)
  const quote = await openQuote(quoteId)
  if (!quote.ok) return fail(quote.error)
  const parsed = askSchema.safeParse(entries)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Tick at least one supplier.')
  const db = getAdminSupabase()
  const actor = (await adminActor()).slice(0, 120)
  const now = new Date().toISOString()
  let asked = 0
  for (const e of parsed.data) {
    const item = await liveItem(quoteId, e.itemId)
    if (!item) return fail('One of the items no longer exists. Reload the page.')
    const partner = await askable(e.orgId)
    if (!partner.ok) return fail(partner.error)
    const { data: existing } = await db.from('supply_quote_lines').select('id, status').eq('quote_item_id', e.itemId).eq('org_id', e.orgId).maybeSingle()
    if (existing) {
      if (existing.status !== 'shortlisted') continue
      await db.from('supply_quote_lines').update({ status: 'asked', asked_at: now }).eq('id', existing.id)
    } else {
      const { error } = await db.from('supply_quote_lines').insert({
        quote_request_id: quoteId,
        quote_item_id: e.itemId,
        org_id: e.orgId,
        offer_id: e.offerId ?? null,
        status: 'asked',
        asked_at: now,
        unit: e.unit ?? item.unit,
        quantity: e.quantity ?? Number(item.quantity),
        reason: e.reason ?? null,
        created_by: actor,
      })
      if (error) return fail('Could not record that. Reload the page and try again.')
    }
    asked++
  }
  await audit('supply.quote.asked', { type: 'quote', id: quoteId, label: quote.reference }, { lines: asked })
  refresh(quoteId)
  return ok({ message: asked === 1 ? 'Marked 1 supplier as asked. Nothing was sent: contact them yourself.' : `Marked ${asked} suppliers as asked. Nothing was sent: contact them yourself.` })
}

const replySchema = z.object({
  unitPrice: cents('unit price'),
  quantity: z.preprocess((v) => (blank(v) === undefined ? undefined : Number(String(v).replace(/[,\s]/g, ''))), z.number({ error: 'Enter the quantity' }).positive('Enter the quantity').max(10_000_000)),
  deliveryCharge: chargeCents('delivery charge'),
  validUntil: z.preprocess(blank, z.iso.date().optional()),
  note: z.preprocess(blank, z.string().trim().max(1000).optional()),
  saveAsOffer: z.boolean(),
})
export type ReplyInput = z.input<typeof replySchema>

async function line(quoteId: string, lineId: string) {
  if (!z.uuid().safeParse(lineId).success) return null
  const { data } = await getAdminSupabase().from('supply_quote_lines').select('*').eq('id', lineId).eq('quote_request_id', quoteId).maybeSingle()
  return data
}

/** A supplier's reply. Optionally also saved as their current price (the Phase 2 price list, history kept). */
export async function enterReplyAction(quoteId: string, lineId: string, input: ReplyInput): Promise<Msg> {
  await assertAdmin(AREA)
  const quote = await openQuote(quoteId)
  if (!quote.ok) return fail(quote.error)
  const l = await line(quoteId, lineId)
  if (!l) return fail('Supplier line not found.')
  if (l.status === 'chosen') return fail('This supplier is chosen. Undo the choice before changing the reply.')
  const parsed = replySchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the reply.')
  const d = parsed.data
  if (d.unitPrice === undefined) return fail('Enter the unit price in birr, like 1250 or 1,250.50')
  const today = todayInAddis()
  if (d.validUntil && d.validUntil < today) return fail('“Valid until” is in the past.')
  const db = getAdminSupabase()
  let offerId = l.offer_id
  let savedOffer = false
  if (d.saveAsOffer && l.quote_item_id) {
    const item = await liveItem(quoteId, l.quote_item_id)
    if (!item) return fail('Item not found.')
    const product = item.product as { name: string; category_id: string } | null
    const { data: from } = l.offer_id ? await db.from('supplier_offers').select('delivery_area_ids, vat_included, fx_linked, pack_size, lead_time_days, min_order_qty, branch_id').eq('id', l.offer_id).maybeSingle() : { data: null }
    const saved = await saveOffer(l.org_id, {
      branch_id: from?.branch_id ?? undefined,
      category_id: item.category_id ?? product?.category_id,
      item_name: item.free_text_item ?? product?.name,
      unit: l.unit ?? item.unit,
      pack_size: from?.pack_size === null || from?.pack_size === undefined ? undefined : Number(from.pack_size),
      price_cents: d.unitPrice,
      price_date: today,
      valid_until: d.validUntil,
      min_order_qty: from?.min_order_qty === null || from?.min_order_qty === undefined ? undefined : Number(from.min_order_qty),
      // They quoted to deliver to this quote's place, so it is recorded as one of their delivery areas.
      delivery_area_ids: Array.from(new Set([...(from?.delivery_area_ids ?? []), ...(quote.locationId ? [quote.locationId] : [])])),
      delivery_charge_cents: d.deliveryCharge,
      lead_time_days: from?.lead_time_days ?? undefined,
      vat_included: from?.vat_included ?? 'unknown',
      fx_linked: from?.fx_linked ?? false,
      source: 'partner_submitted',
      source_note: `Reply to quote ${quote.reference}`,
      evidence_paths: [],
    })
    if (!saved.ok) return fail(`The reply was not saved: ${saved.error}`)
    offerId = saved.offerId
    savedOffer = true
  }
  const { error } = await db
    .from('supply_quote_lines')
    .update({ status: 'received', received_at: new Date().toISOString(), unit_price_cents: d.unitPrice, quantity: d.quantity, delivery_charge_cents: d.deliveryCharge ?? null, valid_until: d.validUntil ?? null, note: d.note ?? null, offer_id: offerId })
    .eq('id', lineId)
  if (error) return fail('Could not save the reply.')
  await audit('supply.quote.reply', { type: 'quote', id: quoteId, label: quote.reference }, { line: lineId, org: l.org_id, unit_price_cents: d.unitPrice, quantity: d.quantity, saved_as_price: savedOffer })
  refresh(quoteId)
  return ok({ message: savedOffer ? 'Reply saved, and saved as their current price.' : 'Reply saved.' })
}

/** Chooses this supplier for the item. Only one supplier can be chosen per item (the database enforces it). */
export async function chooseLineAction(quoteId: string, lineId: string): Promise<Msg> {
  await assertAdmin(AREA)
  const quote = await openQuote(quoteId)
  if (!quote.ok) return fail(quote.error)
  const l = await line(quoteId, lineId)
  if (!l) return fail('Supplier line not found.')
  if (l.status !== 'received') return fail('Enter the supplier’s reply before choosing them.')
  const { error } = await getAdminSupabase().from('supply_quote_lines').update({ status: 'chosen', chosen_at: new Date().toISOString() }).eq('id', lineId).eq('status', 'received')
  if (error?.code === '23505') return fail('Another supplier is already chosen for this item. Undo that choice first.')
  if (error) return fail('Could not choose this supplier.')
  await audit('supply.quote.choose', { type: 'quote', id: quoteId, label: quote.reference }, { line: lineId, org: l.org_id, item: l.quote_item_id })
  refresh(quoteId)
  return ok({ message: 'Supplier chosen for this item.' })
}

export async function undoChooseAction(quoteId: string, lineId: string): Promise<Msg> {
  await assertAdmin(AREA)
  const quote = await openQuote(quoteId)
  if (!quote.ok) return fail(quote.error)
  const l = await line(quoteId, lineId)
  if (!l || l.status !== 'chosen') return fail('This supplier is not chosen.')
  const { error } = await getAdminSupabase().from('supply_quote_lines').update({ status: 'received', chosen_at: null }).eq('id', lineId)
  if (error) return fail('Could not undo the choice.')
  await audit('supply.quote.unchoose', { type: 'quote', id: quoteId, label: quote.reference }, { line: lineId, org: l.org_id })
  refresh(quoteId)
  return ok({ message: 'Choice undone.' })
}

export async function rejectLineAction(quoteId: string, lineId: string, reason: string): Promise<Msg> {
  await assertAdmin(AREA)
  const quote = await openQuote(quoteId)
  if (!quote.ok) return fail(quote.error)
  const why = z.string().trim().min(3, 'Say why (a few words).').max(500).safeParse(reason)
  if (!why.success) return fail(why.error.issues[0]?.message ?? 'Say why.')
  const l = await line(quoteId, lineId)
  if (!l) return fail('Supplier line not found.')
  if (l.status === 'chosen') return fail('Undo the choice before rejecting this supplier.')
  if (l.status === 'rejected') return ok({ message: 'Already rejected.' })
  const { error } = await getAdminSupabase().from('supply_quote_lines').update({ status: 'rejected', note: `Rejected: ${why.data}` }).eq('id', lineId)
  if (error) return fail('Could not reject this supplier.')
  await audit('supply.quote.reject', { type: 'quote', id: quoteId, label: quote.reference }, { line: lineId, org: l.org_id, reason: why.data })
  refresh(quoteId)
  return ok({ message: 'Supplier rejected for this item.' })
}
