// S6-3 partner terms → prices (migration 0050). The same rules as the SQL functions supply_suggested_terms and
// supply_resolve_terms; a unit test runs both on generated cases and expects identical results.
//   - Markup: the source cost × (1 + markup) is the suggested customer price; HagerLand pays the partner the cost.
//   - Commission: the source "cost" is the partner's agreed selling price; that is the suggested customer price, and
//     HagerLand pays the partner that price × (1 − commission).
//   - Precedence: the product source's own markup or commission, else the partner's active agreement default (markup
//     first, then commission), else none ("manual": the owner types the price; HagerLand pays the cost).
//   - Rounding: half up to the cent, in whole numbers (no floating-point surprises).

export type TermsModel = 'markup' | 'commission' | 'manual'

export interface SuggestedTerms {
  model: TermsModel | null
  bps: number | null
  customerUnitCents: number | null
  payableUnitCents: number | null
}

/** n / d rounded half up, for whole non-negative numbers (supply_round_div in 0050). */
export function roundDiv(n: number, d: number): number {
  return Math.floor((2 * n + d) / (2 * d))
}

export function suggestedTerms(costCents: number | null, markupBps: number | null, commissionBps: number | null): SuggestedTerms {
  if (costCents === null) return { model: null, bps: markupBps ?? commissionBps, customerUnitCents: null, payableUnitCents: null }
  if (markupBps !== null) return { model: 'markup', bps: markupBps, customerUnitCents: roundDiv(costCents * (10000 + markupBps), 10000), payableUnitCents: costCents }
  if (commissionBps !== null) return { model: 'commission', bps: commissionBps, customerUnitCents: costCents, payableUnitCents: roundDiv(costCents * (10000 - commissionBps), 10000) }
  return { model: 'manual', bps: null, customerUnitCents: null, payableUnitCents: costCents }
}

export interface SourceTerms {
  costCents: number | null
  markupBps: number | null
  commissionBps: number | null
}
export interface AgreementTerms {
  defaultMarkupBps: number | null
  commissionBps: number | null
}

/** The terms that apply to one product from one partner (supply_resolve_terms in 0050). */
export function resolveTerms(source: SourceTerms | null, agreement: AgreementTerms | null): SuggestedTerms {
  const cost = source?.costCents ?? null
  if (source && (source.markupBps !== null || source.commissionBps !== null)) return suggestedTerms(cost, source.markupBps, source.commissionBps)
  if (agreement?.defaultMarkupBps != null) return suggestedTerms(cost, agreement.defaultMarkupBps, null)
  if (agreement?.commissionBps != null) return suggestedTerms(cost, null, agreement.commissionBps)
  return suggestedTerms(cost, null, null)
}

/** "markup 12.5%", "commission 5%", "manual" (admin wording). */
export function termsLabel(t: { model: TermsModel | null; bps: number | null }): string {
  if (!t.model) return ''
  if (t.model === 'manual') return 'manual price'
  return `${t.model} ${(Number(t.bps) / 100).toString()}%`
}
