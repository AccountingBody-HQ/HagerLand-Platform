import { readAll, readAllIn, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getProductCategories } from '@/lib/data/reference'
import { signedDocumentUrl } from '@/lib/storage'
import { formatETBCents } from '@/lib/format'
import { freshness, type Freshness } from '@/lib/supply/offers'
import { partnerOffers, today } from '@/lib/supply/offers-data'
import { AdminHeader, FilterBar, FilterField, Panel, StatusBadge, filterInput } from '@/components/admin/AdminUi'
import { OfferActions, OffersTable, type OfferView } from '@/components/admin/SupplierOffers'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Price list' }

const STATUS_FILTERS = ['current', 'superseded', 'withdrawn', 'all'] as const
const FRESHNESS_FILTERS: Freshness[] = ['fresh', 'ageing', 'expired']

export default async function PartnerOffersPage(props: { params: Promise<{ orgId: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ orgId }, sp] = await Promise.all([props.params, props.searchParams])
  await requireAdminPage()
  if (!/^[0-9a-f-]{36}$/.test(orgId)) notFound()
  const db = getAdminSupabase()
  const [{ data: org }, { data: partner }] = must(await Promise.all([
    db.from('organisations').select('id, name, status').eq('id', orgId).maybeSingle(),
    db.from('supply_partners').select('relationship_status').eq('org_id', orgId).maybeSingle(),
  ]))
  if (!org) notFound()
  const status = STATUS_FILTERS.find((s) => s === sp.status) ?? 'current'
  const fresh = FRESHNESS_FILTERS.find((f) => f === sp.freshness)
  const category = sp.category && /^[0-9a-f-]{36}$/.test(sp.category) ? sp.category : undefined

  const [offers, tree, { data: products }, { data: branches }] = must(await Promise.all([
    partnerOffers(orgId),
    getProductCategories(),
    readAll(() => db.from('products').select('id, name, category_id').eq('status', 'published').order('name'), { maxRows: REPORT_MAX_ROWS }),
    db.from('org_branches').select('id, name').eq('org_id', orgId).order('sort'),
  ]))
  const categories = tree.flatMap((c) => [{ id: c.id, name: c.name, slug: c.slug }, ...c.children.map((k) => ({ id: k.id, name: `${c.name} › ${k.name}`, slug: k.slug }))])
  const areaIds = Array.from(new Set(offers.flatMap((o) => o.delivery_area_ids)))
  const { data: areas } = await readAllIn(areaIds, (part) => db.from('locations').select('id, name').in('id', part), { maxRows: REPORT_MAX_ROWS })
  const areaName = new Map((areas ?? []).map((a) => [a.id, a.name]))
  const now = today()
  const groupKey = (o: (typeof offers)[number]) => `${o.branch_id ?? ''}|${o.item_key}|${o.unit}`
  const groups = new Map<string, typeof offers>()
  for (const o of offers) groups.set(groupKey(o), [...(groups.get(groupKey(o)) ?? []), o])

  const visible = offers.filter((o) => (status === 'all' || o.status === status) && (!category || o.category_id === category) && (!fresh || (o.status === 'current' && freshness(o.price_date, o.valid_until, now) === fresh)))
  const views: OfferView[] = await Promise.all(
    visible.map(async (o) => ({
      id: o.id,
      item: o.item_name ?? o.product_name ?? '',
      categoryName: o.category_name,
      unit: o.unit,
      packSize: o.pack_size,
      priceCents: o.price_etb_cents,
      priceDate: o.price_date,
      validUntil: o.valid_until,
      status: o.status,
      freshness: freshness(o.price_date, o.valid_until, now),
      delivery: [o.delivery_area_ids.length ? o.delivery_area_ids.map((id) => areaName.get(id) ?? '').filter(Boolean).join(', ') : null, o.delivery_charge_etb_cents !== null ? `${formatETBCents(o.delivery_charge_etb_cents)} delivery` : null, o.delivery_note].filter(Boolean).join(' · '),
      leadTimeDays: o.lead_time_days,
      source: o.source,
      confidence: o.confidence,
      evidence: await Promise.all(o.evidence_paths.map(async (p) => ({ url: await signedDocumentUrl(p) }))),
      updatedAt: o.updated_at,
      history: (groups.get(groupKey(o)) ?? []).filter((h) => h.id !== o.id).map((h) => ({ id: h.id, priceCents: h.price_etb_cents, priceDate: h.price_date, validUntil: h.valid_until, status: h.status })),
    })),
  )
  const currentCount = offers.filter((o) => o.status === 'current').length

  return (
    <div className="space-y-5">
      <AdminHeader
        title={`Price list: ${org.name}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Link href={`/roodber8/organisations/${org.id}#supply-partner`} prefetch={false} className="font-semibold text-green underline">
              Back to the business
            </Link>
            {partner && <StatusBadge status={partner.relationship_status} />}
            <span>Private to HagerLand: never shown on the site.</span>
          </span>
        }
      />
      {!partner ? (
        <Panel title="No supply partner record yet">
          <p className="text-small">
            Prices can only be added for a supply partner.{' '}
            <Link href={`/roodber8/organisations/${org.id}#supply-partner`} prefetch={false} className="font-semibold text-green underline">
              Open the business
            </Link>{' '}
            and click “Create supply partner record” first.
          </p>
        </Panel>
      ) : (
        <>
          <Panel title="Add prices">
            {offers.length === 0 && (
              <div className="mb-4 space-y-1 text-small">
                <p>An offer is one price this partner gives HagerLand for one item: for example “Dangote OPC 42.5 cement, 50 kg bag, ETB 1,250, valid until next Friday”. Prices are private and dated, so you always know how fresh they are.</p>
                <p>Add them one at a time with “Add price”, or copy a whole list (from a Telegram photo, a PDF or your notes) into “Paste a price list”. A new price for the same item replaces the old one, which stays in the history.</p>
              </div>
            )}
            <OfferActions orgId={org.id} categories={categories} products={(products ?? []).map((p) => ({ id: p.id, name: p.name, categoryId: p.category_id }))} branches={branches ?? []} />
          </Panel>
          <Panel title={`Prices (${currentCount} current)`}>
            <FilterBar action={`/roodber8/supply/partners/${org.id}/offers`}>
              <FilterField label="Status">
                <select name="status" defaultValue={status} className={filterInput}>
                  {STATUS_FILTERS.map((s) => (
                    <option key={s} value={s}>
                      {s === 'all' ? 'All, with history' : s}
                    </option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="Category">
                <select name="category" defaultValue={category ?? ''} className={filterInput}>
                  <option value="">All</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="Freshness">
                <select name="freshness" defaultValue={fresh ?? ''} className={filterInput}>
                  <option value="">Any</option>
                  <option value="fresh">Fresh</option>
                  <option value="ageing">Ageing</option>
                  <option value="expired">Expired</option>
                </select>
              </FilterField>
            </FilterBar>
            <p className="mb-2 text-small text-muted">Never quote a customer from an expired price: call the partner first.</p>
            <OffersTable orgId={org.id} offers={views} />
          </Panel>
        </>
      )}
    </div>
  )
}
