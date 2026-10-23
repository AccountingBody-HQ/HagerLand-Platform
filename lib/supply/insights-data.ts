import 'server-only'
// Supply Phase 5 (admin): loads the data behind demand, price trends, partner performance, the supply report, the
// "needs action" list and the digest counts, and hands it to the pure maths in lib/supply/insights.ts. Owner-only
// money (commission, earned, customer totals) is loaded only when `owner` is true. Service role, server only.
import { getAdminSupabase } from '@/lib/supabase/admin'
import { addDays, itemKey } from './offers'
import { customerTotalCents, hagerlandEarned, needsAction, summariseLedger, supplierTotalCents, type LedgerSummary, type MoneyModel, type OrderStatus } from './money'
import { addisDate, inAddisMonth, todayInAddis } from './shortlist'
import {
  commissionOutstanding,
  demandByArea,
  demandFunnel,
  groupDemand,
  partnerPerformance,
  priceTrends,
  reconcile,
  reliability,
  unmetDemand,
  type DemandItem,
  type PartnerPerformance,
  type PriceTrend,
} from './insights'

const OPEN_QUOTE = ['submitted', 'in_review', 'quoted', 'accepted']
const LIVE_ORDER = ['placed', 'confirmed', 'out_for_delivery']

/* ------------------------------------------------------------------ Places ------------------------------------------------------------------ */

/** Each place with the places above it, nearest first (Bole → Addis Ababa → Ethiopia). */
async function placeChains(ids: string[]): Promise<Map<string, { id: string; name: string }[]>> {
  const db = getAdminSupabase()
  const known = new Map<string, { id: string; name: string; parent_id: string | null }>()
  let todo = Array.from(new Set(ids.filter(Boolean)))
  for (let depth = 0; todo.length && depth < 6; depth++) {
    const { data } = await db.from('locations').select('id, name, parent_id').in('id', todo)
    for (const l of data ?? []) known.set(l.id, l)
    todo = Array.from(new Set((data ?? []).map((l) => l.parent_id).filter((p): p is string => Boolean(p) && !known.has(p as string))))
  }
  const chains = new Map<string, { id: string; name: string }[]>()
  for (const id of ids) {
    const chain: { id: string; name: string }[] = []
    let next: string | null = id
    while (next && known.has(next) && chain.length < 8) {
      const l = known.get(next) as { id: string; name: string; parent_id: string | null }
      chain.push({ id: l.id, name: l.name })
      next = l.parent_id
    }
    chains.set(id, chain)
  }
  return chains
}

/* ------------------------------------------------------------- Partner performance ------------------------------------------------------------- */

export interface PartnerMoney {
  commissionDueCents: number
  commissionReceivedCents: number
  commissionOutstandingCents: number
  earnedCents: number
}

export interface PartnerPerformanceRow {
  orgId: string
  name: string
  status: string
  performance: PartnerPerformance
  reliability: { score: number; reason: string } | null
  /** Owner only. */
  money?: PartnerMoney
}

const lineTotal = (l: { unit_price_cents: number | null; quantity: number | string | null; delivery_charge_cents: number | null }) =>
  l.unit_price_cents === null || l.quantity === null ? null : Math.round(l.unit_price_cents * Number(l.quantity)) + (l.delivery_charge_cents ?? 0)

