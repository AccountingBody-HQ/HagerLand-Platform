// Jobs Phase 4: the recorded check behind the "Verified" badge (all businesses). Pure: shared by admin, the badge,
// the account page, the daily job and the tests. Dates are Addis Ababa calendar days (YYYY-MM-DD). The database
// enforces the same rules (migration 0042): the badge can only be given with a live record.
import { addisDay } from '@/lib/jobs-privacy'
import { addDays, addMonths } from '@/lib/jobs-desk'

export const VERIFICATION_EXPIRY_KEY = 'org_verification_expiry'
/** The Addis date the owner switched the legacy clean-up on (written by the switch; absent while it is off). */
export const VERIFICATION_EXPIRY_STARTED_KEY = 'org_verification_expiry_started_on'

export const CHECK_METHODS = [
  { value: 'document', label: 'From the licence document' },
  { value: 'online_register', label: 'On the Ministry of Trade online register' },
  { value: 'in_person', label: 'In person' },
] as const
export type CheckMethod = (typeof CHECK_METHODS)[number]['value']
export const CHECK_METHOD_VALUES = CHECK_METHODS.map((m) => m.value) as [CheckMethod, ...CheckMethod[]]

export const RECORD_STATUS_LABEL: Record<string, string> = { active: 'Active', needs_recheck: 'Needs re-check', expired: 'Ended', revoked: 'Revoked' }

export const REMINDER_DAYS = 30
export const LEGACY_GRACE_DAYS = 90
export const RECHECK_GRACE_DAYS = 30

export interface VerificationRecord {
  status: string
  valid_until: string
  verified_at: string
  needs_recheck_since?: string | null
}

/** 12 months from the check (Addis date), or the licence expiry date if that is sooner. */
export function validUntil(verifiedAt: Date | string, licenceExpiresOn: string | null): string {
  const twelve = addMonths(addisDay(verifiedAt), 12)
  return licenceExpiresOn && licenceExpiresOn < twelve ? licenceExpiresOn : twelve
}

/** A record that still carries the badge today. */
export function isLiveRecord(r: VerificationRecord | null | undefined, today: string): boolean {
  return Boolean(r && ['active', 'needs_recheck'].includes(r.status) && r.valid_until >= today)
}

/** The day the "ending soon" reminder is due (30 days before the badge ends). */
export function reminderDay(endsOn: string): string {
  return addDays(endsOn, -REMINDER_DAYS)
}

/** Within the reminder window: from 30 days before the end, up to the end day itself. */
export function inReminderWindow(endsOn: string, today: string): boolean {
  return today >= reminderDay(endsOn) && today <= endsOn
}

/** The badge has ended: the day after its last valid day. */
export function hasEnded(endsOn: string, today: string): boolean {
  return today > endsOn
}

/** A "needs re-check" record not re-confirmed within 30 days ends (counted in Addis days from when it was flagged). */
export function recheckEndsOn(needsRecheckSince: string): string {
  return addDays(addisDay(needsRecheckSince), RECHECK_GRACE_DAYS)
}

/** The day a live record's badge ends: its valid-until date, or the end of a re-check period if that is sooner. */
export function recordEndsOn(r: VerificationRecord): string {
  if (r.status === 'needs_recheck' && r.needs_recheck_since) {
    const recheck = recheckEndsOn(r.needs_recheck_since)
    return recheck < r.valid_until ? recheck : r.valid_until
  }
  return r.valid_until
}

/** F3: a legacy badge ends 90 days after the owner switches the clean-up on. */
export function legacyEndsOn(startedOn: string): string {
  return addDays(startedOn, LEGACY_GRACE_DAYS)
}

/** When a badge ends, the business keeps "Claimed" if someone manages it, else "Listed". */
export function levelAfterBadge(hasMembers: boolean): 'claimed' | 'listed' {
  return hasMembers ? 'claimed' : 'listed'
}

/** Badge explanation. New-standard wording (W5/W6) only for a live record (F5); legacy badges keep today's texts. */
export function badgeExplain(level: string | null, verifiedAt: string | null | undefined, record: { verified_at: string; ends_on: string } | null, formatDate: (d: string) => string, legacyExplain: string): string {
  if (level !== 'verified') return legacyExplain
  if (record) return record.verified_at ? `Verified: HagerLand checked this business's trade licence and tax number on ${formatDate(record.verified_at)}. Next check due by ${formatDate(record.ends_on)}.` : "Verified: HagerLand checked this business's trade licence and tax number."
  return verifiedAt ? `Verified: HagerLand checked this business's trade licence on ${formatDate(verifiedAt)}.` : legacyExplain
}

// ---------------------------------------------------------------------------
// F1: four-eyes on private-client jobs
// ---------------------------------------------------------------------------

export type ApprovalCheck = 'ok' | 'needs_reason' | 'refused'

/**
 * May this person approve this private-client job? Someone else always may. The creator may not, except the owner,
 * who must type a reason (stored and audited). Mirrors the database check job_posts_four_eyes.
 */
export function privateClientApproval(createdByStaff: string | null, actor: string, isOwner: boolean, reason: string | null | undefined): ApprovalCheck {
  if (!createdByStaff || createdByStaff !== actor) return 'ok'
  if (!isOwner) return 'refused'
  return (reason ?? '').trim().length > 0 ? 'ok' : 'needs_reason'
}
