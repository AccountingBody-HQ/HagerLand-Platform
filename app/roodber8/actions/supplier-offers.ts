'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15). */
const AREA = '/roodber8/supply/partners'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { STALE_EDIT } from '@/lib/concurrency'
import { addDays, defaultValidityDays, itemKey, OFFER_SOURCES, parsePastedLines, parsePriceEtb, type PastedLine } from '@/lib/supply/offers'
import { CONFIDENCE_LEVELS } from '@/lib/supply/partners'
import { UNITS } from '@/lib/units'
import { today } from '@/lib/supply/offers-data'
import { categorySlugs, OFFER_RACE, partnerName, saveOffer } from '@/lib/supply/offer-write'

type Msg = ActionResult<{ message: string }>

const blank = (v: unknown) => (v === null || (typeof v === 'string' && v.trim() === '') ? undefined : v)
const optionalText = (max: number) => z.preprocess(blank, z.string().trim().max(max).optional())
const optionalNumber = (max: number) => z.preprocess((v) => (blank(v) === undefined ? undefined : Number(String(v).replace(/[,\s]/g, ''))), z.number().positive().max(max).optional())
const priceCents = (label: string, required: boolean) =>
  z.preprocess(
    (v) => (blank(v) === undefined ? undefined : parsePriceEtb(String(v)) ?? Number.NaN),
    required ? z.number({ error: `Enter the ${label} in birr, like 1250 or 1,250.50` }).int().positive() : z.number({ error: `Enter the ${label} in birr, like 150` }).int().positive().optional(),
  )
const evidencePath = (orgId: string) => z.string().max(300).regex(new RegExp(`^docs/supply/${orgId}/[0-9a-f-]{36}\\.[a-z0-9]{2,5}$`), 'Invalid file.')

/** Fields shared by a single offer and a pasted batch. */
function sharedSchema(orgId: string) {
  return z.object({
    branch_id: z.preprocess(blank, z.uuid().optional()),
    price_date: z.preprocess(blank, z.iso.date({ error: 'Enter the price date' })),
    valid_until: z.preprocess(blank, z.iso.date().optional()),
    min_order_qty: optionalNumber(1_000_000),
    delivery_area_ids: z.array(z.uuid()).max(50),
    delivery_charge_cents: z.preprocess((v) => (blank(v) === undefined ? undefined : /^0+(\.0+)?$/.test(String(v).trim()) ? 0 : parsePriceEtb(String(v)) ?? Number.NaN), z.number({ error: 'Enter the delivery charge in birr, like 150 (or 0 if free)' }).int().min(0).optional()),
    delivery_note: optionalText(500),
    lead_time_days: z.preprocess((v) => (blank(v) === undefined ? undefined : Number(v)), z.number().int().min(0).max(365).optional()),
    vat_included: z.enum(['yes', 'no', 'unknown']),
    fx_linked: z.boolean(),
    source: z.enum(OFFER_SOURCES.map((s) => s.value) as [string, ...string[]], { error: 'Say where this price came from' }),
    source_note: optionalText(500),
    confidence: z.preprocess(blank, z.enum(CONFIDENCE_LEVELS.map((c) => c.value) as [string, ...string[]]).optional()),
    evidence_paths: z.array(evidencePath(orgId)).max(10),
  })
}

function sharedFrom(fd: FormData) {
  return {
    branch_id: fd.get('branch_id'),
    price_date: fd.get('price_date'),
    valid_until: fd.get('valid_until'),
    min_order_qty: fd.get('min_order_qty'),
    delivery_area_ids: fd.getAll('delivery_area_ids'),
    delivery_charge_cents: fd.get('delivery_charge'),
    delivery_note: fd.get('delivery_note'),
    lead_time_days: fd.get('lead_time_days'),
    vat_included: fd.get('vat_included') ?? 'unknown',
    fx_linked: fd.get('fx_linked') === 'on',
    source: fd.get('source'),
    source_note: fd.get('source_note'),
    confidence: fd.get('confidence'),
    evidence_paths: fd.getAll('evidence_paths'),
  }
}

function refresh(orgId: string) {
  revalidatePath(`/roodber8/supply/partners/${orgId}/offers`)
  revalidatePath(`/roodber8/organisations/${orgId}`)
  revalidatePath('/roodber8/supply/partners')
  revalidatePath('/roodber8/supply/partners/expiring')
}

