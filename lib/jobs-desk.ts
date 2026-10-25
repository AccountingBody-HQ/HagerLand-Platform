// Jobs Phase 3: HagerLand's recruitment desk. Pure rules shared by the desk, the employer's request page, the daily
// job and the tests: who may be introduced (live consent and 18+), what an employer may see, replacement guarantees,
// fees, and how long hired people's details are kept. The database enforces the same rules (migration 0041).
import { addisDay, deletionCutoff } from '@/lib/jobs-privacy'

export const DESK_SWITCH_KEY = 'jobs_recruitment_desk'
export const RETENTION_MONTHS_KEY = 'jobs_fee_record_retention_months'

export const ASSIGNMENT_STATUSES = ['open', 'searching', 'introducing', 'filled', 'closed', 'cancelled'] as const
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number]
export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  open: 'Open',
  searching: 'Looking for people',
  introducing: 'Introducing people',
  filled: 'Filled',
  closed: 'Closed',
  cancelled: 'Cancelled',
}
export const CLOSED_ASSIGNMENT: AssignmentStatus[] = ['filled', 'closed', 'cancelled']

export const CANDIDATE_STATUS_LABEL: Record<string, string> = {
  shortlisted: 'On the shortlist',
  asked: 'Asked',
  agreed: 'Agreed to be introduced',
  declined: 'Said no',
  introduced: 'Introduced',
  interviewed: 'Interviewed',
  hired: 'Hired',
  not_hired: 'Not hired',
  withdrawn: 'Withdrew consent',
}

export const SOURCE_LABEL: Record<string, string> = {
  application: 'Job application',
  profile: 'Candidate profile',
  register: 'Worker register',
  manual: 'Added after a call',
}

export const CONSENT_METHODS = [
  { value: 'phone_call', label: 'Phone call' },
  { value: 'in_person', label: 'In person' },
  { value: 'whatsapp_message', label: 'WhatsApp message' },
  { value: 'telegram_message', label: 'Telegram message' },
  { value: 'email', label: 'Email' },
  { value: 'sms_message', label: 'SMS message' },
] as const
export type ConsentMethod = (typeof CONSENT_METHODS)[number]['value']
export const CONSENT_METHOD_VALUES = CONSENT_METHODS.map((m) => m.value) as [ConsentMethod, ...ConsentMethod[]]

/** The ways an employer may contact an introduced person, in button order (W row 6). */
export const SHARE_METHODS = [
  { key: 'share_phone', label: 'Call' },
  { key: 'share_whatsapp', label: 'WhatsApp' },
  { key: 'share_telegram', label: 'Telegram' },
  { key: 'share_sms', label: 'SMS' },
  { key: 'share_email', label: 'Email' },
] as const
export type ShareKey = (typeof SHARE_METHODS)[number]['key']
export type Shares = Record<ShareKey, boolean>

export const PLACEMENT_STATUS_LABEL: Record<string, string> = {
  hired: 'Hired (not started yet)',
  guarantee_running: 'Working: guarantee running',
  completed: 'Completed (guarantee passed)',
  replaced: 'Left inside the guarantee: replaced',
  left_after_guarantee: 'Left after the guarantee',
  cancelled: 'Cancelled',
}
export const END_REASONS = [
  { value: 'left_by_worker', label: 'The person left' },
  { value: 'dismissed', label: 'The employer let them go' },
  { value: 'role_ended', label: 'The work ended' },
  { value: 'did_not_start', label: 'Did not start' },
  { value: 'other', label: 'Other reason' },
] as const

export const ROLE_TYPES = [
  { value: 'trade', label: 'Trade or daily labour' },
  { value: 'professional', label: 'Professional' },
] as const
export type RoleType = (typeof ROLE_TYPES)[number]['value']

/** Approved fee model (decision 4): default replacement guarantee, editable per placement. */
export const DEFAULT_GUARANTEE_DAYS: Record<RoleType, number> = { trade: 30, professional: 90 }

export const FEE_BASES = [
  { value: 'first_year_salary', label: "First year's salary" },
  { value: 'first_month_pay', label: "First month's pay" },
  { value: 'other', label: 'Other (say what)' },
] as const
export const FEE_STATUS_LABEL: Record<string, string> = { draft: 'Draft', agreed: 'Agreed in writing', invoiced: 'Invoiced', paid: 'Paid', waived: 'Waived' }
export const FEE_ENTRY_LABEL: Record<string, string> = { fee_due: 'Fee due', fee_received: 'Fee received', waived: 'Waived', reversal: 'Reversal' }
export const FEE_METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'telebirr', label: 'telebirr' },
  { value: 'cbe_birr', label: 'CBE Birr' },
  { value: 'cash', label: 'Cash' },
  { value: 'other', label: 'Other' },
] as const

