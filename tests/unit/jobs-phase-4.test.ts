import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { badgeExplain, hasEnded, inReminderWindow, isLiveRecord, legacyEndsOn, levelAfterBadge, privateClientApproval, recordEndsOn, recheckEndsOn, reminderDay, validUntil } from '@/lib/verification'
import { REPORT_LIMITS, REPORT_MESSAGES, REPORT_REASONS, clearedReport, distinctReporters, jobReportSchema, reportClockFrom } from '@/lib/job-reports'
import { advertWarnings, deletionCutoff, privateClientWarnings } from '@/lib/jobs-privacy'
import { runCleanupCore, cleanupDigestCounts, type CleanupAdapter } from '@/lib/jobs-cleanup'
import { roleCanAccess } from '@/lib/admin/roles'
import { badgeEndingEmail, jobPausedEmail } from '@/lib/email/templates'

/** Jobs Phase 4 (migration 0042): verification standard, "Report this job", private-client jobs. Addis = UTC+3. */

const fmt = (d: string) => d

describe('the recorded check: how long a badge lasts (Addis dates)', () => {
  it('12 months from the check, or the licence expiry if sooner', () => {
    expect(validUntil('2026-11-01T09:00:00Z', null)).toBe('2027-11-01')
    expect(validUntil('2026-11-01T09:00:00Z', '2027-03-31')).toBe('2027-03-31')
    expect(validUntil('2026-11-01T09:00:00Z', '2028-01-01')).toBe('2027-11-01')
    expect(validUntil('2028-02-29T09:00:00Z', null)).toBe('2029-02-28')
  })
  it('the check day is the Addis day: 21:00 UTC is already the next day', () => {
    expect(validUntil('2026-10-31T20:59:00Z', null)).toBe('2027-10-31')
    expect(validUntil('2026-10-31T21:00:00Z', null)).toBe('2027-11-01')
  })
  it('live until the last day; reminder window from 30 days before; ended the day after', () => {
    const r = { status: 'active', valid_until: '2027-11-01', verified_at: '2026-11-01T09:00:00Z' }
    expect(isLiveRecord(r, '2027-11-01')).toBe(true)
    expect(isLiveRecord(r, '2027-11-02')).toBe(false)
    expect(isLiveRecord({ ...r, status: 'revoked' }, '2027-01-01')).toBe(false)
    expect(reminderDay('2027-11-01')).toBe('2027-10-02')
    expect(inReminderWindow('2027-11-01', '2027-10-01')).toBe(false)
    expect(inReminderWindow('2027-11-01', '2027-10-02')).toBe(true)
    expect(inReminderWindow('2027-11-01', '2027-11-01')).toBe(true)
    expect(hasEnded('2027-11-01', '2027-11-01')).toBe(false)
    expect(hasEnded('2027-11-01', '2027-11-02')).toBe(true)
  })
  it('a "needs re-check" record ends 30 days after it was flagged, unless its end date is sooner', () => {
    expect(recheckEndsOn('2027-01-10T22:00:00Z')).toBe('2027-02-10')
    const r = { status: 'needs_recheck', valid_until: '2027-11-01', verified_at: '2026-11-01T09:00:00Z', needs_recheck_since: '2027-01-10T08:00:00Z' }
    expect(recordEndsOn(r)).toBe('2027-02-09')
    expect(recordEndsOn({ ...r, valid_until: '2027-01-20' })).toBe('2027-01-20')
  })
  it('F3: legacy badges end 90 days after the owner switches the clean-up on; the reminder is 30 days before', () => {
    expect(legacyEndsOn('2026-11-01')).toBe('2027-01-30')
    expect(reminderDay(legacyEndsOn('2026-11-01'))).toBe('2026-12-31')
  })
  it('a business keeps "Claimed" if someone manages it, else "Listed"', () => {
    expect(levelAfterBadge(true)).toBe('claimed')
    expect(levelAfterBadge(false)).toBe('listed')
  })
})

describe('badge wording (F5): new wording only with a live recorded check; legacy wording unchanged', () => {
  const legacy = "Verified: HagerLand checked this business's trade licence."
  it('new standard', () => {
    expect(badgeExplain('verified', '2025-01-01', { verified_at: '2026-11-01', ends_on: '2027-11-01' }, fmt, legacy)).toBe("Verified: HagerLand checked this business's trade licence and tax number on 2026-11-01. Next check due by 2027-11-01.")
    expect(badgeExplain('verified', null, { verified_at: '', ends_on: '2027-11-01' }, fmt, legacy)).toBe("Verified: HagerLand checked this business's trade licence and tax number.")
  })
  it('legacy keeps today’s exact texts', () => {
    expect(badgeExplain('verified', '2025-01-01', null, fmt, legacy)).toBe("Verified: HagerLand checked this business's trade licence on 2025-01-01.")
    expect(badgeExplain('verified', null, null, fmt, legacy)).toBe(legacy)
    expect(badgeExplain('claimed', null, null, fmt, 'Claimed text')).toBe('Claimed text')
  })
})