const offerSchema = (orgId: string) =>
  sharedSchema(orgId).extend({
    product_id: z.preprocess(blank, z.uuid().optional()),
    category_id: z.preprocess(blank, z.uuid().optional()),
    item_name: optionalText(200),
    unit: z.enum(UNITS.map((u) => u.value) as [string, ...string[]], { error: 'Choose a unit' }),
    pack_size: optionalNumber(1_000_000),
    price_cents: priceCents('price', true),
  })

/**
 * Adds one price. A price for an item the partner already has a current price for (same branch, item and unit)
 * replaces it: the database marks the old one "superseded" in the same statement, so history is kept.
 */
export async function createOfferAction(orgId: string, formData: FormData): Promise<Msg> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(orgId).success) return fail('Partner not found.')
  const parsed = offerSchema(orgId).safeParse({
    ...sharedFrom(formData),
    product_id: formData.get('product_id'),
    category_id: formData.get('category_id'),
    item_name: formData.get('item_name'),
    unit: formData.get('unit'),
    pack_size: formData.get('pack_size'),
    price_cents: formData.get('price'),
  })
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the fields.')
  const d = parsed.data
  if (d.price_cents === undefined) return fail('Enter the price in birr, like 1250 or 1,250.50')
  const saved = await saveOffer(orgId, { ...d, price_cents: d.price_cents })
  if (!saved.ok) return fail(saved.error)
  refresh(orgId)
  return ok({ message: saved.replaced ? 'New price saved. The previous price is kept in the history.' : 'Price saved.' })
}

/** A partner no longer sells an item: the current offer becomes "withdrawn" (kept in the history). */
export async function withdrawOfferAction(orgId: string, offerId: string, expectedUpdatedAt: string): Promise<Msg> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(orgId).success || !z.uuid().safeParse(offerId).success) return fail('Price not found.')
  const db = getAdminSupabase()
  const { data: offer } = await db.from('supplier_offers').select('status, updated_at, item_name, unit').eq('id', offerId).eq('org_id', orgId).maybeSingle()
  if (!offer) return fail('Price not found.')
  if (expectedUpdatedAt && new Date(offer.updated_at).getTime() !== new Date(expectedUpdatedAt).getTime()) return fail(STALE_EDIT)
  if (offer.status !== 'current') return fail('Only a current price can be withdrawn.')
  const { error } = await db.from('supplier_offers').update({ status: 'withdrawn' }).eq('id', offerId).eq('status', 'current')
  if (error) return fail('Could not withdraw the price.')
  await audit('supply.offer.withdraw', { type: 'organisation', id: orgId, label: await partnerName(orgId) }, { offer: offerId, item: offer.item_name, unit: offer.unit })
  refresh(orgId)
  return ok({ message: 'Marked as withdrawn. It stays in the history.' })
}

export interface PastePreviewRow extends PastedLine {
  /** An earlier price from this partner for the same item: its category is reused and the current price shown. */
  match: { categoryId: string | null; categoryName: string | null; currentCents: number | null } | null
  defaultValidUntil: string | null
}

async function preparePaste(orgId: string, text: string, priceDate: string, fxLinked: boolean, categories: Record<string, string>): Promise<PastePreviewRow[]> {
  const lines = parsePastedLines(text.slice(0, 50_000)).slice(0, 500)
  const keys = Array.from(new Set(lines.filter((l) => l.item).map((l) => itemKey(l.item))))
  const { data: earlier } = keys.length
    ? await getAdminSupabase().from('supplier_offers').select('item_key, unit, status, price_etb_cents, category_id, category:product_categories(name), captured_at').eq('org_id', orgId).in('item_key', keys).order('captured_at', { ascending: false }).limit(5000)
    : { data: [] }
  const chosen = Object.values(categories).filter((v) => z.uuid().safeParse(v).success)
  const slugs = await categorySlugs(Array.from(new Set([...chosen, ...(earlier ?? []).map((e) => e.category_id).filter((c): c is string => Boolean(c))])))
  const seen = new Set<string>()
  return lines.map((l) => {
    const key = itemKey(l.item)
    const errors = [...l.errors]
    if (l.unit && key) {
      if (seen.has(`${key}|${l.unit}`)) errors.push('The same item and unit appear twice in this list')
      seen.add(`${key}|${l.unit}`)
    }
    const sameItem = (earlier ?? []).filter((e) => e.item_key === key)
    const current = sameItem.find((e) => e.unit === l.unit && e.status === 'current')
    const past = sameItem.find((e) => e.category_id)
    const match = sameItem.length ? { categoryId: past?.category_id ?? null, categoryName: (past?.category as { name: string } | null)?.name ?? null, currentCents: current?.price_etb_cents ?? null } : null
    const categoryId = match?.categoryId ?? categories[String(l.line)] ?? null
    const slug = categoryId ? slugs.get(categoryId) : null
    return { ...l, errors, match, defaultValidUntil: priceDate ? addDays(priceDate, defaultValidityDays({ categorySlug: slug, itemName: l.item, fxLinked })) : null }
  })
}