// ---------------------------------------------------------------------------
// Consent, 18+ and introductions
// ---------------------------------------------------------------------------

export interface ConsentState {
  consent_at: string | null
  consent_withdrawn_at: string | null
  declined_at: string | null
  adult_confirmed_at: string | null
  introduced_at: string | null
  personal_data_deleted_at?: string | null
  name?: string | null
}

export function hasLiveConsent(c: ConsentState): boolean {
  return c.consent_at !== null && c.consent_withdrawn_at === null && c.declined_at === null
}

/** Why a person cannot be introduced yet (null: they can). Mirrors the database check. */
export function introductionBlocker(c: ConsentState): string | null {
  if (c.introduced_at) return 'Already introduced.'
  if (c.personal_data_deleted_at) return 'Personal details were deleted.'
  if (c.declined_at) return 'This person said no.'
  if (c.consent_withdrawn_at) return 'This person withdrew consent.'
  if (!c.consent_at) return 'Record their consent first.'
  if (!c.adult_confirmed_at) return 'Confirm they are 18 or older first.'
  if (!c.name) return 'Add their name first.'
  return null
}

/** What the employer sees for an introduced person: contact only while consent stands (W rows 6 and 8). */
export function employerSeesContact(c: ConsentState): boolean {
  return c.introduced_at !== null && c.consent_withdrawn_at === null && !c.personal_data_deleted_at
}

/** May the desk show this shortlist row's contact details? Not for another employer's applicant before consent. */
export function deskSeesContact(c: { other_employer: boolean; consent_at: string | null }): boolean {
  return !c.other_employer || c.consent_at !== null
}

export function sharedMethods(s: Shares): ShareKey[] {
  return SHARE_METHODS.filter((m) => s[m.key]).map((m) => m.key)
}

/** Contact buttons for an introduced person: only the methods they agreed to share, in the approved order. */
export function employerContactButtons(s: Shares, phone: string | null, email: string | null): { label: string; href: string }[] {
  const digits = (phone ?? '').replace(/\D/g, '')
  const href: Record<ShareKey, string | null> = {
    share_phone: digits ? `tel:+${digits}` : null,
    share_whatsapp: digits ? `https://wa.me/${digits}` : null,
    share_telegram: digits ? `https://t.me/+${digits}` : null,
    share_sms: digits ? `sms:+${digits}` : null,
    share_email: email ? `mailto:${email}` : null,
  }
  return SHARE_METHODS.filter((m) => s[m.key] && href[m.key]).map((m) => ({ label: m.label, href: href[m.key] as string }))
}

/**
 * A candidate profile's reference as employers see it ("C-" + the first 8 characters of the id, see
 * /account/jobs/candidates), turned into the range of ids it can match. Null if it is not a valid reference.
 */
export function profileRefRange(ref: string): { from: string; to: string } | null {
  const m = /^C-([0-9A-F]{8})$/i.exec(ref.trim())
  if (!m) return null
  const head = m[1].toLowerCase()
  return { from: `${head}-0000-0000-0000-000000000000`, to: `${head}-ffff-ffff-ffff-ffffffffffff` }
}

/** "{First name}" for the withdrawn line (W row 8). */
export function firstNameOf(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? ''
}

// ---------------------------------------------------------------------------
// Dates (Addis Ababa calendar days, YYYY-MM-DD)
// ---------------------------------------------------------------------------

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** The same date n months later; a day that does not exist (31st, 29 Feb) becomes the last day of that month. */
export function addMonths(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const total = y * 12 + (m - 1) + n
  const ty = Math.floor(total / 12)
  const tm = total % 12
  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate()
  return `${ty}-${String(tm + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`
}

export function todayAddis(now: Date = new Date()): string {
  return addisDay(now)
}

export function guaranteeEndsOn(startDate: string, days: number): string {
  return addDays(startDate, days)
}

// ---------------------------------------------------------------------------
// Placements
// ---------------------------------------------------------------------------

export interface PlacementDates {
  status: string
  start_date: string
  guarantee_ends_on: string
}

/** The daily move: hired → guarantee running on the start date → completed the day after the guarantee ends. */
export function nextPlacementStatus(p: PlacementDates, today: string): 'guarantee_running' | 'completed' | null {
  if (!['hired', 'guarantee_running'].includes(p.status)) return null
  if (today > p.guarantee_ends_on) return 'completed'
  if (p.status === 'hired' && today >= p.start_date) return 'guarantee_running'
  return null
}

