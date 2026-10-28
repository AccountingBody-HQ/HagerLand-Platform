// Jobs Phase 6 (owner only): recruitment fee totals, ageing and the "Reconciles with fee ledger" check for the Jobs
// report. Pure and deterministic, unit-tested. Amounts are whole minor units (cents) in the currency recorded; totals are
// always kept per currency (ETB and USD are never added together). Dates are Addis Ababa dates (YYYY-MM-DD).
import { daysBetweenDays } from '@/lib/jobs-insights'

export interface FeeTermsRow {
  id: string
  /** The placement reference (HLP-…), used to name a record that needs a look. */
  reference: string
  currency: string
  status: string
}

export interface FeeEntryRow {
  id: string
  fee_terms_id: string
  entry_type: string
  amount_minor: number
  currency: string
  occurred_on: string
  reverses_entry_id: string | null
}

export interface CurrencyTotals {
  currency: string
  due: number
  received: number
  waived: number
  /** Due minus received minus waived. Not clamped: a negative figure means more was received than was due. */
  outstanding: number
}

const KINDS = ['fee_due', 'fee_received', 'waived'] as const
type Kind = (typeof KINDS)[number]
const FIELD: Record<Kind, 'due' | 'received' | 'waived'> = { fee_due: 'due', fee_received: 'received', waived: 'waived' }

/** ETB first, then the other currencies in alphabetical order. */
export function currencyOrder(a: string, b: string): number {
  if (a === b) return 0
  if (a === 'ETB') return -1
  if (b === 'ETB') return 1
  return a.localeCompare(b)
}

function finish(m: Map<string, CurrencyTotals>): CurrencyTotals[] {
  return Array.from(m.values())
    .map((t) => ({ ...t, outstanding: t.due - t.received - t.waived }))
    .sort((a, b) => currencyOrder(a.currency, b.currency))
}

/**
 * Totals per currency of the entries dated from `from` to `to` (inclusive; null = no limit). A reversal counts against
 * the entry it corrects, on the reversal's own date (so a month shows the correction in the month it was made).
 */
export function totalsByCurrency(entries: FeeEntryRow[], from: string | null, to: string | null): CurrencyTotals[] {
  const byId = new Map(entries.map((e) => [e.id, e]))
  const m = new Map<string, CurrencyTotals>()
  const add = (currency: string, kind: string, amount: number) => {
    if (!(KINDS as readonly string[]).includes(kind)) return
    const t = m.get(currency) ?? { currency, due: 0, received: 0, waived: 0, outstanding: 0 }
    t[FIELD[kind as Kind]] += amount
    m.set(currency, t)
  }
  for (const e of entries) {
    if ((from && e.occurred_on < from) || (to && e.occurred_on > to)) continue
    if (e.entry_type === 'reversal') {
      const orig = e.reverses_entry_id ? byId.get(e.reverses_entry_id) : undefined
      if (orig) add(e.currency, orig.entry_type, -e.amount_minor)
    } else add(e.currency, e.entry_type, e.amount_minor)
  }
  return finish(m)
}

/** One fee record's totals up to `asOf` (reversals dated up to then applied); not clamped. */
export function recordTotals(entries: FeeEntryRow[], asOf: string | null = null): { due: number; received: number; waived: number; outstanding: number } {
  const t = totalsByCurrency(entries.map((e) => ({ ...e, currency: '*' })), null, asOf)[0]
  return t ? { due: t.due, received: t.received, waived: t.waived, outstanding: t.outstanding } : { due: 0, received: 0, waived: 0, outstanding: 0 }
}

export const AGEING_BUCKETS = ['0–30 days', '31–60 days', '61–90 days', 'Over 90 days'] as const
export type AgeingBucket = (typeof AGEING_BUCKETS)[number]

export function ageingBucket(days: number): AgeingBucket {
  if (days <= 30) return '0–30 days'
  if (days <= 60) return '31–60 days'
  if (days <= 90) return '61–90 days'
  return 'Over 90 days'
}

export interface AgeingRow {
  bucket: AgeingBucket
  currency: string
  placements: number
  amount: number
}

/** Outstanding fees as of `asOf`, aged from the first date a fee was recorded as due (that entry not reversed by then). */
export function feeAgeing(terms: FeeTermsRow[], entries: FeeEntryRow[], asOf: string): AgeingRow[] {
  const rows = new Map<string, AgeingRow>()
  for (const t of terms) {
    const mine = entries.filter((e) => e.fee_terms_id === t.id && e.occurred_on <= asOf)
    const reversed = new Set(mine.filter((e) => e.entry_type === 'reversal').map((e) => e.reverses_entry_id))
    const firstDue = mine.filter((e) => e.entry_type === 'fee_due' && !reversed.has(e.id)).map((e) => e.occurred_on).sort()[0]
    const { outstanding } = recordTotals(mine, asOf)
    if (!firstDue || outstanding <= 0) continue
    const bucket = ageingBucket(daysBetweenDays(firstDue, asOf))
    const key = `${bucket}|${t.currency}`
    const r = rows.get(key) ?? { bucket, currency: t.currency, placements: 0, amount: 0 }
    r.placements++
    r.amount += outstanding
    rows.set(key, r)
  }
  return Array.from(rows.values()).sort((a, b) => AGEING_BUCKETS.indexOf(a.bucket) - AGEING_BUCKETS.indexOf(b.bucket) || currencyOrder(a.currency, b.currency))
}

