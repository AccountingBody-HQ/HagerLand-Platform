import { todayAddis } from '@/lib/jobs-desk'

/** Fix F-6: the internal digest line that reminds HagerLand to run the weekly backup (docs/RUNBOOK.md section 1). */
export const BACKUP_REMINDER: [string, string] = ['Weekly reminder', 'run the backup (RUNBOOK §1).']

/** The reminder on Mondays by the Addis Ababa date, otherwise null. */
export function backupReminderLine(now: Date = new Date()): [string, string] | null {
  return new Date(`${todayAddis(now)}T00:00:00Z`).getUTCDay() === 1 ? BACKUP_REMINDER : null
}
