import 'server-only'
// Supply Phase 3 (admin): everything the quote page needs to find suppliers for a customer's quote. Service role
// only; never used by a customer page, email or export.
import { readAll, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import { getAdminSupabase } from '@/lib/supabase/admin'
import type { Database } from '@/lib/database.types'
import { itemKey } from './offers'
import { shortlist, todayInAddis, type ItemShortlist, type ShortlistOffer, type ShortlistPartner } from './shortlist'
import { reliabilityByPartner } from './insights-data'

export type QuoteLineRow = Database['public']['Tables']['supply_quote_lines']['Row']

/** Quotes that are finished: their items and suppliers can be looked at but not changed. */
export const CLOSED_QUOTE_STATUSES = ['declined', 'expired', 'cancelled']

export interface QuoteItemView {
  id: string
  name: string
  productId: string | null
  productName: string | null
  productSku: string | null
  productPrice: { price_type: string; price_etb_cents: number | null; unit: string } | null
  categoryId: string | null
  quantity: number
  unit: string
  notes: string | null
  addedByAdmin: boolean
}

export interface PartnerContact {
  name: string
  phone: string | null
  whatsapp: string | null
  telegram: string | null
}

export interface QuoteSupplyData {
  items: QuoteItemView[]
  removedCount: number
  shortlists: ItemShortlist[]
  lines: QuoteLineRow[]
  partners: { orgId: string; name: string; status: string; doNotContact: boolean; contact: PartnerContact | null }[]
  /** Latest current price per partner and item (for "difference from the price list"). */
  offerPrices: Record<string, number>
  categories: { id: string; name: string }[]
  place: string | null
  today: string
}

/** The delivery place and every place above it, nearest first (Bole → Addis Ababa → Ethiopia). */
async function placeChain(locationId: string | null): Promise<{ ids: string[]; names: Record<string, string> }> {
  const ids: string[] = []
  const names: Record<string, string> = {}
  let next = locationId
  const db = getAdminSupabase()
  for (let depth = 0; next && depth < 8; depth++) {
    const { data } = await db.from('locations').select('id, name, parent_id').eq('id', next).maybeSingle()
    if (!data) break
    ids.push(data.id)
    names[data.id] = data.name
    next = data.parent_id
  }
  return { ids, names }
}

export async function quoteSupplyData(quote: { id: string; delivery_location_id: string | null; needed_by: string | null }): Promise<QuoteSupplyData> {
  const db = getAdminSupabase()
  const [{ data: rawItems }, { data: lines }, { data: partnerRows }, { data: offers }, { data: contacts }, { data: cats }, chain, reliabilities] = await Promise.all([
    db.from('quote_request_items').select('id, free_text_item, quantity, unit, notes, category_id, added_by_admin, removed_at, product:products(id, name, sku, unit, price_type, price_etb_cents, category_id)').eq('quote_request_id', quote.id).order('created_at'),
    db.from('supply_quote_lines').select('*').eq('quote_request_id', quote.id).order('created_at'),
    readAll(() => db.from('supply_partners').select('org_id, relationship_status, org:organisations(name)'), { maxRows: REPORT_MAX_ROWS, key: 'org_id' }),
    readAll(() => db.from('supplier_offers').select('id, org_id, branch_id, product_id, category_id, item_key, unit, pack_size, price_etb_cents, price_date, valid_until, min_order_qty, delivery_area_ids, delivery_charge_etb_cents, lead_time_days, vat_included, fx_linked, status').neq('status', 'superseded'), { maxRows: REPORT_MAX_ROWS }),
    readAll(() => db.from('supply_contacts').select('org_id, name, phone, phone_normalised, whatsapp, telegram, do_not_contact, preferred_channel, created_at').order('created_at'), { maxRows: REPORT_MAX_ROWS }),
    db.from('product_categories').select('id, name, parent_id, sort').order('sort').limit(500),
    placeChain(quote.delivery_location_id),
    reliabilityByPartner(),
  ])
  const all = (rawItems ?? []).map((r) => {
    const product = r.product as { id: string; name: string; sku: string | null; unit: string; price_type: string; price_etb_cents: number | null; category_id: string } | null
    return {
      removed: Boolean(r.removed_at),
      view: {
        id: r.id,
        name: r.free_text_item ?? product?.name ?? '',
        productId: product?.id ?? null,
        productName: product?.name ?? null,
        productSku: product?.sku ?? null,
        productPrice: product ? { price_type: product.price_type, price_etb_cents: product.price_etb_cents, unit: product.unit } : null,
        categoryId: r.category_id ?? product?.category_id ?? null,
        quantity: Number(r.quantity),
        unit: r.unit,
        notes: r.notes,
        addedByAdmin: r.added_by_admin,
      } satisfies QuoteItemView,
    }
  })
  const items = all.filter((i) => !i.removed).map((i) => i.view)

  const byOrg = new Map<string, NonNullable<typeof contacts>>()
  for (const c of contacts ?? []) byOrg.set(c.org_id, [...(byOrg.get(c.org_id) ?? []), c])
  const partners = (partnerRows ?? []).map((p) => {
    const people = byOrg.get(p.org_id) ?? []
    const reachable = people.filter((c) => !c.do_not_contact)
    const best = reachable.find((c) => c.preferred_channel) ?? reachable[0]
    return {
      orgId: p.org_id,
      name: (p.org as { name: string } | null)?.name ?? '',
      status: p.relationship_status,
      doNotContact: p.relationship_status === 'do_not_contact' || (people.length > 0 && reachable.length === 0),
      contact: best ? { name: best.name, phone: best.phone_normalised ?? best.phone, whatsapp: best.whatsapp, telegram: best.telegram } : null,
    }
  })

  const today = todayInAddis()
  const shortlistOffers: ShortlistOffer[] = (offers ?? []).map((o) => ({
    id: o.id,
    orgId: o.org_id,
    branchId: o.branch_id,
    productId: o.product_id,
    categoryId: o.category_id,
    itemKey: o.item_key,
    unit: o.unit,
    packSize: o.pack_size === null ? null : Number(o.pack_size),
    priceCents: o.price_etb_cents,
    priceDate: o.price_date,
    validUntil: o.valid_until,
    minOrderQty: o.min_order_qty === null ? null : Number(o.min_order_qty),
    deliveryAreaIds: o.delivery_area_ids,
    deliveryChargeCents: o.delivery_charge_etb_cents,
    leadTimeDays: o.lead_time_days,
    vatIncluded: o.vat_included,
    fxLinked: o.fx_linked,
    status: o.status,
  }))
  const shortlistPartners: ShortlistPartner[] = partners.map((p) => ({ orgId: p.orgId, name: p.name, status: p.status, doNotContact: p.doNotContact, reliability: reliabilities.get(p.orgId) ?? null }))
  const shortlists = shortlist({
    items: items.map((i) => ({ id: i.id, name: i.name, itemKey: itemKey(i.name), productId: i.productId, categoryId: i.categoryId, quantity: i.quantity, unit: i.unit })),
    partners: shortlistPartners,
    offers: shortlistOffers,
    locationIds: chain.ids,
    locationNames: chain.names,
    today,
    neededBy: quote.needed_by,
  })

  const offerPrices: Record<string, number> = {}
  for (const item of items) {
    const key = itemKey(item.name)
    for (const o of shortlistOffers) if (o.status === 'current' && (o.itemKey === key || (item.productId && o.productId === item.productId))) offerPrices[`${o.orgId}|${item.id}`] = o.priceCents
  }

  const parents = new Map((cats ?? []).filter((c) => !c.parent_id).map((c) => [c.id, c.name]))
  const categories = (cats ?? []).map((c) => ({ id: c.id, name: c.parent_id ? `${parents.get(c.parent_id) ?? ''} › ${c.name}` : c.name })).sort((a, b) => a.name.localeCompare(b.name))
  return { items, removedCount: all.length - items.length, shortlists, lines: lines ?? [], partners, offerPrices, categories, place: chain.ids.length ? chain.names[chain.ids[0]] : null, today }
}
