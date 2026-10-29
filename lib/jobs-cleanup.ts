// Jobs Phase 2: the 12-month deletion of personal details (applications, worker register, old queued emails), and
// since Phase 3 the recruitment desk's shortlist rows. People hired through HagerLand are kept while their fee records
// need them (the hired-through-HagerLand exception) and counted as kept. The core is pure: it works on an adapter, so
// the rules and the failure handling are unit-tested; lib/jobs-cleanup-data.ts is the database adapter. One failing
// row is counted and left for the next day; it never stops the others.

// Tidy T-2: listing reports ("Report this listing") use the same 12-month deletion and the same switch.
// F-5: the keeping periods (enquiries, service and quote requests, Property Care, claims, audit log… lib/retention.ts)
// run in the same run, under the same switch, with their own kinds.
import { BATCH_KINDS, DELETE_BATCH, RETENTION_KINDS, type RetentionKind } from '@/lib/retention'

export type JobsKind = 'applications' | 'register' | 'emails' | 'shortlist' | 'reports' | 'callbacks' | 'listing_reports'
export const JOBS_KINDS: JobsKind[] = ['applications', 'register', 'emails', 'shortlist', 'reports', 'callbacks', 'listing_reports']
export type CleanupKind = JobsKind | RetentionKind
export const CLEANUP_KINDS: CleanupKind[] = [...JOBS_KINDS, ...RETENTION_KINDS]

export interface CleanupCounts {
  /** Would be (dry run) or should be (live) cleared today. */
  due: Record<CleanupKind, number>
  cleared: Record<CleanupKind, number>
  failed: Record<CleanupKind, number>
  cvFilesDeleted: number
  /**
   * Records older than 12 months kept for a placement (Phase 3): within the keeping period ("hired"), or because the
   * keeping period is not set yet ("periodNotSet"). Runs before Phase 3 have no such counts.
   */
  kept?: { hired: number; periodNotSet: number }
  /** F-5: kinds whose records could not be read today (the failure rule: shown as "could not be read", never as 0). */
  unreadable?: CleanupKind[]
}

export interface CleanupAdapter {
  /** How many of each kind are due (all of them, not just this batch). */
  countDue(kind: CleanupKind): Promise<number>
  /** Ids due, at most `limit`. */
  listDue(kind: CleanupKind, limit: number): Promise<string[]>
  /** Clears one record's personal details; for applications returns whether a CV file was deleted. */
  clear(kind: CleanupKind, id: string): Promise<{ cvFileDeleted?: boolean }>
  /** Records older than 12 months held by a placement (never in the "due" lists above). */
  countKept(): Promise<{ hired: number; periodNotSet: number }>
  /** Live only: on held records, clears only what the exception does not keep (notes, cover notes). Returns how many. */
  trimHeld(): Promise<number>
  /** Batch kinds (BATCH_KINDS): clears or deletes up to DELETE_BATCH ids in one call; returns how many. */
  clearMany?(kind: CleanupKind, ids: string[]): Promise<number>
}

export interface CleanupResult {
  mode: 'dry_run' | 'live'
  counts: CleanupCounts
  /** Record ids that failed (never personal details). */
  failures: { kind: CleanupKind; id: string }[]
}

const zero = (): Record<CleanupKind, number> => Object.fromEntries(CLEANUP_KINDS.map((k) => [k, 0])) as Record<CleanupKind, number>

export async function runCleanupCore(adapter: CleanupAdapter, mode: 'dry_run' | 'live', opts: { batch?: number; onError?: (kind: CleanupKind, id: string, err: unknown) => void } = {}): Promise<CleanupResult> {
  const counts: CleanupCounts = { due: zero(), cleared: zero(), failed: zero(), cvFilesDeleted: 0 }
  const failures: CleanupResult['failures'] = []
  for (const kind of CLEANUP_KINDS) {
    // One kind that cannot be read is recorded and skipped; the other kinds still run (F-5).
    try {
      counts.due[kind] = await adapter.countDue(kind)
    } catch (err) {
      ;(counts.unreadable ??= []).push(kind)
      failures.push({ kind, id: 'count' })
      opts.onError?.(kind, 'count', err)
      continue
    }
    if (mode !== 'live' || counts.due[kind] === 0) continue
    if (adapter.clearMany && (BATCH_KINDS as readonly string[]).includes(kind)) {
      const ids = await adapter.listDue(kind, opts.batch ?? 500)
      for (let i = 0; i < ids.length; i += DELETE_BATCH) {
        const part = ids.slice(i, i + DELETE_BATCH)
        try {
          counts.cleared[kind] += await adapter.clearMany(kind, part)
        } catch (err) {
          counts.failed[kind] += part.length
          for (const id of part) failures.push({ kind, id })
          opts.onError?.(kind, part[0], err)
        }
      }
      continue
    }
    for (const id of await adapter.listDue(kind, opts.batch ?? 500)) {
      try {
        const r = await adapter.clear(kind, id)
        counts.cleared[kind]++
        if (r.cvFileDeleted) counts.cvFilesDeleted++
      } catch (err) {
        counts.failed[kind]++
        failures.push({ kind, id })
        opts.onError?.(kind, id, err)
      }
    }
  }
  counts.kept = await adapter.countKept()
  if (mode === 'live') {
    try {
      await adapter.trimHeld()
    } catch (err) {
      opts.onError?.('shortlist', 'held', err)
    }
  }
  return { mode, counts, failures }
}