describe('F1: four-eyes on private-client jobs', () => {
  it('someone else may approve; the creator may not, except the owner with a reason', () => {
    expect(privateClientApproval('staff:ops@x', 'admin', true, null)).toBe('ok')
    expect(privateClientApproval('staff:ops@x', 'staff:ops@x', false, 'please')).toBe('refused')
    expect(privateClientApproval('admin', 'admin', true, '')).toBe('needs_reason')
    expect(privateClientApproval('admin', 'admin', true, '   ')).toBe('needs_reason')
    expect(privateClientApproval('admin', 'admin', true, 'Urgent: client starts Monday')).toBe('ok')
    expect(privateClientApproval(null, 'admin', false, null)).toBe('ok')
  })
})

describe('"Report this job"', () => {
  it('the approved reasons and messages', () => {
    expect(REPORT_REASONS.map((r) => r.label)).toEqual(['Asks candidates for money', 'Looks fake or like a scam', 'Wrong or misleading information', 'Unfair or discriminatory requirements', 'Work outside Ethiopia', 'The job is already filled or closed', 'Something else'])
    expect(REPORT_MESSAGES.thanks).toBe('Thank you. HagerLand will look into this job.')
    expect(REPORT_MESSAGES.tooMany).toBe('You have sent several reports recently. Please try again later.')
    expect(REPORT_LIMITS).toEqual({ hour: 5, day: 20 })
  })
  it('a reason is required; details and contact are capped', () => {
    expect(jobReportSchema.safeParse({ job_id: '0b0d1c1e-0000-4000-8000-000000000000' }).error?.issues[0]?.message).toBe('Choose a reason')
    expect(jobReportSchema.safeParse({ job_id: '0b0d1c1e-0000-4000-8000-000000000000', reason: 'asks_for_money', details: 'x'.repeat(1001) }).success).toBe(false)
    expect(jobReportSchema.safeParse({ job_id: '0b0d1c1e-0000-4000-8000-000000000000', reason: 'asks_for_money', details: 'They asked 500 birr' }).success).toBe(true)
  })
  it('distinct reporters: account, else coded address', () => {
    expect(distinctReporters([{ id: '1', reporter_user_id: null, ip_hash: 'a' }, { id: '2', reporter_user_id: null, ip_hash: 'a' }, { id: '3', reporter_user_id: 'u', ip_hash: 'b' }])).toBe(2)
  })
  it('personal details are cleared 12 months after the later of the report and its handling (Addis days)', () => {
    expect(reportClockFrom('2026-11-01T09:00:00Z', null)).toBe('2026-11-01T09:00:00Z')
    expect(reportClockFrom('2026-11-01T09:00:00Z', '2026-12-01T09:00:00Z')).toBe('2026-12-01T09:00:00Z')
    expect(Object.keys(clearedReport('x')).sort()).toEqual(['contact', 'details', 'ip_hash', 'personal_data_deleted_at', 'reporter_user_id'])
    // Handled 1 Dec 2026 (Addis): kept on 30 Nov 2027, due from the start of 1 Dec 2027 Addis time.
    const clock = reportClockFrom('2026-11-01T09:00:00Z', '2026-12-01T09:00:00Z')
    expect(clock < deletionCutoff(new Date('2027-11-30T20:59:00Z'))).toBe(false)
    expect(clock < deletionCutoff(new Date('2027-11-30T21:00:00Z'))).toBe(true)
  })
  it('the deletion run counts job reports (Dry run changes nothing)', async () => {
    const cleared: string[] = []
    const a: CleanupAdapter = {
      countDue: async (k) => (k === 'reports' ? 2 : 0),
      listDue: async (k) => (k === 'reports' ? ['r1', 'r2'] : []),
      clear: async (_k, id) => (cleared.push(id), {}),
      countKept: async () => ({ hired: 0, periodNotSet: 0 }),
      trimHeld: async () => 0,
    }
    const dry = await runCleanupCore(a, 'dry_run')
    expect(dry.counts.due.reports).toBe(2)
    expect(cleared).toEqual([])
    expect(cleanupDigestCounts(dry)).toContainEqual(['Jobs data (dry run): job reports whose personal details would be deleted', 2])
    const live = await runCleanupCore(a, 'live')
    expect(live.counts.cleared.reports).toBe(2)
  })
})

