import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { priceTrendData } from '@/lib/supply/insights-data'
import { formatEtbExact } from '@/lib/supply/shortlist'
import { unitLabel } from '@/lib/units'
import { AdminHeader, DataTable, Panel } from '@/components/admin/AdminUi'
import { BarChart } from '@/components/admin/BarChart'

export const metadata = { title: 'Price trends' }

const change = (v: number | null) => (v === null ? 'No earlier price' : v === 0 ? 'No change' : `${v > 0 ? '+' : ''}${v}%`)

/** Partners' current prices per item and how they moved, from the price-list history. Private to HagerLand. */
export default async function PriceTrendsPage(props: { searchParams: Promise<{ item?: string }> }) {
  await requireAdminPage()
  const sp = await props.searchParams
  const trends = await priceTrendData()
  const selected = trends.find((t) => t.key === sp.item) ?? trends[0]
  return (
    <div className="space-y-5">
      <AdminHeader
        title="Price trends"
        description="Current prices from your partners for each item, and how they changed over 30 and 90 days. Withdrawn prices are left out. Private to HagerLand."
        actions={
          <Link href="/roodber8/supply/partners" prefetch={false} className="text-small font-semibold text-green underline">
            Back to Supply partners
          </Link>
        }
      />
      {trends.length === 0 ? (
        <Panel title="No prices yet">
          <p className="text-small">Once partners’ prices are added (Supply partners → a partner → Open price list), trends will show here.</p>
        </Panel>
      ) : (
        <>
          {selected && (
            <Panel title={`${selected.name}: middle price per ${unitLabel(selected.unit)}, last 6 months`}>
              <BarChart label={`Middle price of ${selected.name} per month`} data={selected.monthly.map((m) => ({ label: m.month.slice(5), value: m.medianCents === null ? 0 : Math.round(m.medianCents / 100) }))} empty="No prices in the last 6 months." />
              <p className="mt-2 text-caption text-muted">In ETB. Each bar is the middle of the prices partners had at the end of that month; empty months had no price.</p>
            </Panel>
          )}
          <Panel title="Items">
            <DataTable
              label="Price trends"
              rows={trends}
              rowKey={(t) => t.key}
              columns={[
                {
                  key: 'item',
                  label: 'Item',
                  render: (t) => (
                    <div>
                      <Link href={`/roodber8/supply/partners/prices?item=${encodeURIComponent(t.key)}`} prefetch={false} className="font-semibold hover:underline">
                        {t.name}
                      </Link>
                      <p className="text-caption text-muted">
                        {[t.categoryName, `per ${unitLabel(t.unit)}`].filter(Boolean).join(' · ')}
                      </p>
                      {(t.fxLinked || t.vatUnknown || t.expired > 0) && (
                        <p className="text-caption font-semibold text-gold-dark">{[t.fxLinked && 'Imported or foreign-currency price', t.vatUnknown && 'VAT not known', t.expired > 0 && `${t.expired} expired`].filter(Boolean).join(' · ')}</p>
                      )}
                    </div>
                  ),
                },
                { key: 'partners', label: 'Partners', render: (t) => t.partners },
                { key: 'low', label: 'Lowest', render: (t) => (t.lowestCents === null ? '' : formatEtbExact(t.lowestCents)) },
                { key: 'mid', label: 'Middle', render: (t) => (t.medianCents === null ? '' : formatEtbExact(t.medianCents)) },
                { key: 'high', label: 'Highest', render: (t) => (t.highestCents === null ? '' : formatEtbExact(t.highestCents)) },
                { key: 'c30', label: 'vs 30 days ago', render: (t) => change(t.change30) },
                { key: 'c90', label: 'vs 90 days ago', render: (t) => change(t.change90) },
              ]}
            />
          </Panel>
        </>
      )}
    </div>
  )
}
