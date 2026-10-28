// Jobs Phase 2: the 12-month deletion of personal details (applications, worker register, old queued emails), and
// since Phase 3 the recruitment desk's shortlist rows. People hired through HagerLand are kept while their fee records
// need them (the hired-through-HagerLand exception) and counted as kept. The core is pure: it works on an adapter, so
// the rules and the failure handling are unit-tested; lib/jobs-cleanup-data.ts is the database adapter. One failing
// row is counted and left for the next day; it never stops the others.

export type CleanupKind = 'applications' | 'register' | 'emails' | 'shortlist' | 'reports' | 'callbacks'
export const CLEANUP_KINDS: CleanupKind[] = ['applications', 'register', 'emails', 'shortlist', 'reports', 'callbacks']

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
}

export interface CleanupResult {
  mode: 'dry_run' | 'live'
  counts: CleanupCounts
  /** Record ids that failed (never personal details). */
  failures: { kind: CleanupKind; id: string }[]
}

const zero = (): Record<CleanupKind, number> => ({ applications: 0, register: 0, emails: 0, shortlist: 0, reports: 0, callbacks: 0 })

export async function runCleanupCore(adapter: CleanupAdapter, mode: 'dry_run' | 'live', opts: { batch?: number; onError?: (kind: CleanupKind, id: string, err: unknown) => void } = {}): Promise<CleanupResult> {
  const counts: CleanupCounts = { due: zero(), cleared: zero(), failed: zero(), cvFilesDeleted: 0 }
  const failures: CleanupResult['failures'] = []
  for (const kind of CLEANUP_KINDS) {
    counts.due[kind] = await adapter.countDue(kind)
    if (mode !== 'live' || counts.due[kind] === 0) continue
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

const KIND_LABEL: Record<CleanupKind, string> = { applications: 'job applications', register: 'worker register entries', emails: 'old queued emails', shortlist: 'recruitment shortlist rows', reports: 'job reports', callbacks: 'call-back requests' }

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
  if (r.mode === 'dry_run') return [...CLEANUP_KINDS.map((k) => [`Jobs data (dry run): ${KIND_LABEL[k]} whose personal details would be deleted`, r.counts.due[k]] as [string, number]), ...keptLines(r.counts)]
  return [
    ...CLEANUP_KINDS.flatMap((k) => [
      [`Jobs data: personal details deleted from ${KIND_LABEL[k]}`, r.counts.cleared[k]] as [string, number],
      [`Jobs data: ${KIND_LABEL[k]} that could not be cleared (retried tomorrow)`, r.counts.failed[k]] as [string, number],
    ]),
    ...keptLines(r.counts),
  ]
}

/** One line per run for the admin page. */
export function cleanupRunText(mode: string, counts: CleanupCounts): string {
  // Runs logged before Phase 3 have no shortlist or kept counts: those parts are left out.
  const kinds = CLEANUP_KINDS.filter((k) => counts.due[k] !== undefined)
  const part = (k: CleanupKind) => (mode === 'live' ? `${counts.cleared[k]} of ${counts.due[k]} ${KIND_LABEL[k]} cleared${counts.failed[k] ? `, ${counts.failed[k]} failed` : ''}` : `${counts.due[k]} ${KIND_LABEL[k]} would be cleared`)
  const kept = counts.kept ? ` · kept: hired through HagerLand ${counts.kept.hired} · kept: period not set ${counts.kept.periodNotSet}` : ''
  return `${kinds.map(part).join(' · ')}${mode === 'live' && counts.cvFilesDeleted ? ` · ${counts.cvFilesDeleted} CV files deleted` : ''}${kept}`
}
