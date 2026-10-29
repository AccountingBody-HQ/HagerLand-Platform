import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { formatDate } from '@/lib/format'
import { customerStatusLabel } from '@/lib/supply/order-requests'
import { readSupplySwitches } from '@/lib/supply/partner-switches'
import { TRADE_TEXT, amountPlain } from '@/lib/supply/trade-prices'
import { approvedTradeAccount, loadTradeOrders, tradeOrderTotals } from '@/lib/supply/trade-prices-data'

export const metadata = { title: TRADE_TEXT.ordersHeading }

/**
 * S6-4: an approved trade customer's own order requests (only while trade pricing is on; "not found" otherwise). Amounts
 * only: never a partner, a cost or terms. Each reference opens the S6-2 order request page.
 */
export default async function TradeOrdersPage() {
  const user = await requireUser('/account/trade-orders')
  if (!(await readSupplySwitches()).tradePricing || !(await approvedTradeAccount(user.id))) notFound()
  const rows = await loadTradeOrders(user.id)
  const totals = tradeOrderTotals(rows)
  const [ref, date, status, total, paid] = TRADE_TEXT.ordersColumns
  const view = rows.map((r) => ({
    ...r,
    href: `/supplies/order-requests/${encodeURIComponent(r.reference)}`,
    date: formatDate(r.createdAt),
    label: customerStatusLabel({ status: r.status, reservedUntil: r.reservedUntil, totalCents: r.totalCents }),
  }))
  return (
    <div>
      <AccountPageHeader title={TRADE_TEXT.ordersHeading} />
      {rows.length === 0 ? (
        <p className="rounded-lg border border-border bg-white p-4 text-muted">{TRADE_TEXT.ordersEmpty}</p>
      ) : (
        <>
          {totals.waitingCents > 0 && <p className="mb-4 rounded-lg border border-gold/40 bg-gold-soft p-4 font-semibold tabular-nums">{TRADE_TEXT.waiting(totals.waitingCents)}</p>}
          <ul className="space-y-3 sm:hidden">
            {view.map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-white p-4 shadow-sm">
                <Link href={r.href} className="inline-flex min-h-11 items-center font-semibold tabular-nums text-green underline-offset-2 hover:underline">
                  {r.reference}
                </Link>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-small">
                  <dt className="text-muted">{date}</dt>
                  <dd>{r.date}</dd>
                  <dt className="text-muted">{status}</dt>
                  <dd>{r.label}</dd>
                  <dt className="text-muted">{total}</dt>
                  <dd className="tabular-nums">{amountPlain(r.totalCents)}</dd>
                  <dt className="text-muted">{paid}</dt>
                  <dd className="tabular-nums">{amountPlain(r.paidCents)}</dd>
                </dl>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-hidden rounded-lg border border-border bg-white sm:block">
            <table className="w-full text-left text-small">
              <thead className="bg-stone-50 text-muted">
                <tr>
                  {[ref, date, status, total, paid].map((h, i) => (
                    <th key={h} scope="col" className={`px-4 py-3 font-semibold ${i >= 3 ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <Link href={r.href} className="font-semibold tabular-nums text-green underline-offset-2 hover:underline">
                        {r.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{r.date}</td>
                    <td className="px-4 py-3">{r.label}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{amountPlain(r.totalCents)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{amountPlain(r.paidCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