/** Track record per partner (all partners, or the ones given). */
export async function partnerPerformanceRows(opts: { orgIds?: string[]; owner: boolean }): Promise<PartnerPerformanceRow[]> {
  const db = getAdminSupabase()
  const today = todayInAddis()
  let partnersQ = db.from('supply_partners').select('org_id, relationship_status, reverify_by, org:organisations(name)').limit(5000)
  if (opts.orgIds) partnersQ = partnersQ.in('org_id', opts.orgIds.length ? opts.orgIds : ['00000000-0000-0000-0000-000000000000'])
  const { data: partners } = await partnersQ
  const orgIds = (partners ?? []).map((p) => p.org_id)
  if (!orgIds.length) return []
  const [{ data: lines }, { data: orders }, { data: offers }, { data: contacts }] = await Promise.all([
    db.from('supply_quote_lines').select('org_id, quote_item_id, status, asked_at, received_at, unit_price_cents, quantity, delivery_charge_cents').in('org_id', orgIds).limit(50000),
    db.from('supply_orders').select('id, org_id, status, money_model, placed_at, delivered_at, promised_delivery_on').in('org_id', orgIds).limit(20000),
    db.from('supplier_offers').select('org_id, price_date, valid_until, status').in('org_id', orgIds).eq('status', 'current').limit(50000),
    db.from('supply_contacts').select('org_id, last_contacted_at, created_at, do_not_contact').in('org_id', orgIds).limit(20000),
  ])
  const itemIds = Array.from(new Set((lines ?? []).map((l) => l.quote_item_id).filter((x): x is string => Boolean(x))))
  const orderIds = (orders ?? []).map((o) => o.id)
  const [{ data: replies }, { data: events }, { data: proofs }] = await Promise.all([
    itemIds.length ? db.from('supply_quote_lines').select('quote_item_id, unit_price_cents, quantity, delivery_charge_cents').in('quote_item_id', itemIds).not('received_at', 'is', null).limit(50000) : Promise.resolve({ data: [] }),
    orderIds.length ? db.from('supply_order_events').select('order_id, to_status, created_at').in('order_id', orderIds).eq('event_type', 'status').limit(50000) : Promise.resolve({ data: [] }),
    orderIds.length ? db.from('supply_delivery_proofs').select('order_id').in('order_id', orderIds).is('removed_at', null).limit(50000) : Promise.resolve({ data: [] }),
  ])
  const cheapest = new Map<string, number[]>()
  for (const r of replies ?? []) {
    const t = lineTotal(r)
    if (t !== null && r.quote_item_id) cheapest.set(r.quote_item_id, [...(cheapest.get(r.quote_item_id) ?? []), t])
  }
  const confirmedAt = new Map<string, string>()
  const disputed = new Set<string>()
  for (const e of events ?? []) {
    if (e.to_status === 'confirmed' && !confirmedAt.has(e.order_id)) confirmedAt.set(e.order_id, e.created_at)
    if (e.to_status === 'disputed') disputed.add(e.order_id)
  }
  const withProof = new Set((proofs ?? []).map((p) => p.order_id))

  let money: Map<string, PartnerMoney> | null = null
  if (opts.owner) {
    money = new Map()
    const { data: entries } = orderIds.length ? await db.from('supply_ledger_entries').select('id, entry_type, direction, amount_cents, reverses_entry_id, order_id, occurred_on').in('order_id', orderIds).limit(50000) : { data: [] }
    for (const orgId of orgIds) {
      const mine = (orders ?? []).filter((o) => o.org_id === orgId)
      let due = 0
      let received = 0
      let earned = 0
      for (const o of mine) {
        const s = summariseLedger((entries ?? []).filter((e) => e.order_id === o.id))
        due += s.commissionDue
        received += s.commissionReceived
        earned += hagerlandEarned(o.money_model as MoneyModel, s)
      }
      money.set(orgId, { commissionDueCents: due, commissionReceivedCents: received, commissionOutstandingCents: due - received, earnedCents: earned })
    }
  }

  return (partners ?? [])
    .map((p) => {
      const performance = partnerPerformance({
        lines: (lines ?? []).filter((l) => l.org_id === p.org_id).map((l) => ({ quoteItemId: l.quote_item_id, status: l.status, askedAt: l.asked_at, receivedAt: l.received_at, totalCents: lineTotal(l) })),
        cheapest,
        orders: (orders ?? [])
          .filter((o) => o.org_id === p.org_id)
          .map((o) => ({ status: o.status, placedAt: o.placed_at, confirmedAt: confirmedAt.get(o.id) ?? null, deliveredAt: o.delivered_at, promisedOn: o.promised_delivery_on, everDisputed: disputed.has(o.id), hasProof: withProof.has(o.id) })),
        offers: (offers ?? []).filter((o) => o.org_id === p.org_id).map((o) => ({ priceDate: o.price_date, validUntil: o.valid_until, status: o.status })),
        contacts: (contacts ?? []).filter((c) => c.org_id === p.org_id).map((c) => ({ lastContactedAt: c.last_contacted_at, createdAt: c.created_at, doNotContact: c.do_not_contact })),
        reverifyBy: p.reverify_by,
        today,
      })
      return {
        orgId: p.org_id,
        name: (p.org as { name: string } | null)?.name ?? '',
        status: p.relationship_status,
        performance,
        reliability: reliability(performance),
        ...(money ? { money: money.get(p.org_id) } : {}),
      }
    })
    .sort((a, b) => b.performance.asked - a.performance.asked || a.name.localeCompare(b.name))
}

