import { notFound, redirect } from 'next/navigation'
import { isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { must } from '@/lib/admin/must'
import { readAll, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import { formatDate, formatETBCents, formatPhone } from '@/lib/format'
import { AdminHeader, DataTable, KeyValue, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { AddTradePriceForm, EndTradePriceStep } from '@/components/admin/TradePriceTools'
import { ButtonLink } from '@/components/ui/Button'
import { getProductCategories } from '@/lib/data/reference'
import { readSupplySwitches } from '@/lib/supply/partner-switches'
import { RULE_LABEL, discountLabel } from '@/lib/supply/trade-prices'
import { loadAgreements, previewPrices } from '@/lib/supply/trade-prices-data'
import { todayInAddis } from '@/lib/supply/shortlist'

export const metadata = { title: 'Trade account' }
export const dynamic = 'force-dynamic'

/**
 * S6-4 (owner only): one trade account and its trade prices. Operations, Agent and Content never see this page or the
 * prices (they show what HagerLand pays partners). Nothing here is sent to the customer.
 */
export default async function TradeAccountPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  await requireAdminPage()
  if (!(await isOwnerSession())) redirect('/roodber8?denied=1')
  const db = getAdminSupabase()
  const { data: account } = must(await db.from('trade_accounts').select('id, reference, user_id, business_name, trade_type, phone, tin, status, created_at, decided_at').eq('id', /^[0-9a-f-]{36}$/i.test(id) ? id : '00000000-0000-0000-0000-000000000000').maybeSingle())
  if (!account) notFound()
  const [agreements, categories, switches, { data: products }] = await Promise.all([
    loadAgreements(account.id),
    getProductCategories(),
    readSupplySwitches(),
    readAll(() => db.from('products').select('id, name, unit, seller:organisations!inner(is_hagerland)').eq('status', 'published').eq('seller.is_hagerland', true), { maxRows: REPORT_MAX_ROWS }),
  ])
  const approved = account.status === 'approved'
  const preview = approved ? await previewPrices(account.user_id, agreements) : []
  const productChoices = products.map((p) => ({ id: p.id, label: p.name })).sort((a, b) => a.label.localeCompare(b.label))
  const categoryChoices = categories.flatMap((c) => [{ id: c.id, label: c.name }, ...c.children.map((k) => ({ id: k.id, label: `${c.name} › ${k.name}` }))])
  return (
    <div className="max-w-5xl space-y-5">
      <AdminHeader
        title={account.business_name}
        description="Owner only. Trade prices for this customer: an agreed price for a product, or a price or discount for a category. Never below what HagerLand pays the partner."
        actions={
          <ButtonLink href="/roodber8/trade-accounts/prices/export" variant="secondary" size="sm" prefetch={false}>
            Trade prices CSV
          </ButtonLink>
        }
      />
      <Panel title="Account">
        <KeyValue
          items={[
            ['Reference', <span key="r" className="font-mono">{account.reference}</span>],
            ['Status', <StatusBadge key="s" status={account.status} />],
            ['Trade', account.trade_type],
            ['Phone', formatPhone(account.phone)],
            ['TIN', account.tin ?? ''],
            ['Applied', formatDate(account.created_at)],
          ]}
        />
      </Panel>
      <Panel title="Trade prices">
        <div className="space-y-5">
          {!switches.tradePricing && <p className="text-small text-muted">Trade pricing is off: customers do not see these prices yet, and reservations use the partner terms.</p>}
          <DataTable
            label="Trade prices"
            rows={agreements}
            rowKey={(a) => a.id}
            empty="No trade prices yet."
            columns={[
              { key: 'i', label: 'Item', render: (a) => (a.productId ? a.productName : `Category: ${a.categoryName ?? ''}`) },
              { key: 'p', label: 'Price', render: (a) => (a.priceCents !== null ? `${formatETBCents(a.priceCents)} per unit` : discountLabel(a.discountBps ?? 0)) },
              { key: 'd', label: 'Dates', render: (a) => `${formatDate(a.validFrom)} – ${a.validUntil ? formatDate(a.validUntil) : 'no end'}` },
              { key: 's', label: 'Status', render: (a) => (a.status === 'active' ? 'Active' : `Ended${a.endReason ? `: ${a.endReason}` : ''}`) },
              { key: 'n', label: 'Note', render: (a) => <span className="line-clamp-2 max-w-xs">{a.note ?? ''}</span> },
              { key: 'a', label: '', render: (a) => (a.status === 'active' ? <EndTradePriceStep id={a.id} updatedAt={a.updatedAt} /> : null) },
            ]}
          />
          {approved ? (
            <div className="space-y-2">
              <h3 className="font-semibold">Add a trade price</h3>
              <AddTradePriceForm accountId={account.id} products={productChoices} categories={categoryChoices} today={todayInAddis()} />
            </div>
          ) : (
            <p className="text-small text-muted">Trade prices can be added once the account is approved.</p>
          )}
        </div>
      </Panel>
      {approved && (
        <Panel title="Effective prices today">
          <DataTable
            label="Effective prices today"
            rows={preview}
            rowKey={(r) => r.productId}
            empty="No products covered yet."
            columns={[
              { key: 'p', label: 'Product', render: (r) => r.productName },
              { key: 'e', label: 'Trade price', render: (r) => (r.priceCents !== null ? formatETBCents(r.priceCents) : 'None') },
              { key: 'r', label: 'Rule', render: (r) => (r.rule ? RULE_LABEL[r.rule] : '') },
              { key: 's', label: 'Suggested price', render: (r) => (r.suggestedCents !== null ? formatETBCents(r.suggestedCents) : '') },
              { key: 'f', label: 'HagerLand pays the partner', render: (r) => (r.floorCents !== null ? formatETBCents(r.floorCents) : 'No partner yet') },
              {
                key: 'c',
                label: 'No-loss check',
                render: (r) => (r.floorCents === null ? 'No partner yet' : r.priceCents === null ? 'No trade price: the reservation uses the partner terms' : 'Pass: not below the partner payable'),
              },
            ]}
          />
        </Panel>
      )}
    </div>
  )
}
