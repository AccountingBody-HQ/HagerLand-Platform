// Tidy T-2 (T2-9): the 12-month clearing of listing reports ("Report this listing", table reports). Pure: shared by the
// daily deletion job (lib/jobs-cleanup-data.ts) and the tests. The same Dry run / Live switch as the Jobs deletion.

/** The audit actions that record a decision on a listing report (app/roodber8/actions/moderation.ts). */
export const LISTING_REPORT_DECISIONS = ['report.actioned', 'report.dismissed'] as const

/**
 * The moment a listing report's 12 months run from: the later of the report and the decision. Reports decided before
 * migration 0045 have no handled_at; their decision time comes from the audit log (`auditDecidedAt`).
 */
export function listingReportClockFrom(createdAt: string, handledAt: string | null, auditDecidedAt: string | null = null): string {
  const decided = handledAt ?? auditDecidedAt
  return decided && decided > createdAt ? decided : createdAt
}

/** What a listing report keeps after clearing: the row, what was reported, the reason, the decision and the dates. */
export function clearedListingReport(deletedAt: string) {
  return { details: null, reporter_contact: null, ip_hash: null, personal_data_deleted_at: deletedAt }
}
