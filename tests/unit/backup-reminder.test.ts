import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { BACKUP_REMINDER, backupReminderLine } from '@/lib/backup-reminder'

vi.mock('server-only', () => ({}))

// Fix F-6: the weekly backup reminder in the daily digest. 2 Nov 2026 is a Monday.
describe('weekly backup reminder (digest)', () => {
  it('appears on Mondays by the Addis Ababa date, including at the daily job time (06:00 UTC = 09:00 Addis)', () => {
    expect(backupReminderLine(new Date('2026-11-02T06:00:00Z'))).toEqual(['Weekly reminder', 'run the backup (RUNBOOK §1).'])
    // Sunday 21:30 UTC is already Monday 00:30 in Addis Ababa.
    expect(backupReminderLine(new Date('2026-11-01T21:30:00Z'))).toEqual(BACKUP_REMINDER)
    expect(backupReminderLine(new Date('2026-11-09T06:00:00Z'))).toEqual(BACKUP_REMINDER)
  })
  it('does not appear on any other day', () => {
    // Monday 21:30 UTC is Tuesday 00:30 in Addis Ababa.
    expect(backupReminderLine(new Date('2026-11-02T21:30:00Z'))).toBeNull()
    for (const day of ['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-03', '2026-11-04']) {
      expect(backupReminderLine(new Date(`${day}T06:00:00Z`)), day).toBeNull()
    }
  })
  it('reads as one internal line in the digest email', async () => {
    const { adminDigestEmail } = await import('@/lib/email/templates')
    const email = adminDigestEmail({ lines: [BACKUP_REMINDER], adminUrl: 'https://www.hagerland.com/roodber8' })
    expect(email.text).toContain('Weekly reminder: run the backup (RUNBOOK §1).')
  })
  it('is failure-isolated in the daily job: a problem logs an error and the digest carries on', () => {
    const src = readFileSync('lib/cron/daily.ts', 'utf8')
    const block = src.slice(src.indexOf('// Fix F-6: every Monday'), src.indexOf('return lines', src.indexOf('// Fix F-6: every Monday')))
    expect(block).toContain('try {')
    expect(block).toContain('const reminder = backupReminderLine(new Date(now))')
    expect(block).toContain("} catch (err) {\n    log.error('cron', 'backup reminder failed', err)\n  }")
    // It is added after every other line, just before the digest lines are returned.
    expect(src.indexOf('backupReminderLine(new Date(now))')).toBeGreaterThan(src.indexOf("lines.push([`Error ×${e.count}`"))
  })
})
