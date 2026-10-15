import { formatETB, formatDate } from '@/lib/format'
import { PROPERTY_TYPES } from '@/lib/labels'
import type { InsightRow } from '@/lib/data/advice'

export const INSIGHT_LABEL = 'Based on asking prices on HagerLand — not valuations'

export function typeLabel(t: string): string {
  return t === 'all' ? 'All types' : (PROPERTY_TYPES.find((p) => p.value === t)?.label ?? t)
}

/** Median and middle range of asking prices (spec 26.10). Always labelled as asking prices, never valuations. */
export function InsightTable({ rows, caption, showPlace = true }: { rows: InsightRow[]; caption: string; showPlace?: boolean }) {
  if (rows.length === 0) return null
  const suffix = (r: InsightRow) => (r.purpose === 'rent' ? ' /month' : '')
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-white" role="region" aria-label={caption} tabIndex={0}>
      <table className="w-full min-w-[560px] text-small">
        <caption className="px-4 pt-3 text-left text-caption text-muted">
          {caption}. {INSIGHT_LABEL}. Updated {formatDate(rows[0].refreshed_at)}.
        </caption>
        <thead>
          <tr className="text-left text-muted">
            {showPlace && <th className="px-4 py-2 font-semibold">Place</th>}
            <th className="px-4 py-2 font-semibold">Type</th>
            <th className="px-4 py-2 font-semibold">Listings</th>
            <th className="px-4 py-2 font-semibold">Median asking price</th>
            <th className="px-4 py-2 font-semibold">Middle half of prices</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((r) => (
            <tr key={`${r.location_id}-${r.purpose}-${r.property_type}`} className="border-t border-border">
              {showPlace && <td className="px-4 py-2">{r.location_name ?? 'All of Ethiopia'}</td>}
              <td className="px-4 py-2">{typeLabel(r.property_type)}</td>
              <td className="px-4 py-2">{r.sample_count}</td>
              <td className="px-4 py-2 font-semibold">
                {formatETB(r.median_etb)}
                {suffix(r)}
              </td>
              <td className="px-4 py-2">
                {formatETB(r.p25_etb)} – {formatETB(r.p75_etb)}
                {suffix(r)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
