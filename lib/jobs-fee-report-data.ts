import 'server-only'
// Jobs Phase 6 (OWNER ONLY): the recruitment fee figures for the Jobs report and its CSV. The only module (with the desk
// page and actions of Phase 3) that reads fee amounts. The report function checks the owner session itself, as well as
// the page and the CSV route. The digest gets one count (fees owed for over 30 days), never an amount. Read-only.
import { getAdminSupabase } from '@/lib/supabase/admin'
import { must } from '@/lib/admin/must'
import { isOwnerSession } from '@/lib/admin/guard'
import { todayAddis } from '@/lib/jobs-desk'
import { feeAgeing, owedLongerThan, reconcileFees, totalsByCurrency, type AgeingRow, type CurrencyTotals, type FeeEntryRow, type FeeTermsRow, type Reconciliation } from '@/lib/jobs-fee-report'
import type { MonthRange } from '@/lib/jobs-insights'

async function loadLedger(): Promise<{ terms: FeeTermsRow[]; entries: FeeEntryRow[] }> {
  const db = getAdminSupabase()
  const [{ data: terms }, { data: entries }] = must(
    await Promise.all([
      db.from('recruitment_fee_terms').select('id, currency, status, placement:recruitment_placements(reference)').limit(20000),
      db.from('recruitment_fee_entries').select('id, fee_terms_id, entry_type, amount_minor, currency, occurred_on, reverses_entry_id').limit(50000),
    ]),
  )
  return {
    terms: (terms ?? []).map((t) => ({ id: t.id, currency: t.currency, status: t.status, reference: (t.placement as { reference: string } | null)?.reference ?? t.id })),
    entries: (entries ?? []).map((e) => ({ ...e, amount_minor: Number(e.amount_minor) })),
  }
}

export interface FeeReport {
  month: CurrencyTotals[]
  toDate: CurrencyTotals[]
  ageing: AgeingRow[]
  reconciliation: Reconciliation
  /** Fee records by status, for the CSV: reference, currency, status and totals to date. */
  records: { reference: string; currency: string; status: string; due: number; received: number; waived: number; outstanding: number }[]
}

/** Owner only: the month's fee totals, the totals to date, ageing as of the month end (or today) and the reconciliation. */
export async function jobsFeeReport(range: MonthRange): Promise<FeeReport> {
  if (!(await isOwnerSession())) throw new Error('Owner only')
  const { terms, entries } = await loadLedger()
  const start = `${range.month}-01`
  const records = terms.map((t) => {
    const [r] = totalsByCurrency(entries.filter((e) => e.fee_terms_id === t.id && e.occurred_on <= range.asOf), null, null)
    return { reference: t.reference, currency: t.currency, status: t.status, due: r?.due ?? 0, received: r?.received ?? 0, waived: r?.waived ?? 0, outstanding: r?.outstanding ?? 0 }
  })
  return {
    month: totalsByCurrency(entries, start, range.monthEnd),
    toDate: totalsByCurrency(entries, null, range.asOf),
    ageing: feeAgeing(terms, entries, range.asOf),
    reconciliation: reconcileFees(terms, entries),
    records: records.sort((a, b) => a.reference.localeCompare(b.reference)),
  }
}

/** For the digest: placements whose fee has been owed for more than 30 days (a count only). */
export async function feesOwedOver30Days(now: Date = new Date()): Promise<number> {
  const { terms, entries } = await loadLedger()
  return owedLongerThan(terms, entries, todayAddis(now), 30)
}
