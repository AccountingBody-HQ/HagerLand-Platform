// Fix F-2: the texts of the daily digest that make silence meaningful (the digest is sent every day), and the
// "last daily run" check on the admin home. Pure functions only, so they are unit-tested (tests/unit/f2-fail-loudly.test.ts).

const HOUR = 3_600_000
const DAY = 24 * HOUR

/** The audit_log action written once per daily run (lib/cron/daily.ts) and read by the admin home. */
export const DAILY_RUN_ACTION = 'cron.daily'

/** No run recorded for longer than this: the admin home warns (the job runs every 24 hours, at 06:00 UTC). */
export const LAST_RUN_WARN_HOURS = 26

export const NOTHING_TODAY = 'Nothing needs your attention today.'
export const ATTENTION_TODAY = 'Here is what needs attention today.'
export const NO_RECENT_RUN = 'The daily job has not run in the last 26 hours — check Vercel (RUNBOOK §11).'

/** A count or section that could not be read: a line of its own, never left out or shown as 0. */
export const COULD_NOT_READ = 'Could not read'

/** Account deletion requests older than this are marked urgent (the privacy policy promises deletion within 30 days). */
export const DELETION_URGENT_DAYS = 21

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

const hhmm = (at: Date, timeZone: string) => new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at)

/** "28 Oct 2026, 07:00" in London time (the owner's time). */
export function londonDateTime(at: Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at)
}

/** The digest's first line: "Daily job ran at 06:00 UTC (07:00 London time): 21 steps OK, 0 failed." */
export function runLine(at: Date, ok: number, failed: number): string {
  return `Daily job ran at ${hhmm(at, 'UTC')} UTC (${hhmm(at, 'Europe/London')} London time): ${plural(ok, 'step')} OK, ${failed} failed.`
}

/** The failed steps by name, after the run line; null when every step worked. */
export function failedStepsLine(names: readonly string[]): string | null {
  return names.length ? `Steps that failed: ${names.join(', ')}.` : null
}

/** "Account deletion requests waiting: 2 (oldest 5 days; promised within 30)", marked urgent from 21 days; null when none. */
export function deletionRequestsLine(count: number, oldestAt: string | null, now: number): { line: [string, string]; urgent: boolean } | null {
  if (count <= 0) return null
  const days = oldestAt ? Math.max(0, Math.floor((now - new Date(oldestAt).getTime()) / DAY)) : 0
  const urgent = days >= DELETION_URGENT_DAYS
  return { line: [`${urgent ? 'URGENT: ' : ''}Account deletion requests waiting`, `${count} (oldest ${plural(days, 'day')}; promised within 30)`], urgent }
}

/**
 * What kind of problem stopped the digest being built, for the fallback email. Only a short category or the error's
 * type (such as "TypeError"), never its message, so no data, address or secret can reach the email.
 */
export function problemKind(err: unknown): string {
  const message = err instanceof Error ? err.message : ''
  if (message.startsWith('Could not read from the database')) return 'a database read failed'
  if (/^More than [\d,]+ rows/.test(message)) return 'too many rows to read'
  if (err instanceof Error && err.name && err.name !== 'Error') return `an unexpected error (${err.name})`
  return 'an unexpected error'
}

/** The fallback email's line when the summary itself could not be built. */
export function fallbackLine(err: unknown): string {
  return `Daily job ran but the summary could not be built: ${problemKind(err)}.`
}

export interface DailyRunRecord {
  created_at: string
  diff: unknown
}

/** The admin home's "Last daily run" line, and whether to warn that no run was recorded in the last 26 hours. */
export function lastRunStatus(record: DailyRunRecord | null, now: number): { line: string | null; warning: boolean } {
  if (!record) return { line: null, warning: true }
  const d = (record.diff ?? {}) as { steps_ok?: unknown; steps_failed?: unknown; digest_sent?: unknown }
  const ok = typeof d.steps_ok === 'number' ? d.steps_ok : 0
  const failed = typeof d.steps_failed === 'number' ? d.steps_failed : 0
  const digest = d.digest_sent === true ? 'digest sent' : 'digest not sent'
  return {
    line: `Last daily run: ${londonDateTime(new Date(record.created_at))} (London) — ${plural(ok, 'step')} OK, ${failed} failed, ${digest}.`,
    warning: now - new Date(record.created_at).getTime() > LAST_RUN_WARN_HOURS * HOUR,
  }
}
