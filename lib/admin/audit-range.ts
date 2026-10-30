// QC-1a: the audit-log CSV covers one period of Addis Ababa dates (From and To included); empty means the last 90 days.
import { daysBefore } from '@/lib/retention'

export const AUDIT_CSV_DAYS = 90
const DAY = /^\d{4}-\d{2}-\d{2}$/

/** The period to export, or null when To is before From. Bad or empty dates fall back to the default. */
export function auditCsvRange(from: string | null | undefined, to: string | null | undefined, today: string): { from: string; to: string } | null {
  const t = to && DAY.test(to) ? to : today
  const f = from && DAY.test(from) ? from : daysBefore(t, AUDIT_CSV_DAYS - 1)
  return f <= t ? { from: f, to: t } : null
}
