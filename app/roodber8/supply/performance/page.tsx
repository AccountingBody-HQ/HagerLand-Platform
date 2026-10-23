import Link from 'next/link'
import { isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { partnerPerformanceRows } from '@/lib/supply/insights-data'
import { NOT_ENOUGH, type Metric } from '@/lib/supply/insights'
import { formatEtbExact } from '@/lib/supply/shortlist'
import { AdminHeader, DataTable, Panel, StatusBadge } from '@/components/admin/AdminUi'

export const metadata = { title: 'Partner performance' }

const pct = (m: Metric) => (m.enough && m.value !== null ? `${Math.round(m.value * 100)}%` : NOT_ENOUGH)

/** How each supply partner performs: replies, prices, deliveries. Commission figures for the owner only. */
export default async function PartnerPerformancePage() {
  await requireAdminPage()
  const owner = await isOwnerSession()
  const rows = await partnerPerformanceRows({ owner })
  return (
    <div className="space-y-5">
      <AdminHeader title="Partner performance" description="How each supply partner replies, prices and delivers, worked out from quotes and orders. A figure needs at least 3 data points before it is shown." />
      {rows.length === 0 ? (
        <Panel title="No supply partners yet">
          <p className="text-small">Add partners under Supply partners. Once they are asked for prices and receive orders, their reply rate and on-time delivery will show here.</p>
        </Panel>
      ) : (
        <DataTable
          label="Partner performance"
          rows={rows}
          rowKey={(r) => r.orgId}
          columns={[
            {
              key: 'name',
              label: 'Partner',
              render: (r) => (
                <div>
                  <Link href={`/roodber8/organisations/${r.orgId}#supply-performance`} prefetch={false} className="font-semibold hover:underline">
                    {r.name}
                  </Link>
                  <p>
                    <StatusBadge status={r.status} />
                  </p>
                </div>
              ),
            },
            { key: 'rel', label: 'Reliability', render: (r) => (r.reliability ? `${r.reliability.score}/100` : 'No delivery history yet') },
            { key: 'asked', label: 'Asked', render: (r) => r.performance.asked },
            { key: 'reply', label: 'Reply rate', render: (r) => pct(r.performance.replyRate) },
            { key: 'cheap', label: 'Cheapest', render: (r) => pct(r.performance.cheapestRate) },
            { key: 'chosen', label: 'Chosen', render: (r) => r.performance.chosen },
            { key: 'orders', label: 'Orders', render: (r) => r.performance.orders },
            { key: 'ontime', label: 'On time', render: (r) => pct(r.performance.onTimeRate) },
            { key: 'problems', label: 'Problems', render: (r) => r.performance.disputes },
            { key: 'due', label: 'To do', render: (r) => [r.performance.contactsDue ? `${r.performance.contactsDue} contact${r.performance.contactsDue === 1 ? '' : 's'} to re-confirm` : null, r.performance.reverifyDue ? 'Re-verify' : null, r.performance.prices.expired ? `${r.performance.prices.expired} expired price${r.performance.prices.expired === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ') },
            ...(owner ? [{ key: 'owed', label: 'Commission owed', render: (r: (typeof rows)[number]) => (r.money ? formatEtbExact(r.money.commissionOutstandingCents) : '') }] : []),
          ]}
        />
      )}
    </div>
  )
}