/** Reliability per partner, for the quote shortlist. */
export async function reliabilityByPartner(): Promise<Map<string, { score: number; reason: string } | null>> {
  const rows = await partnerPerformanceRows({ owner: false })
  return new Map(rows.map((r) => [r.orgId, r.reliability]))
}

/* ------------------------------------------------------------------ Demand ------------------------------------------------------------------ */

export interface DemandData {
  groups: ReturnType<typeof groupDemand>
  areas: ReturnType<typeof demandByArea>
  funnel: ReturnType<typeof demandFunnel>
  unmet: ReturnType<typeof unmetDemand>
  quotes: number
  signals: { openJobs: { category: string; count: number }[]; projects: { area: string; count: number }[] }
}

async function demandItems(since: string, until: string | null, includeCancelled: boolean): Promise<{ items: DemandItem[]; quoteIds: string[] }> {
  const db = getAdminSupabase()
  let q = db.from('quote_requests').select('id, status, delivery_location_id').gte('created_at', since).limit(20000)
  if (until) q = q.lt('created_at', until)
  if (!includeCancelled) q = q.neq('status', 'cancelled')
  const { data: quotes } = await q
  const quoteIds = (quotes ?? []).map((x) => x.id)
  if (!quoteIds.length) return { items: [], quoteIds }
  const [{ data: rows }, chains] = await Promise.all([
    db.from('quote_request_items').select('id, quote_request_id, free_text_item, quantity, unit, category_id, removed_at, category:product_categories(name), product:products(name, category_id, category:product_categories(name))').in('quote_request_id', quoteIds).is('removed_at', null).limit(50000),
    placeChains((quotes ?? []).map((x) => x.delivery_location_id).filter((x): x is string => Boolean(x))),
  ])
  const location = new Map((quotes ?? []).map((x) => [x.id, x.delivery_location_id]))
  const items = (rows ?? []).map((r) => {
    const product = r.product as { name: string; category_id: string; category: { name: string } | null } | null
    const name = r.free_text_item ?? product?.name ?? ''
    const loc = location.get(r.quote_request_id)
    return {
      quoteId: r.quote_request_id,
      itemId: r.id,
      categoryId: r.category_id ?? product?.category_id ?? null,
      categoryName: (r.category as { name: string } | null)?.name ?? product?.category?.name ?? null,
      name,
      itemKey: itemKey(name),
      unit: r.unit,
      quantity: Number(r.quantity),
      places: loc ? (chains.get(loc) ?? []) : [],
    }
  })
  return { items, quoteIds }
}

