// F-5 keeping periods (decision D3): which records are due, and exactly what clearing writes. Pure: the daily job
// (lib/retention-data.ts) and the tests use the same rules. Rows are kept with their reference, status, dates and
// amounts; only personal details are cleared ("anonymised"). Every value below satisfies the column's existing rules
// (NOT NULL, minimum lengths, formats): no column rule changes. Dates are Addis Ababa calendar dates, like the Jobs
// deletion (lib/jobs-privacy.ts).
import { addisDay, REMOVED_NAME } from '@/lib/jobs-privacy'

/** The F-5 kinds in the shared clean-up (lib/jobs-cleanup.ts), cleared under the owner's Dry run → Live switch. */
export const RETENTION_KINDS = ['enquiries', 'service_requests', 'quote_requests', 'property_care', 'managed_properties', 'build_projects', 'partner_applications', 'claims', 'trade_accounts', 'supply_contacts', 'audit_log'] as const
export type RetentionKind = (typeof RETENTION_KINDS)[number]
/** Kinds whose rows are deleted in batches (D2, D3), at most DELETE_BATCH ids per call. */
export const BATCH_KINDS: readonly RetentionKind[] = ['supply_contacts', 'audit_log']
export const DELETE_BATCH = 500

/** The cleared message where a message is required (enquiries: at least 1 character; owner messages: the same). */
export const REMOVED_TEXT = '(removed)'
/** Partner applications need an email (NOT NULL): this one can never reach anyone. */
export const REMOVED_EMAIL = 'removed@removed.invalid'

/** The same date `months` earlier; a day that does not exist (31 Apr, 29 Feb) becomes the last day of that month. */
export function monthsBefore(day: string, months: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const total = y * 12 + (m - 1) - months
  const ty = Math.floor(total / 12)
  const tm = total - ty * 12 + 1
  const last = new Date(Date.UTC(ty, tm, 0)).getUTCDate()
  return `${ty}-${String(tm).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`
}

/** The day `days` earlier (calendar arithmetic on the date only). */
export function daysBefore(day: string, days: number): string {
  const t = new Date(`${day}T00:00:00Z`)
  t.setUTCDate(t.getUTCDate() - days)
  return t.toISOString().slice(0, 10)
}

/**
 * The moment (UTC ISO) before which a record's activity makes it due: the start of the Addis Ababa day after the date
 * that is `months` (or `days`) before today. A record is cleared on the first Addis day on or after that anniversary.
 */
export function retentionCutoff(now: Date, period: { months?: number; days?: number }): string {
  const today = addisDay(now)
  const due = period.months !== undefined ? monthsBefore(today, period.months) : daysBefore(today, period.days ?? 0)
  const next = new Date(`${due}T00:00:00+03:00`)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString()
}

/** The latest of several moments (ISO strings; empty ones ignored). */
export function latest(...moments: (string | null | undefined)[]): string | null {
  return moments.filter((m): m is string => Boolean(m)).reduce<string | null>((a, b) => (a === null || b > a ? b : a), null)
}

/** Open states: these records are never cleared (A2). */
export const OPEN_SERVICE_REQUEST = ['submitted', 'triaged', 'matched', 'quoted']
/** A supply order that is not finished holds its quote request (incl. disputed). */
export const FINISHED_ORDER = ['completed', 'cancelled']
export const OPEN_BUILD_PROJECT = ['submitted', 'in_progress', 'on_hold']
export const OPEN_PARTNER_APPLICATION = ['new', 'reviewing']

// ---------------------------------------------------------------------------------------------------------------
// What clearing writes, per table. `at` is the moment of clearing (personal_data_deleted_at).
// ---------------------------------------------------------------------------------------------------------------
export const clearedEnquiry = (at: string) => ({ name: REMOVED_NAME, phone: '', email: null, message: REMOVED_TEXT, details: {}, recipient_notes: null, preferred_contact: null, source_url: null, user_agent: null, utm: null, ip_hash: null, personal_data_deleted_at: at })
export const clearedServiceRequest = (at: string) => ({ name: REMOVED_NAME, phone: '', email: null, preferred_contact: null, admin_notes: null, access_token_hash: null, access_token_expires_at: null, ip_hash: null, details: '', attachment_paths: [] as string[], personal_data_deleted_at: at })
/** A provider's quote on a cleared request: the message goes; the document goes unless the match was won (D7). */
export const clearedMatch = (won: boolean) => (won ? { quote_message: null } : { quote_message: null, quote_document_path: null })
export const clearedQuoteRequest = (at: string, keepQuoteDocument: boolean) => ({
  name: REMOVED_NAME,
  phone: '',
  email: null,
  company_name: null,
  delivery_address: null,
  notes: null,
  internal_notes: null,
  ip_hash: null,
  materials_file_path: null,
  materials_file_paths: [] as string[],
  ...(keepQuoteDocument ? {} : { quote_document_path: null }),
  personal_data_deleted_at: at,
})
export const clearedQuoteItem = { notes: null }
export const clearedCareRequest = (at: string) => ({ name: REMOVED_NAME, phone: '', email: '', message: null, contact_time: null, preferred_contact: null, admin_notes: null, ip_hash: null, personal_data_deleted_at: at })
export const clearedManagedProperty = (at: string) => ({ owner_name: REMOVED_NAME, owner_email: null, owner_phone: null, address_line: null, notes: null, personal_data_deleted_at: at })
export const clearedOwnerMessage = { sender_name: REMOVED_NAME, body: REMOVED_TEXT }
export const clearedInspection = { notes: null, photo_paths: [] as string[] }
/** A managed-property document whose file was deleted: the row (label, date) stays; storage_path is NOT NULL. */
export const clearedDocument = { storage_path: '' }
export const clearedBuildProject = (at: string) => ({ name: REMOVED_NAME, phone: '', email: '', details: null, preferred_times: null, admin_notes: null, ip_hash: null, personal_data_deleted_at: at })
export const clearedPartnerApplication = (at: string) => ({ contact_name: REMOVED_NAME, email: REMOVED_EMAIL, phone: null, licence_details: null, message: null, admin_notes: null, ip_hash: null, personal_data_deleted_at: at })
export const clearedClaim = (at: string) => ({ claimant_name: REMOVED_NAME, claimant_phone: '', claimant_email: null, message: null, admin_notes: null, evidence_paths: [] as string[], personal_data_deleted_at: at })
export const clearedTradeAccount = (at: string) => ({ phone: '', tin: null, notes: null, admin_note: null, personal_data_deleted_at: at })
/** A do-not-contact supply contact keeps the business link, role, number and flag (D2). */
export const clearedDoNotContact = { name: REMOVED_NAME, whatsapp: null, telegram: null, email: null, consent_note: null }
/** An accepted invitation: email and token are no longer needed (token_hash is NOT NULL and unique). */
export const clearedInvitation = (id: string) => ({ email: '', token_hash: `removed:${id}` })

