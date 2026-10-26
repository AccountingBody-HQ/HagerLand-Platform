// Jobs Phase 4: "Report this job". Pure: reasons (AB's approved wording W14), limits and the clearing rule shared by
// the form, the server action, admin, the daily deletion and the tests.
import { z } from 'zod'
import { optionalText } from '@/lib/validation/common'

export const REPORTS_SWITCH_KEY = 'jobs_reports_enabled'
export const PRIVATE_CLIENT_SWITCH_KEY = 'jobs_private_client_posts'

export const REPORT_REASONS = [
  { value: 'asks_for_money', label: 'Asks candidates for money' },
  { value: 'fake_or_scam', label: 'Looks fake or like a scam' },
  { value: 'wrong_or_misleading', label: 'Wrong or misleading information' },
  { value: 'unfair_or_discriminatory', label: 'Unfair or discriminatory requirements' },
  { value: 'work_outside_ethiopia', label: 'Work outside Ethiopia' },
  { value: 'filled_or_closed', label: 'The job is already filled or closed' },
  { value: 'something_else', label: 'Something else' },
] as const
export type ReportReason = (typeof REPORT_REASONS)[number]['value']
export const REPORT_REASON_VALUES = REPORT_REASONS.map((r) => r.value) as [ReportReason, ...ReportReason[]]
export const REPORT_REASON_LABEL: Record<string, string> = Object.fromEntries(REPORT_REASONS.map((r) => [r.value, r.label]))

/** Approved messages (W17, W18); the security check, "other" and "no reason" messages are the site's existing ones. */
export const REPORT_MESSAGES = {
  thanks: 'Thank you. HagerLand will look into this job.',
  tooMany: 'You have sent several reports recently. Please try again later.',
  security: 'Please complete the security check and try again.',
  failed: 'We could not send your report. Please try again.',
  noReason: 'Choose a reason',
} as const

/** Per connection (coded internet address): 5 an hour and 20 a day. */
export const REPORT_LIMITS = { hour: 5, day: 20 } as const

export const jobReportSchema = z.object({
  job_id: z.uuid(),
  reason: z.enum(REPORT_REASON_VALUES, { error: REPORT_MESSAGES.noReason }),
  details: optionalText(1000, 'Details'),
  contact: optionalText(254, 'Contact'),
})

/** "Jobs with 3 or more reports this week": different reporters within the last 7 days. */
export const MANY_REPORTS = 3

/** Personal details of a report are cleared 12 months after the later of the report and its handling. */
export function reportClockFrom(createdAt: string, handledAt: string | null): string {
  return handledAt && handledAt > createdAt ? handledAt : createdAt
}

/** What a report keeps after clearing: the row, job, reason, status, outcome and dates. */
export function clearedReport(deletedAt: string) {
  return { details: null, contact: null, reporter_user_id: null, ip_hash: null, personal_data_deleted_at: deletedAt }
}

/** Distinct reporters among reports (account if signed in, else the coded internet address, else the row). */
export function distinctReporters(rows: { id: string; reporter_user_id: string | null; ip_hash: string | null }[]): number {
  return new Set(rows.map((r) => r.reporter_user_id ?? r.ip_hash ?? r.id)).size
}