/** Reads a pasted price list and shows what would be saved. Writes nothing. */
export async function previewPasteAction(orgId: string, text: string, priceDate: string, fxLinked: boolean): Promise<ActionResult<{ rows: PastePreviewRow[] }>> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(orgId).success || !z.string().max(50_000).safeParse(text).success) return fail('Partner not found.')
  if (!(await partnerName(orgId))) return fail('Create the supply partner record first.')
  const rows = await preparePaste(orgId, text, z.iso.date().safeParse(priceDate).success ? priceDate : today(), fxLinked, {})
  if (!rows.length) return fail('Paste at least one line: item, unit, price.')
  return ok({ rows })
}

/**
 * Saves a pasted price list in one go: every line or none. Lines with problems, or new items without a category,
 * stop the whole list so nothing is half-saved.
 */
export async function confirmPasteAction(orgId: string, text: string, categories: Record<string, string>, formData: FormData): Promise<Msg> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(orgId).success || !z.string().max(50_000).safeParse(text).success || !z.record(z.string(), z.string()).safeParse(categories).success) return fail('Partner not found.')
  const parsed = sharedSchema(orgId).safeParse(sharedFrom(formData))
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the shared details.')
  const name = await partnerName(orgId)
  if (!name) return fail('Create the supply partner record first.')
  const d = parsed.data
  if (d.valid_until && d.valid_until < d.price_date) return fail('“Valid until” cannot be before the price date.')
  if (d.branch_id) {
    const { data: branch } = await getAdminSupabase().from('org_branches').select('id').eq('id', d.branch_id).eq('org_id', orgId).maybeSingle()
    if (!branch) return fail('That branch does not belong to this partner.')
  }
  const rows = await preparePaste(orgId, text, d.price_date, d.fx_linked, categories)
  const problems = rows.flatMap((r) => [...r.errors, ...(r.match?.categoryId || categories[String(r.line)] ? [] : ['choose a category'])].map((e) => `Line ${r.line}: ${e}`))
  if (!rows.length) return fail('Paste at least one line: item, unit, price.')
  if (problems.length) return fail(`Nothing was saved. Fix these first: ${problems.slice(0, 5).join('; ')}${problems.length > 5 ? ` (and ${problems.length - 5} more)` : ''}.`)
  const actor = (await adminActor()).slice(0, 120)
  const superseded = rows.filter((r) => r.match?.currentCents !== null && r.match?.currentCents !== undefined).length
  // One insert statement: the database saves every row or none.
  const { error } = await getAdminSupabase()
    .from('supplier_offers')
    .insert(
      rows.map((r) => ({
        org_id: orgId,
        branch_id: d.branch_id ?? null,
        product_id: null,
        category_id: r.match?.categoryId ?? categories[String(r.line)],
        item_name: r.item,
        item_key: itemKey(r.item),
        unit: r.unit as string,
        pack_size: r.packSize,
        price_etb_cents: r.priceCents as number,
        price_date: d.price_date,
        valid_until: d.valid_until ?? (r.defaultValidUntil as string),
        min_order_qty: d.min_order_qty ?? null,
        delivery_area_ids: Array.from(new Set(d.delivery_area_ids)),
        delivery_charge_etb_cents: d.delivery_charge_cents ?? null,
        delivery_note: d.delivery_note ?? null,
        lead_time_days: d.lead_time_days ?? null,
        vat_included: d.vat_included,
        fx_linked: d.fx_linked,
        source: d.source,
        source_note: d.source_note ?? null,
        captured_by: actor,
        confidence: d.confidence ?? null,
        evidence_paths: d.evidence_paths,
      })),
    )
  if (error?.code === '23505') return fail(OFFER_RACE)
  if (error) return fail('Nothing was saved: the price list could not be stored. Please try again.')
  await audit('supply.offer.paste_import', { type: 'organisation', id: orgId, label: name }, { rows: rows.length, superseded })
  refresh(orgId)
  return ok({ message: `${rows.length === 1 ? '1 price' : `${rows.length} prices`} saved${superseded ? ` (${superseded} replaced an earlier price, kept in the history)` : ''}.` })
}
