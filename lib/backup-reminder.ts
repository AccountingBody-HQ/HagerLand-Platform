import { todayAddis } from '@/lib/jobs-desk'

/** Fix F-6, BK-1: the internal Monday digest line about the weekly backup, which now runs on GitHub (docs/RUNBOOK.md section 1). */
export const BACKUP_REMINDER: [string, string] = ['Weekly backup', 'it runs automatically on GitHub every Monday. Check it succeeded: GitHub → Actions → Weekly backup.']

/** The reminder on Mondays by the Addis Ababa date, otherwise null. */
export function backupReminderLine(now: Date = new Date()): [string, string] | null {
  return new Date(`${todayAddis(now)}T00:00:00Z`).getUTCDay() === 1 ? BACKUP_REMINDER : null
}