/** A running guarantee ending within the next 7 days (today included), for the digest. */
export function guaranteeEndsSoon(p: PlacementDates, today: string): boolean {
  return ['hired', 'guarantee_running'].includes(p.status) && p.guarantee_ends_on >= today && p.guarantee_ends_on <= addDays(today, 7)
}

/** Leaving inside the guarantee (on or before its last day) allows a free replacement. */
export function leftInsideGuarantee(p: { guarantee_ends_on: string }, endedOn: string): boolean {
  return endedOn <= p.guarantee_ends_on
}

// ---------------------------------------------------------------------------
// Fees (owner only)
// ---------------------------------------------------------------------------

/** A percentage fee worked out from the pay it is based on (rounded to the nearest cent). */
export function percentageFeeMinor(percentBps: number, basisAmountMinor: number): number {
  return Math.round((basisAmountMinor * percentBps) / 10_000)
}

export interface FeeEntry {
  id: string
  entry_type: string
  amount_minor: number
  reverses_entry_id: string | null
}

/** Totals after reversals: what is due, received and waived, and what is still owed. */
export function feeTotals(entries: FeeEntry[]): { due: number; received: number; waived: number; outstanding: number } {
  const reversed = new Set(entries.filter((e) => e.entry_type === 'reversal').map((e) => e.reverses_entry_id))
  const sum = (type: string) => entries.filter((e) => e.entry_type === type && !reversed.has(e.id)).reduce((t, e) => t + e.amount_minor, 0)
  const due = sum('fee_due')
  const received = sum('fee_received')
  const waived = sum('waived')
  return { due, received, waived, outstanding: Math.max(0, due - received - waived) }
}

/** May this entry still be reversed (once only, and never a reversal)? */
export function canReverse(entry: FeeEntry, all: FeeEntry[]): boolean {
  return entry.entry_type !== 'reversal' && !all.some((e) => e.reverses_entry_id === entry.id)
}

// ---------------------------------------------------------------------------
// Keeping and deleting (12 months; hired-through-HagerLand exception)
// ---------------------------------------------------------------------------

/**
 * How long a hired person's details are kept: the later of the guarantee end or the last fee entry, plus the keeping
 * period. The period stays empty until the lawyer confirms it; then null means "keep, period not set".
 */
export function retainUntil(guaranteeEnds: string, lastFeeEntry: string | null, months: number | null): string | null {
  if (months === null) return null
  const base = lastFeeEntry && lastFeeEntry > guaranteeEnds ? lastFeeEntry : guaranteeEnds
  return addMonths(base, months)
}

export type HoldState = 'none' | 'hired' | 'period_not_set'

/** Is a record held by a placement (not cancelled) today? `retain` comes from retainUntil(). */
export function placementHold(p: { status: string } | null, retain: string | null, months: number | null, today: string): HoldState {
  if (!p || p.status === 'cancelled') return 'none'
  if (months === null || retain === null) return 'period_not_set'
  return retain >= today ? 'hired' : 'none'
}

/**
 * The moment a shortlist row's 12 months run from: its last activity, but never later than the day its assignment
 * closed (so nothing is kept longer than 12 months after the assignment closes).
 */
export function shortlistClockFrom(lastActivityAt: string, assignmentClosedAt: string | null): string {
  return assignmentClosedAt && assignmentClosedAt < lastActivityAt ? assignmentClosedAt : lastActivityAt
}

export function shortlistDueForDeletion(lastActivityAt: string, assignmentClosedAt: string | null, now: Date): boolean {
  return new Date(shortlistClockFrom(lastActivityAt, assignmentClosedAt)).getTime() < new Date(deletionCutoff(now)).getTime()
}

/** What a shortlist row looks like after its personal details are deleted (row, reference, status and dates stay). */
export function clearedShortlistRow(deletedAt: string) {
  return { name: null, phone: null, email: null, area_text: null, notes: null, consent_note: null, personal_data_deleted_at: deletedAt }
}

/** For a hired person: only the free-text notes go; name, contact and the consent record stay. */
export const HIRED_SHORTLIST_CLEAR = { notes: null }
/**
 * For a hired person's application: the cover note and employer notes go; name and contact stay. The CV file is
 * deleted after 12 months by the daily CV purge, which runs for every application (lib/cron/daily.ts).
 */
export const HIRED_APPLICATION_CLEAR = { cover_note: null, employer_notes: null }