export async function demandData(days: number, includeCancelled: boolean): Promise<DemandData> {
  const db = getAdminSupabase()
  const today = todayInAddis()
  // From the start of that day in Addis Ababa.
  const since = `${addDays(today, -days)}T00:00:00+03:00`
  const { items, quoteIds } = await demandItems(since, null, includeCancelled)
  const itemIds = items.map((i) => i.itemId)
  const [{ data: lines }, { data: offers }, { data: jobs }, { data: projects }] = await Promise.all([
    quoteIds.length ? db.from('supply_quote_lines').select('id, quote_item_id, status, asked_at, received_at').in('quote_request_id', quoteIds).limit(50000) : Promise.resolve({ data: [] }),
    db.from('supplier_offers').select('category_id, item_key, status, valid_until, delivery_area_ids').eq('status', 'current').limit(50000),
    db.from('job_posts').select('category').eq('status', 'published').limit(5000),
    db.from('build_projects').select('location_id, location_text, services, status').in('status', ['submitted', 'in_progress']).gte('created_at', since).limit(5000),
  ])
  const lineIds = (lines ?? []).map((l) => l.id)
  const { data: orderLines } = lineIds.length ? await db.from('supply_order_lines').select('supply_quote_line_id, quote_item_id, order:supply_orders!inner(status)').in('supply_quote_line_id', lineIds).neq('order.status', 'cancelled').limit(50000) : { data: [] }
  const ordered = new Set((orderLines ?? []).map((l) => l.quote_item_id).filter((x): x is string => Boolean(x)))
  const completed = new Set((orderLines ?? []).filter((l) => (l.order as { status: string } | null)?.status === 'completed').map((l) => l.quote_item_id).filter((x): x is string => Boolean(x)))
  const groups = groupDemand(items)
  const jobCounts = new Map<string, number>()
  for (const j of jobs ?? []) jobCounts.set(j.category, (jobCounts.get(j.category) ?? 0) + 1)
  const materialProjects = (projects ?? []).filter((p) => p.services.includes('materials'))
  const projectChains = await placeChains(materialProjects.map((p) => p.location_id).filter((x): x is string => Boolean(x)))
  const projectAreas = new Map<string, number>()
  for (const p of materialProjects) {
    const area = (p.location_id ? projectChains.get(p.location_id)?.[0]?.name : null) ?? p.location_text ?? 'No place given'
    projectAreas.set(area, (projectAreas.get(area) ?? 0) + 1)
  }
  return {
    groups,
    areas: demandByArea(items),
    funnel: demandFunnel(itemIds, (lines ?? []).filter((l) => l.quote_item_id).map((l) => ({ itemId: l.quote_item_id as string, status: l.status, askedAt: l.asked_at, receivedAt: l.received_at })), ordered, completed),
    unmet: unmetDemand(groups, (offers ?? []).map((o) => ({ categoryId: o.category_id, itemKey: o.item_key, status: o.status, validUntil: o.valid_until, deliveryAreaIds: o.delivery_area_ids })), today),
    quotes: quoteIds.length,
    signals: {
      openJobs: Array.from(jobCounts.entries()).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)),
      projects: Array.from(projectAreas.entries()).map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count || a.area.localeCompare(b.area)),
    },
  }
}

/* ---------------------------------------------------------------- Price trends ---------------------------------------------------------------- */

export async function priceTrendData(): Promise<PriceTrend[]> {
  const { data } = await getAdminSupabase()
    .from('supplier_offers')
    .select('org_id, item_name, item_key, unit, price_etb_cents, price_date, valid_until, status, captured_at, fx_linked, vat_included, category:product_categories(name), product:products(name)')
    .neq('status', 'withdrawn')
    .limit(50000)
  return priceTrends(
    (data ?? []).map((o) => ({
      orgId: o.org_id,
      categoryName: (o.category as { name: string } | null)?.name ?? null,
      name: o.item_name ?? (o.product as { name: string } | null)?.name ?? o.item_key,
      itemKey: o.item_key,
      unit: o.unit,
      priceCents: o.price_etb_cents,
      priceDate: o.price_date,
      validUntil: o.valid_until,
      status: o.status,
      capturedAt: o.captured_at,
      fxLinked: o.fx_linked,
      vatIncluded: o.vat_included,
    })),
    todayInAddis(),
  )
}

/* ---------------------------------------------------------------- Supply report ---------------------------------------------------------------- */

export interface SupplyReport {
  month: string
  quotesReceived: number
  quotesWithSupplierLines: number
  orders: { model: MoneyModel; created: number; completed: number; cancelled: number; disputed: number; valueCents: number }[]
  ledger: LedgerSummary
  earnedCents: number
  reconciliation: { earnedCents: number; ledgerNetCents: number; reconciles: boolean }
  ageing: { bucket: string; orders: number; cents: number }[]
  topItems: { name: string; unit: string; quantity: number; requests: number }[]
  topAreas: { area: string; requests: number }[]
  topPartners: { name: string; orders: number; supplierTotalCents: number }[]
}