describe('advert warnings (admin only)', () => {
  it('contact details inside the advert', () => {
    for (const t of ['Call 0911223344 to apply', 'Phone +251 91 122 3344', 'Send CV to jobs@example.com', 'Join t.me/masonjobs', 'Message @abebe_jobs', 'Contact us on Telegram'])
      expect(advertWarnings(t).some((w) => w.startsWith('Contact details in the advert')), t).toBe(true)
    expect(advertWarnings('Site engineer for a G+12 building in Bole. Five years of experience with reinforced concrete.')).toEqual([])
  })
  it('private-client identity hints', () => {
    expect(privateClientWarnings('House for Ato Kebede in Bole')).toHaveLength(1)
    expect(privateClientWarnings('Work at plot no 1234, kebele 05')).toHaveLength(1)
    expect(privateClientWarnings('Masons for a G+1 house in Bole sub-city.')).toEqual([])
  })
})

describe('emails (approved wording)', () => {
  it('W20 and W21', () => {
    const p = jobPausedEmail({ title: 'Masons for G+2' })
    expect(p.subject).toBe('Your job advert is paused while we check it')
    expect(p.text).toContain('We have paused your job "Masons for G+2" while we check it. We will be in touch if we need anything from you.')
    const b = badgeEndingEmail({ date: '1 November 2027', link: 'https://www.hagerland.com/account/company/verification' })
    expect(b.subject).toBe('Your HagerLand Verified badge ends on 1 November 2027')
    expect(b.text).toContain("To keep the Verified badge, upload your current trade licence in your account. If we don't hear from you, the badge will end on 1 November 2027.")
    expect(b.html).toContain('Keep my badge')
  })
})

describe('roles and server checks', () => {
  it('Owner and Operations handle verification and reports; Agent and Content do not', () => {
    expect(roleCanAccess('operations', '/roodber8/organisations')).toBe(true)
    expect(roleCanAccess('operations', '/roodber8/jobs/reports')).toBe(true)
    for (const r of ['agent', 'content'] as const) {
      expect(roleCanAccess(r, '/roodber8/organisations')).toBe(false)
      expect(roleCanAccess(r, '/roodber8/jobs/reports')).toBe(false)
    }
  })
  it('every verification action checks Owner or Operations on the server', () => {
    const v = readFileSync('app/roodber8/actions/verification.ts', 'utf8')
    for (const name of ['recordVerificationCheckAction', 'revokeBadgeAction']) expect(v.split(`export async function ${name}`)[1].split('\nexport ')[0], name).toMatch(/await assertAdmin\(AREA\)\s+await assertOwnerOrOperations\(\)/)
    const m = readFileSync('app/roodber8/actions/moderation.ts', 'utf8')
    expect(m.split('export async function verificationDecisionAction')[1].split('\nexport ')[0]).toMatch(/await assertOwnerOrOperations\(\)/)
    const o = readFileSync('app/roodber8/actions/organisations.ts', 'utf8')
    expect(o).toContain('To give the Verified badge, use “Record verification check”.')
  })
  it('private-client creation and approval respect the switch; approval enforces four-eyes', () => {
    const desk = readFileSync('app/roodber8/actions/jobs-desk.ts', 'utf8')
    expect(desk.split('export async function createPrivateClientJobAction')[1]).toMatch(/if \(!\(await readJobsSwitches\(\)\)\.privateClientPosts\) return fail/)
    const jobs = readFileSync('app/roodber8/actions/jobs.ts', 'utf8')
    expect(jobs).toMatch(/if \(!\(await readJobsSwitches\(\)\)\.privateClientPosts\) return fail\('Private-client jobs are switched off\.'\)/)
    expect(jobs).toContain('privateClientApproval(job.created_by_staff, actor, await isOwnerSession(), note)')
  })
  it('the report button is hidden and refused when the switch is off', () => {
    expect(readFileSync('app/(site)/jobs/[slug]/page.tsx', 'utf8')).toMatch(/\{switches\.reportsEnabled && \(\s+<ReportJob/)
    expect(readFileSync('app/actions/job-report-actions.ts', 'utf8')).toMatch(/if \(!\(await readJobsSwitches\(\)\)\.reportsEnabled\) return fail/)
  })
  it('applications to private-client jobs go to HagerLand only', () => {
    for (const f of ['app/actions/job-actions.ts', 'app/actions/job-phone-actions.ts']) expect(readFileSync(f, 'utf8'), f).toMatch(/privateClient \? \(inbox \? \[inbox\] : \[\]\) : await orgManagerEmails/)
  })
})