export const KIND_LABEL: Record<CleanupKind, string> = {
  applications: 'job applications',
  register: 'worker register entries',
  emails: 'old queued emails',
  shortlist: 'recruitment shortlist rows',
  reports: 'job reports',
  callbacks: 'call-back requests',
  listing_reports: 'listing reports',
  enquiries: 'enquiries',
  service_requests: 'service requests',
  quote_requests: 'quote requests',
  property_care: 'Property Care enquiries',
  managed_properties: 'managed properties',
  build_projects: 'building projects',
  partner_applications: 'partner applications',
  claims: 'business claims',
  trade_accounts: 'trade account applications',
  supply_contacts: 'supply contacts',
  audit_log: 'audit log entries',
}

/** The two Phase 3 counts, in the owner's words (AB's names: "kept: hired through HagerLand", "kept: period not set"). */
function keptLines(counts: CleanupCounts): [string, number][] {
  if (!counts.kept) return []
  return [
    ['Jobs data: kept: hired through HagerLand', counts.kept.hired],
    ['Jobs data: kept: period not set', counts.kept.periodNotSet],
  ]
}

/** Counts only, for the admin digest (dry run: what would be cleared; live: what was cleared and what failed). */
export function cleanupDigestCounts(r: CleanupResult | null): [string, number][] {
  if (!r) return []
  const isJobs = (k: CleanupKind) => (JOBS_KINDS as CleanupKind[]).includes(k)
  // Runs logged before F-5 have no keeping-period kinds: those lines are left out.
  const kinds = CLEANUP_KINDS.filter((k) => r.counts.due[k] !== undefined)
  if (r.mode === 'dry_run')
    return [
      ...kinds.map((k) => (isJobs(k) ? [`Jobs data (dry run): ${KIND_LABEL[k]} whose personal details would be deleted`, r.counts.due[k]] : [`Data clean-up (dry run): ${r.counts.due[k]} ${KIND_LABEL[k]} whose personal details would be deleted`, r.counts.due[k]]) as [string, number]),
      ...keptLines(r.counts),
    ]
  return [
    ...kinds.flatMap((k) =>
      isJobs(k)
        ? [
            [`Jobs data: personal details deleted from ${KIND_LABEL[k]}`, r.counts.cleared[k]] as [string, number],
            [`Jobs data: ${KIND_LABEL[k]} that could not be cleared (retried tomorrow)`, r.counts.failed[k]] as [string, number],
          ]
        : [
            [`Data clean-up: personal details deleted from ${r.counts.cleared[k]} ${KIND_LABEL[k]}`, r.counts.cleared[k]] as [string, number],
            [`${r.counts.failed[k]} ${KIND_LABEL[k]} could not be cleared (retried tomorrow)`, r.counts.failed[k]] as [string, number],
          ],
    ),
    ...keptLines(r.counts),
  ]
}

/** Kinds that could not be read, for the digest's "Could not read: …" line (never shown as a count of 0). */
export function cleanupUnreadable(r: CleanupResult | null): string[] {
  return (r?.counts.unreadable ?? []).map((k) => `${(JOBS_KINDS as CleanupKind[]).includes(k) ? 'Jobs data' : 'Data clean-up'}: ${KIND_LABEL[k]}`)
}

/** One line per run for the admin page. */
export function cleanupRunText(mode: string, counts: CleanupCounts): string {
  // Runs logged before Phase 3 have no shortlist or kept counts: those parts are left out.
  const kinds = CLEANUP_KINDS.filter((k) => counts.due[k] !== undefined)
  const part = (k: CleanupKind) => (counts.unreadable?.includes(k) ? `${KIND_LABEL[k]} could not be read` : mode === 'live' ? `${counts.cleared[k]} of ${counts.due[k]} ${KIND_LABEL[k]} cleared${counts.failed[k] ? `, ${counts.failed[k]} failed` : ''}` : `${counts.due[k]} ${KIND_LABEL[k]} would be cleared`)
  const kept = counts.kept ? ` · kept: hired through HagerLand ${counts.kept.hired} · kept: period not set ${counts.kept.periodNotSet}` : ''
  return `${kinds.map(part).join(' · ')}${mode === 'live' && counts.cvFilesDeleted ? ` · ${counts.cvFilesDeleted} CV files deleted` : ''}${kept}`
}