/** Placements whose fee has been owed for more than `days` days today (for the digest: a count, never an amount). */
export function owedLongerThan(terms: FeeTermsRow[], entries: FeeEntryRow[], today: string, days = 30): number {
  return feeAgeingDays(terms, entries, today).filter((d) => d > days).length
}

function feeAgeingDays(terms: FeeTermsRow[], entries: FeeEntryRow[], asOf: string): number[] {
  const out: number[] = []
  for (const t of terms) {
    const mine = entries.filter((e) => e.fee_terms_id === t.id && e.occurred_on <= asOf)
    const reversed = new Set(mine.filter((e) => e.entry_type === 'reversal').map((e) => e.reverses_entry_id))
    const firstDue = mine.filter((e) => e.entry_type === 'fee_due' && !reversed.has(e.id)).map((e) => e.occurred_on).sort()[0]
    if (firstDue && recordTotals(mine, asOf).outstanding > 0) out.push(daysBetweenDays(firstDue, asOf))
  }
  return out
}

export interface ReconcileProblem {
  reference: string
  check: 1 | 2 | 3 | 4 | 5
  problem: string
}

export interface Reconciliation {
  reconciles: boolean
  problems: ReconcileProblem[]
  /** References of the fee records that need a look, without repeats. */
  references: string[]
}

/**
 * "Reconciles with fee ledger" (review A1 item 31). Yes only when all five checks pass over every entry:
 *  1. each record's totals, added up per currency, equal the totals worked out directly from all entries (an entry in a
 *     different currency from its record breaks this);
 *  2. no record has more received plus waived than due (over-payment is flagged, never hidden);
 *  3. every "Paid" record has nothing outstanding;
 *  4. every "Waived" record has a waived entry (not reversed);
 *  5. every reversal mirrors the entry it corrects (same record, amount and currency; not itself a reversal; one each).
 */
export function reconcileFees(terms: FeeTermsRow[], entries: FeeEntryRow[]): Reconciliation {
  const problems: ReconcileProblem[] = []
  const termsById = new Map(terms.map((t) => [t.id, t]))
  const ref = (termsId: string) => termsById.get(termsId)?.reference ?? 'Unknown fee record'

  // Check 1: per-record totals (in the record's currency) against the direct totals (in each entry's currency).
  const fromRecords = new Map<string, CurrencyTotals>()
  for (const t of terms) {
    const r = recordTotals(entries.filter((e) => e.fee_terms_id === t.id))
    const c = fromRecords.get(t.currency) ?? { currency: t.currency, due: 0, received: 0, waived: 0, outstanding: 0 }
    c.due += r.due
    c.received += r.received
    c.waived += r.waived
    fromRecords.set(t.currency, c)
  }
  const direct = new Map(totalsByCurrency(entries, null, null).map((c) => [c.currency, c]))
  const currencies = Array.from(new Set([...Array.from(fromRecords.keys()), ...Array.from(direct.keys())]))
  const same = currencies.every((cur) => {
    const a = fromRecords.get(cur) ?? { due: 0, received: 0, waived: 0 }
    const b = direct.get(cur) ?? { due: 0, received: 0, waived: 0 }
    return a.due === b.due && a.received === b.received && a.waived === b.waived
  })
  if (!same || entries.some((e) => !termsById.has(e.fee_terms_id))) {
    const odd = entries.filter((e) => !termsById.has(e.fee_terms_id) || e.currency !== termsById.get(e.fee_terms_id)?.currency)
    for (const e of odd) problems.push({ reference: ref(e.fee_terms_id), check: 1, problem: 'An entry is in a different currency from its fee record, or has no fee record' })
    if (!odd.length) problems.push({ reference: 'All fee records', check: 1, problem: 'The record totals do not match the ledger totals' })
  }

  for (const t of terms) {
    const mine = entries.filter((e) => e.fee_terms_id === t.id)
    const r = recordTotals(mine)
    // Check 2: over-payment.
    if (r.received + r.waived > r.due) problems.push({ reference: t.reference, check: 2, problem: 'More received or waived than was due' })
    // Check 3: "Paid" with money still owed.
    if (t.status === 'paid' && r.outstanding !== 0) problems.push({ reference: t.reference, check: 3, problem: 'Marked paid, but the amounts do not add up to nothing outstanding' })
    // Check 4: "Waived" without a waived entry.
    const reversed = new Set(mine.filter((e) => e.entry_type === 'reversal').map((e) => e.reverses_entry_id))
    if (t.status === 'waived' && !mine.some((e) => e.entry_type === 'waived' && !reversed.has(e.id))) problems.push({ reference: t.reference, check: 4, problem: 'Marked waived, but there is no waived entry' })
  }

  // Check 5: reversals mirror their entries (the database also refuses a wrong one).
  const byId = new Map(entries.map((e) => [e.id, e]))
  const seen = new Set<string>()
  for (const e of entries.filter((x) => x.entry_type === 'reversal')) {
    const orig = e.reverses_entry_id ? byId.get(e.reverses_entry_id) : undefined
    const ok = orig && orig.entry_type !== 'reversal' && orig.fee_terms_id === e.fee_terms_id && orig.amount_minor === e.amount_minor && orig.currency === e.currency && !seen.has(orig.id)
    if (orig) seen.add(orig.id)
    if (!ok) problems.push({ reference: ref(e.fee_terms_id), check: 5, problem: 'A reversal does not mirror the entry it corrects' })
  }

  const references = Array.from(new Set(problems.map((p) => p.reference)))
  return { reconciles: problems.length === 0, problems, references }
}
