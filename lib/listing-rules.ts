/** What resuming a paused listing should do (spec 6.8). */
export function resumeOutcome(row: { expires_at: string | null; pending_changes: unknown }, now: number): 'expire' | 'review' | 'publish' {
  if (!row.expires_at || new Date(row.expires_at).getTime() < now) return 'expire'
  const changes = row.pending_changes
  if (changes && typeof changes === 'object' && Object.keys(changes as Record<string, unknown>).length > 0) return 'review'
  return 'publish'
}

/** Renewal is allowed in the last 14 days before expiry, or within 30 days after it. */
export function canRenew(row: { status: string; expires_at: string | null }, now: number): boolean {
  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : 0
  if (row.status === 'expired') return now - expiresAt < 30 * 86_400_000
  if (row.status === 'published') return expiresAt - now < 14 * 86_400_000
  return false
}

/** A quote is valid for this many days after it is issued; the daily job then marks it expired. */
export const QUOTE_VALID_DAYS = 14