/** Storage paths this job may delete (private-docs bucket), by prefix: never anything else. */
export const DELETABLE_PREFIXES = {
  request: 'docs/request/',
  match: 'docs/match/',
  materials: 'docs/materials/',
  quote: 'docs/quote/',
  claim: 'docs/claim/',
  inspection: 'docs/inspection/',
  /** Managed-property documents shared in the owner portal. */
  agency: 'docs/agency/',
} as const

// ---------------------------------------------------------------------------------------------------------------
// audit_log: 6 years for money, records and data-protection decisions; 24 months for everything else (D3).
// Classified by action prefix. tests/unit/f5-keeping-periods.test.ts fails if any action in the code is unclassified.
// ---------------------------------------------------------------------------------------------------------------
export const AUDIT_SIX_YEARS = [
  'deal.',
  'supply.ledger.',
  'supply.order.',
  'supply.agreement.',
  'supply.quote.choose',
  'supply.report.export',
  'quote.issue',
  'service_request.commercial',
  'service_request.hagerland_quote',
  'jobs.desk.fee_',
  'jobs.desk.placement',
  'jobs.desk.free_replacement',
  'jobs.desk.consent',
  'jobs.report.export',
  'agency.instruction.terms',
  'agency.instruction.stage',
  'agency.tenancy.',
  'managed_property.statement',
  'trade_account.',
  // Data-protection decisions.
  'user.delete',
  'account.deletion_requested',
  'jobs.cleanup_mode',
  'jobs.retention_months',
  'imports.cleanup_mode',
  'imports.make_private_and_clear',
  'imports.google_cleared',
  'jobs.switch',
  'settings.update',
  'staff.role',
] as const

export const AUDIT_TWO_YEARS = [
  'admin.',
  'agency.',
  'area_guide.',
  'build_project.',
  'build_rate.',
  'callback.',
  'category.',
  'claim.',
  'cron.',
  'development.',
  'development_update.',
  'email.',
  'enquiry.',
  'export.',
  'guide.',
  'imports.',
  'interest.',
  'job.',
  'job_report.',
  'jobs.',
  'location.',
  'managed_property.',
  'media.',
  'organisation.',
  'partner.',
  'pillar.',
  'portfolio.',
  'product.',
  'product_category.',
  'promotion.',
  'property.',
  'property_care.',
  'quote.',
  'rates.',
  'report.',
  'review.',
  'service_category.',
  'service_request.',
  'staff.',
  'supply.',
  'user.',
  'verification.',
  'vertical.',
] as const

export type AuditKeep = 'six_years' | 'two_years' | null

/** How long an audit entry is kept: money and data-protection decisions 6 years, the rest 24 months. */
export function auditKeep(action: string): AuditKeep {
  if (AUDIT_SIX_YEARS.some((p) => action === p || action.startsWith(p))) return 'six_years'
  if (AUDIT_TWO_YEARS.some((p) => action.startsWith(p))) return 'two_years'
  return null
}

/** The always-on housekeeping (D4), for the digest: counts only, lines above 0 only (the digest filters zeros). */
export function alwaysOnDigestCounts(r: { errorsDeleted: number; invitationsDeleted: number; invitationsCleared: number } | null): [string, number][] {
  if (!r) return []
  return [
    [`Data clean-up: personal details deleted from ${r.errorsDeleted} old error records (always on)`, r.errorsDeleted],
    [`Data clean-up: personal details deleted from ${r.invitationsDeleted} expired invitations (always on)`, r.invitationsDeleted],
    [`Data clean-up: personal details deleted from ${r.invitationsCleared} accepted invitations (always on)`, r.invitationsCleared],
  ]
}