/** Owner only: the month's supply figures. Money comes from lib/supply/money.ts; the ledger total is cross-checked. */
export async function supplyReport(month: string): Promise<SupplyReport> {
  const db = getAdminSupabase()
  const start = `${month}-01`
  const next = (() => {
    const d = new Date(`${start}T00:00:00Z`)
    d.setUTCMonth(d.getUTCMonth() + 1)
    return d.toISOString().slice(0, 10)
  })()
  const startTs = `${start}T00:00:00+03:00`
  const nextTs = `${next}T00:00:00+03:00`
  const monthEnd = addDays(next, -1)
  const asOf = monthEnd < todayInAddis() ? monthEnd : todayInAddis()
  const [{ items, quoteIds }, { data: orders }, { data: entries }, { data: allDue }] = await Promise.all([
    demandItems(startTs, nextTs, true),
    db.from('supply_orders').select('id, money_model, status, created_at, completed_at, cancelled_at, org_id, customer_delivery_charge_cents, supplier_delivery_charge_cents, org:organisations(name)').limit(20000),
    db.from('supply_ledger_entries').select('id, entry_type, direction, amount_cents, reverses_entry_id, order_id, occurred_on').gte('occurred_on', start).lt('occurred_on', next).limit(50000),
    db.from('supply_ledger_entries').select('id, entry_type, direction, amount_cents, reverses_entry_id, order_id, occurred_on').in('entry_type', ['commission_due', 'commission_received', 'reversal']).lte('occurred_on', asOf).limit(50000),
  ])
  const { data: withLines } = quoteIds.length ? await db.from('supply_quote_lines').select('quote_request_id').in('quote_request_id', quoteIds).limit(50000) : { data: [] }
  const all = orders ?? []
  const inMonth = (ts: string | null) => inAddisMonth(ts, month)
  const created = all.filter((o) => inMonth(o.created_at))
  const createdIds = created.map((o) => o.id)
  const [{ data: lines }, { data: disputes }] = await Promise.all([
    createdIds.length ? db.from('supply_order_lines').select('order_id, quantity, supplier_unit_price_cents, customer_unit_price_cents').in('order_id', createdIds).limit(50000) : Promise.resolve({ data: [] }),
    db.from('supply_order_events').select('order_id, created_at').eq('event_type', 'status').eq('to_status', 'disputed').gte('created_at', startTs).lt('created_at', nextTs).limit(20000),
  ])
  const moneyLines = (orderId: string) => (lines ?? []).filter((l) => l.order_id === orderId).map((l) => ({ quantity: Number(l.quantity), supplierUnitPriceCents: l.supplier_unit_price_cents, customerUnitPriceCents: l.customer_unit_price_cents }))
  const value = (o: (typeof created)[number]) => (o.money_model === 'A' ? (customerTotalCents(moneyLines(o.id), o.customer_delivery_charge_cents) ?? 0) : supplierTotalCents(moneyLines(o.id), o.supplier_delivery_charge_cents))
  const disputedIds = new Set((disputes ?? []).map((d) => d.order_id))
  const models = new Map(all.map((o) => [o.id, o.money_model as MoneyModel]))
  const ledgerRows = entries ?? []
  const ledger = summariseLedger(ledgerRows)
  const rec = reconcile(ledgerRows, models)
  const dueByOrder = new Map<string, NonNullable<typeof allDue>>()
  for (const e of allDue ?? []) if (e.order_id) dueByOrder.set(e.order_id, [...(dueByOrder.get(e.order_id) ?? []), e])
  const ageing = commissionOutstanding(Array.from(dueByOrder.entries()).map(([orderId, es]) => ({ orderId, model: models.get(orderId) ?? 'B', entries: es })), asOf)
  const buckets = ['0–30 days', '31–60 days', '61–90 days', 'Over 90 days'].map((bucket) => ({ bucket, orders: ageing.filter((a) => a.bucket === bucket).length, cents: ageing.filter((a) => a.bucket === bucket).reduce((s, a) => s + a.outstandingCents, 0) }))
  const partners = new Map<string, { name: string; orders: number; supplierTotalCents: number }>()
  for (const o of created) {
    const p = partners.get(o.org_id) ?? { name: (o.org as { name: string } | null)?.name ?? '', orders: 0, supplierTotalCents: 0 }
    p.orders++
    p.supplierTotalCents += supplierTotalCents(moneyLines(o.id), o.supplier_delivery_charge_cents)
    partners.set(o.org_id, p)
  }
  return {
    month,
    quotesReceived: quoteIds.length,
    quotesWithSupplierLines: new Set((withLines ?? []).map((l) => l.quote_request_id)).size,
    orders: (['A', 'B'] as MoneyModel[]).map((model) => ({
      model,
      created: created.filter((o) => o.money_model === model).length,
      completed: all.filter((o) => o.money_model === model && inMonth(o.completed_at)).length,
      cancelled: all.filter((o) => o.money_model === model && inMonth(o.cancelled_at)).length,
      disputed: all.filter((o) => o.money_model === model && disputedIds.has(o.id)).length,
      valueCents: created.filter((o) => o.money_model === model && o.status !== 'cancelled').reduce((s, o) => s + value(o), 0),
    })),
    ledger,
    earnedCents: rec.earnedCents,
    reconciliation: rec,
    ageing: buckets,
    topItems: groupDemand(items).slice(0, 10).map((g) => ({ name: g.name, unit: g.unit, quantity: g.quantity, requests: g.requests })),
    topAreas: demandByArea(items).slice(0, 10).map((a) => ({ area: a.area, requests: a.requests })),
    topPartners: Array.from(partners.values()).sort((a, b) => b.orders - a.orders || b.supplierTotalCents - a.supplierTotalCents || a.name.localeCompare(b.name)).slice(0, 10),
  }
}

