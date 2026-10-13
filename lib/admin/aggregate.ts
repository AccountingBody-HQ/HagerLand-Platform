/** Small pure helpers for admin reports. Unit-tested. */

export function countBy<T>(rows: T[], key: (r: T) => string | null | undefined): { key: string; count: number }[] {
  const m = new Map<string, number>()
  for (const r of rows) {
    const k = key(r)
    if (k) m.set(k, (m.get(k) ?? 0) + 1)
  }
  return Array.from(m, ([k, count]) => ({ key: k, count })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
}

/** Monday (UTC) of the week containing the date, as YYYY-MM-DD. */
export function weekStart(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
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
