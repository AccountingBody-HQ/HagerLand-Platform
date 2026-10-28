// Jobs Phase 6 (owner only): the fee tables of the Jobs report as CSV. References, currency, amounts, status and dates
// only: never a candidate's name or contact details, an employer's contact details or a document path.
import type { FeeReport } from '@/lib/jobs-fee-report-data'

export const FEE_CSV_TABLES = ['fees-month', 'fees-to-date', 'fee-ageing', 'fee-records', 'fee-reconciliation'] as const
export type FeeCsvTable = (typeof FEE_CSV_TABLES)[number]

export function isFeeCsvTable(v: string | null): v is FeeCsvTable {
  return (FEE_CSV_TABLES as readonly string[]).includes(v ?? '')
}

const amount = (minor: number) => (minor / 100).toFixed(2)

export function feeCsv(table: FeeCsvTable, r: FeeReport, asOf: string): Record<string, unknown>[] {
  switch (table) {
    case 'fees-month':
    case 'fees-to-date':
      return (table === 'fees-month' ? r.month : r.toDate).map((t) => ({ currency: t.currency, fee_due: amount(t.due), received: amount(t.received), waived: amount(t.waived), outstanding: amount(t.outstanding), as_of: asOf }))
    case 'fee-ageing':
      return r.ageing.map((a) => ({ owed_for: a.bucket, currency: a.currency, placements: a.placements, amount: amount(a.amount), as_of: asOf }))
    case 'fee-records':
      return r.records.map((x) => ({ placement: x.reference, currency: x.currency, status: x.status, fee_due: amount(x.due), received: amount(x.received), waived: amount(x.waived), outstanding: amount(x.outstanding), as_of: asOf }))
    case 'fee-reconciliation':
      return [{ reconciles_with_fee_ledger: r.reconciliation.reconciles ? 'yes' : 'no', check: '', placement: '', problem: '' }, ...r.reconciliation.problems.map((p) => ({ reconciles_with_fee_ledger: '', check: p.check, placement: p.reference, problem: p.problem }))]
  }
}