/* --------------------------------------------------------------- Needs action --------------------------------------------------------------- */

export interface ActionItem {
  kind: 'agreement_overdue' | 'agreement_ending' | 'contact_due' | 'reverify_due' | 'price_expired' | 'delivery_overdue' | 'commission_overdue'
  text: string
  href: string
  /** For "Mark expired" on agreements past their end date (owner only). */
  agreementId?: string
  orgId?: string
}

/** Everything in supply that needs someone to act. Money items (agreements, commission) only for the owner. */
export async function supplyActionItems(owner: boolean): Promise<ActionItem[]> {
  const db = getAdminSupabase()
  const today = todayInAddis()
  const sixMonthsAgo = addDays(today, -182)
  const [{ data: contacts }, { data: partners }, { data: lateOrders }, { data: openLines }] = await Promise.all([
    db.from('supply_contacts').select('org_id, name, last_contacted_at, created_at, do_not_contact, org:organisations(name)').eq('do_not_contact', false).limit(20000),
    db.from('supply_partners').select('org_id, reverify_by, org:organisations(name)').lte('reverify_by', today).limit(5000),
    db.from('supply_orders').select('id, reference, promised_delivery_on, status, org:organisations(name)').in('status', LIVE_ORDER).lt('promised_delivery_on', today).limit(5000),
    db.from('supply_quote_lines').select('quote_request_id, org_id, status, offer:supplier_offers!inner(valid_until, item_name, status), quote:quote_requests!inner(reference, status)').in('status', ['shortlisted', 'asked', 'received', 'chosen']).in('quote.status', OPEN_QUOTE).lt('offer.valid_until', today).limit(5000),
  ])
  const items: ActionItem[] = []
  if (owner) {
    const [{ data: agreements }, { data: dues }] = await Promise.all([
      db.from('supply_agreements').select('id, org_id, end_date, org:organisations(name)').eq('status', 'active').not('end_date', 'is', null).lte('end_date', addDays(today, 30)).limit(5000),
      db.from('supply_ledger_entries').select('id, entry_type, direction, amount_cents, reverses_entry_id, order_id, occurred_on').in('entry_type', ['commission_due', 'commission_received', 'reversal']).not('order_id', 'is', null).limit(50000),
    ])
    for (const a of agreements ?? []) {
      const name = (a.org as { name: string } | null)?.name ?? ''
      const end = a.end_date as string
      if (end < today) items.push({ kind: 'agreement_overdue', text: `${name}: agreement ended ${end} but is still marked active`, href: `/roodber8/organisations/${a.org_id}`, agreementId: a.id, orgId: a.org_id })
      else items.push({ kind: 'agreement_ending', text: `${name}: agreement ends ${end}`, href: `/roodber8/organisations/${a.org_id}` })
    }
    const byOrder = new Map<string, NonNullable<typeof dues>>()
    for (const e of dues ?? []) if (e.order_id) byOrder.set(e.order_id, [...(byOrder.get(e.order_id) ?? []), e])
    const overdue = commissionOutstanding(Array.from(byOrder.entries()).map(([orderId, entries]) => ({ orderId, model: 'B' as MoneyModel, entries })), today).filter((c) => c.days > 30)
    if (overdue.length) {
      const { data: refs } = await db.from('supply_orders').select('id, reference').in('id', overdue.map((c) => c.orderId))
      for (const c of overdue) items.push({ kind: 'commission_overdue', text: `${refs?.find((r) => r.id === c.orderId)?.reference ?? 'Order'}: commission due for ${c.days} days`, href: `/roodber8/supply/orders/${c.orderId}` })
    }
  }
  for (const c of contacts ?? []) if (addisDate(c.last_contacted_at ?? c.created_at) < sixMonthsAgo) items.push({ kind: 'contact_due', text: `${(c.org as { name: string } | null)?.name ?? ''}: confirm ${c.name}’s details (not contacted for 6 months)`, href: `/roodber8/organisations/${c.org_id}#supply-partner` })
  for (const p of partners ?? []) items.push({ kind: 'reverify_due', text: `${(p.org as { name: string } | null)?.name ?? ''}: re-verify (due ${p.reverify_by})`, href: `/roodber8/organisations/${p.org_id}#supply-partner` })
  const seen = new Set<string>()
  for (const l of openLines ?? []) {
    const quote = l.quote as { reference: string } | null
    const offer = l.offer as { item_name: string | null; valid_until: string } | null
    const key = `${l.quote_request_id}|${l.org_id}|${offer?.item_name}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push({ kind: 'price_expired', text: `${quote?.reference}: the price used for “${offer?.item_name ?? 'an item'}” expired ${offer?.valid_until}`, href: `/roodber8/quotes/${l.quote_request_id}` })
  }
  for (const o of lateOrders ?? []) items.push({ kind: 'delivery_overdue', text: `${o.reference} (${(o.org as { name: string } | null)?.name ?? ''}): promised for ${o.promised_delivery_on}, not delivered yet`, href: `/roodber8/supply/orders/${o.id}` })
  return items
}

/* ------------------------------------------------------------------ Digest ------------------------------------------------------------------ */

/** Counts only, for the admin digest: no supplier names, prices or customer details. */
export async function supplyDigestCounts(now = Date.now()): Promise<[string, number][]> {
  const db = getAdminSupabase()
  const today = todayInAddis(new Date(now))
  const head = { count: 'exact' as const, head: true }
  const [{ data: openQuotes }, { data: orders }, overdue, unmet, actions] = await Promise.all([
    db.from('quote_requests').select('id').in('status', ['submitted', 'in_review']).limit(5000),
    db.from('supply_orders').select('id, status, status_changed_at').not('status', 'in', '("completed","cancelled","draft")').limit(5000),
    db.from('supply_orders').select('id', head).in('status', LIVE_ORDER).lt('promised_delivery_on', today),
    demandData(7, false).then((d) => d.unmet.length),
    supplyActionItems(true),
  ])
  const openIds = (openQuotes ?? []).map((q) => q.id)
  const { data: withLines } = openIds.length ? await db.from('supply_quote_lines').select('quote_request_id').in('quote_request_id', openIds).limit(20000) : { data: [] }
  const needingSuppliers = openIds.filter((id) => !(withLines ?? []).some((l) => l.quote_request_id === id)).length
  const ids = (orders ?? []).map((o) => o.id)
  const { data: proofs } = ids.length ? await db.from('supply_delivery_proofs').select('order_id').in('order_id', ids).is('removed_at', null) : { data: [] }
  const withProof = new Set((proofs ?? []).map((p) => p.order_id))
  const needAction = (orders ?? []).filter((o) => needsAction({ status: o.status as OrderStatus, statusChangedAt: o.status_changed_at, hasProof: withProof.has(o.id) }, now)).length
  return [
    ['Supplies: quotes with no supplier asked yet', needingSuppliers],
    ['Supplies: orders needing action', needAction],
    ['Supplies: deliveries past the promised date', overdue.count ?? 0],
    ['Supplies: requested items nobody can supply (7 days)', unmet],
    ['Supplies: agreements past their end date still active', actions.filter((a) => a.kind === 'agreement_overdue').length],
    ['Supplies: commission due for over 30 days', actions.filter((a) => a.kind === 'commission_overdue').length],
  ]
}
