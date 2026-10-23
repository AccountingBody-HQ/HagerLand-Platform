import type { Metric } from '@/lib/supply/insights'
import { NOT_ENOUGH } from '@/lib/supply/insights'
import type { PartnerPerformanceRow } from '@/lib/supply/insights-data'
import { formatEtbExact } from '@/lib/supply/shortlist'
import { KeyValue } from './AdminUi'

const percent = (m: Metric) => (m.enough && m.value !== null ? `${Math.round(m.value * 100)}% (of ${m.n})` : `${NOT_ENOUGH} (${m.n})`)
const hours = (m: Metric) => {
  if (!m.enough || m.value === null) return `${NOT_ENOUGH} (${m.n})`
  return `${m.value < 48 ? `${Math.round(m.value)} hours` : `${Math.round(m.value / 24)} days`} (of ${m.n})`
}

/** One partner's track record. Money lines appear only when the server loaded them for the owner. */
export function PerformanceSummary({ row }: { row: PartnerPerformanceRow }) {
  const p = row.performance
  return (
    <div className="space-y-2 text-small">
      <KeyValue
        items={[
          ['Reliability', row.reliability ? `${row.reliability.score} out of 100. ${row.reliability.reason}` : 'No delivery history yet'],
          ['Times asked', String(p.asked)],
          ['Reply rate', percent(p.replyRate)],
          ['Usual reply time', hours(p.medianReplyHours)],
          ['Cheapest of the replies', percent(p.cheapestRate)],
          ['Above the cheapest, on average', p.averageAboveCheapestPercent.enough && p.averageAboveCheapestPercent.value !== null ? `${p.averageAboveCheapestPercent.value}% (of ${p.averageAboveCheapestPercent.n})` : `${NOT_ENOUGH} (${p.averageAboveCheapestPercent.n})`],
          ['Times chosen', String(p.chosen)],
          ['Orders', String(p.orders)],
          ['Delivered on time', percent(p.onTimeRate)],
          ['Usual time to confirm an order', hours(p.medianConfirmHours)],
          ['Problems reported', String(p.disputes)],
          ['Completed orders without proof', String(p.completedWithoutProof)],
          ['Current prices', p.prices.current ? `${p.prices.current}: ${p.prices.fresh} fresh, ${p.prices.ageing} ageing, ${p.prices.expired} expired` : 'None'],
          ['Contacts to re-confirm', String(p.contactsDue)],
          ['Re-verification', p.reverifyDue ? 'Due now' : 'Not due'],
          ...(row.money
            ? ([
                ['Commission due (owner only)', formatEtbExact(row.money.commissionDueCents)],
                ['Commission received', formatEtbExact(row.money.commissionReceivedCents)],
                ['Commission still owed', formatEtbExact(row.money.commissionOutstandingCents)],
                ['HagerLand earned', formatEtbExact(row.money.earnedCents)],
              ] as [string, string][])
            : []),
        ]}
      />
      <p className="text-caption text-muted">Figures need at least 3 data points; the number in brackets is how many there are.</p>
    </div>
  )
}
