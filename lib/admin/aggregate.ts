/** Small pure helpers for admin reports. Unit-tested. */
import { addisDate } from '@/lib/supply/shortlist'

export function countBy<T>(rows: T[], key: (r: T) => string | null | undefined): { key: string; count: number }[] {
  const m = new Map<string, number>()
  for (const r of rows) {
    const k = key(r)
    if (k) m.set(k, (m.get(k) ?? 0) + 1)
  }
  return Array.from(m, ([k, count]) => ({ key: k, count })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

/** Monday of the Addis Ababa week containing the moment, as YYYY-MM-DD (QC-1a: weeks follow the Ethiopian day). */
export function weekStart(d: Date): string {
  const x = new Date(`${addisDate(d)}T00:00:00Z`)
  const dow = (x.getUTCDay() + 6) % 7
  x.setUTCDate(x.getUTCDate() - dow)
  return x.toISOString().slice(0, 10)
}

/** Counts per week for the last `weeks` weeks (oldest first), including empty weeks. */
export function weeklySeries(dates: string[], weeks: number, now: Date = new Date()): { week: string; count: number }[] {
  const out: { week: string; count: number }[] = []
  const current = new Date(`${weekStart(now)}T00:00:00Z`)
  for (let i = weeks - 1; i >= 0; i--) {
    const w = new Date(current)
    w.setUTCDate(w.getUTCDate() - i * 7)
    out.push({ week: w.toISOString().slice(0, 10), count: 0 })
  }
  const index = new Map(out.map((o, i) => [o.week, i]))
  for (const d of dates) {
    const i = index.get(weekStart(new Date(d)))
    if (i !== undefined) out[i].count++
  }
  return out
}

/** Sum of a numeric field grouped by a key. */
export function sumBy<T>(rows: T[], key: (r: T) => string, value: (r: T) => number | null | undefined): { key: string; total: number; count: number }[] {
  const m = new Map<string, { total: number; count: number }>()
  for (const r of rows) {
    const v = value(r)
    if (v === null || v === undefined) continue
    const k = key(r)
    const cur = m.get(k) ?? { total: 0, count: 0 }
    m.set(k, { total: cur.total + v, count: cur.count + 1 })
  }
  return Array.from(m, ([k, v]) => ({ key: k, ...v })).sort((a, b) => a.key.localeCompare(b.key))
}

/** The last `months` calendar months (UTC) as YYYY-MM, oldest first. */
export function lastMonths(months: number, now: Date = new Date()): string[] {
  const out: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    out.push(d.toISOString().slice(0, 7))
  }
  return out
}

export interface MonthlyRow {
  month: string
  requests: number
  enquiries: number
  quoteRequests: number
  dealsWon: number
  /** Per currency: deal value, commission and lead fees (in minor units). */
  money: Record<string, { value: number; commission: number; leadFees: number }>
}

/** Monthly lead and revenue report (spec 25.2k). Inputs are created/closed timestamps and deal amounts. */
export function monthlyReport(
  months: string[],
  input: {
    requests: string[]
    enquiries: string[]
    quoteRequests: string[]
    deals: { closed_at: string | null; created_at: string; status: string; currency: string; value_minor: number | null; commission_minor: number | null; lead_fee_minor: number | null }[]
  },
): MonthlyRow[] {
  const rows = new Map<string, MonthlyRow>(months.map((m) => [m, { month: m, requests: 0, enquiries: 0, quoteRequests: 0, dealsWon: 0, money: {} }]))
  const bump = (list: string[], field: 'requests' | 'enquiries' | 'quoteRequests') => {
    for (const d of list) {
      const r = rows.get(d.slice(0, 7))
      if (r) r[field]++
    }
  }
  bump(input.requests, 'requests')
  bump(input.enquiries, 'enquiries')
  bump(input.quoteRequests, 'quoteRequests')
  for (const d of input.deals) {
    if (!['won', 'invoiced', 'paid'].includes(d.status)) continue
    const r = rows.get((d.closed_at ?? d.created_at).slice(0, 7))
    if (!r) continue
    r.dealsWon++
    const m = (r.money[d.currency] ??= { value: 0, commission: 0, leadFees: 0 })
    m.value += d.value_minor ?? 0
    m.commission += d.commission_minor ?? 0
    m.leadFees += d.lead_fee_minor ?? 0
  }
  return months.map((m) => rows.get(m) as MonthlyRow)
}
