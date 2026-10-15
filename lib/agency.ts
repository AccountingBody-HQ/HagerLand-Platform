/**
 * HagerLand estate agency (spec 26.5, 26.6): stages, statuses and labels shared by admin, account and public pages.
 * Edge-safe: no server-only imports.
 */

export const INSTRUCTION_STAGES = ['lead', 'valuation_booked', 'valued', 'instructed', 'live', 'under_offer', 'let_agreed', 'completed', 'withdrawn', 'expired'] as const
export type InstructionStage = (typeof INSTRUCTION_STAGES)[number]
export const STAGE_LABEL: Record<InstructionStage, string> = {
  lead: 'Lead',
  valuation_booked: 'Valuation booked',
  valued: 'Valued',
  instructed: 'Instructed',
  live: 'Live (marketed)',
  under_offer: 'Under offer',
  let_agreed: 'Let agreed',
  completed: 'Completed',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
}
/** Stages that need the written terms (fee, sole/multi agency, term start) — mirrors the database check. */
export const STAGES_NEEDING_TERMS: InstructionStage[] = ['instructed', 'live', 'under_offer', 'let_agreed', 'completed']
/** Open pipeline stages (counted on the dashboard). */
export const OPEN_STAGES: InstructionStage[] = ['lead', 'valuation_booked', 'valued', 'instructed', 'live', 'under_offer', 'let_agreed']

export const VALUATION_STATUSES = ['requested', 'booked', 'completed', 'cancelled'] as const
export const VALUATION_OUTCOMES = ['pending', 'instructed', 'not_instructed', 'no_show', 'cancelled'] as const
export const VIEWING_STATUSES = ['requested', 'confirmed', 'completed', 'cancelled', 'no_show'] as const
export const OFFER_STATUSES = ['submitted', 'countered', 'accepted', 'rejected', 'withdrawn'] as const
export const APPLICATION_STATUSES = ['submitted', 'referencing', 'approved', 'rejected', 'withdrawn'] as const
export const TENANCY_STATUSES = ['active', 'ending', 'ended', 'renewed'] as const
export const CONTACT_ROLES = ['vendor', 'landlord', 'buyer', 'tenant'] as const
export type ContactRole = (typeof CONTACT_ROLES)[number]

export const STATUS_LABEL: Record<string, string> = {
  requested: 'Requested',
  booked: 'Booked',
  completed: 'Completed',
  cancelled: 'Cancelled',
  confirmed: 'Confirmed',
  no_show: 'No-show',
  submitted: 'Received',
  countered: 'Countered',
  accepted: 'Accepted',
  rejected: 'Not accepted',
  withdrawn: 'Withdrawn',
  referencing: 'Checking references',
  approved: 'Approved',
  active: 'Active',
  ending: 'Ending',
  ended: 'Ended',
  renewed: 'Renewed',
  pending: 'Pending',
  instructed: 'Instructed',
  not_instructed: 'Not instructed',
}

export const ROLE_LABEL: Record<ContactRole, string> = { vendor: 'Vendor', landlord: 'Landlord', buyer: 'Buyer', tenant: 'Tenant' }

export const VIEWING_MODE_LABEL: Record<'in_person' | 'video', string> = { in_person: 'In person', video: 'Video call' }

/** Agency features show only on listings HagerLand markets itself (lister_type 'hagerland'). */
export function isHagerlandMarketed(p: { lister_type?: string | null }): boolean {
  return p.lister_type === 'hagerland'
}

/** Fee for a completed instruction: a percentage of the final price, or a fixed amount (whole birr). */
export function instructionFee(i: { fee_type: string | null; fee_percent: number | null; fee_amount_etb: number | null }, finalPriceEtb: number | null): number | null {
  if (i.fee_type === 'fixed') return i.fee_amount_etb ?? null
  if (i.fee_type === 'percent' && i.fee_percent !== null && finalPriceEtb !== null) return Math.round((finalPriceEtb * i.fee_percent) / 100)
  return null
}

/** Whole days between two dates (used for "average days on market"). */
export function daysBetween(from: string | Date, to: string | Date): number {
  return Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000))
}
