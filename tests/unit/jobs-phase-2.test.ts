import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { EMPLOYMENT_TYPES, SCHEMA_EMPLOYMENT, TRADES, jobColumns, jobSchema } from '@/lib/jobs'
import { contactLinks, highlightedFields, phoneApplicationSchema, workerRegisterSchema } from '@/lib/jobs-phone'
import { addisDay, advertWarnings, canSeeCandidates, clearedApplication, clearedRegisterEntry, deletionCutoff, isDueForDeletion, twelveMonthsBefore } from '@/lib/jobs-privacy'
import { cleanupDigestCounts, runCleanupCore, type CleanupAdapter, type CleanupKind } from '@/lib/jobs-cleanup'
import { roleCanAccess } from '@/lib/admin/roles'

vi.mock('server-only', () => ({}))

const MIGRATION = readFileSync('supabase/migrations/0040_jobs_phase_2.sql', 'utf8')
const LOC = '66666666-7777-4888-8999-000000000000'
const JOB = '11111111-2222-4333-8444-555555555555'

describe('trades and daily labour (W-B1 to W-B3)', () => {
  it('lists the 26 approved trades in order, and the database check uses the same values', () => {
    expect(TRADES.map((t) => t.label)).toEqual(['Mason', 'Carpenter', 'Steel fixer', 'Electrician', 'Plumber', 'Painter', 'Tiler', 'Welder', 'Plasterer', 'Aluminium & glass fitter', 'Gypsum ceiling installer', 'Scaffolder', 'Labourer', 'Foreman', 'Site engineer', 'Quantity surveyor', 'Architect', 'Surveyor', 'Driver', 'Machine operator', 'Security guard', 'Cleaner', 'Store keeper', 'Office / admin', 'Sales', 'Other'])
    const check = /job_posts_trade_check check \(trade is null or trade in \(([\s\S]*?)\)\);/.exec(MIGRATION)?.[1] ?? ''
    expect(Array.from(check.matchAll(/'([a-z-]+)'/g)).map((m) => m[1])).toEqual(TRADES.map((t) => t.value))
  })
  it('"Daily labour" is a job type (PER_DIEM for search engines); the trade is optional and checked', () => {
    expect(EMPLOYMENT_TYPES.find((t) => t.value === 'daily_labour')?.label).toBe('Daily labour')
    expect(SCHEMA_EMPLOYMENT.daily_labour).toBe('PER_DIEM')
    const base = { title: 'Masons for a G+2', category: 'construction', employment_type: 'daily_labour', location_id: LOC, description: 'Block work on a G+2 house in Bole, six days a week.' }
    const ok = jobSchema.safeParse(base)
    expect(ok.success && jobColumns(ok.data).trade).toBeNull()
    const withTrade = jobSchema.safeParse({ ...base, trade: 'mason' })
    expect(withTrade.success && jobColumns(withTrade.data).trade).toBe('mason')
    expect(jobSchema.safeParse({ ...base, trade: 'astronaut' }).success).toBe(false)
  })
})

describe('apply by phone and the worker register (W-A, W-B)', () => {
  const valid = { job_id: JOB, name: 'Abebe Kebede', phone: '0911 234 567', trade: 'mason', area: 'Bole, Addis Ababa', preferred_contact: 'whatsapp', language: 'om', adult: 'on', consent: 'on' }
  it('accepts an Ethiopian mobile (normalised) and a foreign number written with its country code', () => {
    expect(phoneApplicationSchema.parse(valid).phone).toBe('+251911234567')
    expect(phoneApplicationSchema.parse({ ...valid, phone: '+447700900123' }).phone).toBe('+447700900123')
  })
  it('needs both ticks, a trade, an area and a listed contact method and language', () => {
    for (const bad of [{ adult: undefined }, { consent: undefined }, { trade: '' }, { area: '' }, { preferred_contact: 'pigeon' }, { language: 'fr' }]) {
      const r = phoneApplicationSchema.safeParse({ ...valid, ...bad })
      expect(r.success, JSON.stringify(bad)).toBe(false)
    }
    const r = phoneApplicationSchema.safeParse({ ...valid, adult: undefined, consent: undefined, phone: '12' })
    if (r.success) throw new Error('should fail')
    const f = highlightedFields(r.error)
    expect(f).toMatchObject({ adult: '', consent: '' })
    expect(f.phone).toBe('Enter a phone number starting with +251 or 09')
  })
  it('the register takes one or more trades', () => {
    const reg = { name: 'Abebe Kebede', phone: '0911234567', trades: ['mason', 'tiler'], area: 'Bole', availability: 'now', preferred_contact: 'call', language: 'am', adult: 'on', consent: 'on' }
    expect(workerRegisterSchema.parse(reg).trades).toEqual(['mason', 'tiler'])
    expect(workerRegisterSchema.safeParse({ ...reg, trades: [] }).success).toBe(false)
    expect(workerRegisterSchema.safeParse({ ...reg, trades: ['astronaut'] }).success).toBe(false)
    expect(workerRegisterSchema.safeParse({ ...reg, availability: 'someday' }).success).toBe(false)
  })
  it('shows all four contact buttons with the chosen method first (W-A20)', () => {
    expect(contactLinks('+251911234567', 'call').map((l) => l.label)).toEqual(['Call', 'WhatsApp', 'Telegram', 'SMS'])
    expect(contactLinks('+251911234567', 'telegram').map((l) => l.label)).toEqual(['Telegram', 'Call', 'WhatsApp', 'SMS'])
    expect(contactLinks('+251911234567', 'sms').map((l) => l.label)).toEqual(['SMS', 'Call', 'WhatsApp', 'Telegram'])
    expect(contactLinks('+251911234567', null).map((l) => l.href)).toEqual(['tel:+251911234567', 'https://wa.me/251911234567', 'https://t.me/+251911234567', 'sms:+251911234567'])
  })
  it('the forms and email use the approved wording verbatim', async () => {
    const form = readFileSync('components/jobs/PhoneApplyForm.tsx', 'utf8')
    const page = readFileSync('app/(site)/jobs/[slug]/apply-by-phone/page.tsx', 'utf8')
    const reg = readFileSync('components/jobs/WorkerRegisterForm.tsx', 'utf8')
    const jobs = readFileSync('app/(site)/jobs/page.tsx', 'utf8')
    const phone = await import('@/lib/jobs-phone')
    for (const s of ['Your name', 'Phone number', 'For example 0911 234 567', 'Your trade', 'Where do you live or work?', 'City, sub-city or area', 'How should they contact you?', 'Language', 'I am 18 or older', 'I agree that HagerLand shares my name, phone, trade and area with this employer so they can contact me about this job.', 'Never pay anyone to get a job.', 'See our Privacy Policy.', 'Send my application', 'Application sent', 'Your reference is {reference}. Keep it in case you need to contact HagerLand. The employer will contact you if they want to talk.'])
      expect(form, s).toContain(s)
    expect(page).toContain('No account or email needed. If the employer wants to talk, they will contact you on this number.')
    expect(page).toContain("t('Apply by phone')")
    for (const s of ['Your trades', 'When can you start?', 'How should we contact you?', 'I agree that HagerLand keeps my details to contact me about work. They are deleted 12 months after I last update them, and HagerLand will ask me before sharing my number with an employer.', 'Join the register', "Thank you. You're on the register. Your reference is {reference}."])
      expect(reg, s).toContain(s)
    for (const s of ['Find work by trade', 'Any trade', "Looking for work? Tell us you're available", 'Leave your phone number and trade. HagerLand may call you about suitable work. No account or email needed.']) expect(jobs, s).toContain(s)
    expect(phone.CONTACT_METHODS.map((c) => c.label)).toEqual(['Phone call', 'WhatsApp', 'Telegram', 'SMS'])
    expect(phone.LANGUAGES.map((c) => c.label)).toEqual(['Amharic', 'Afaan Oromo', 'Tigrinya', 'English'])
    expect(phone.REGISTER_AVAILABILITY.map((c) => c.label)).toEqual(['Now', 'Within a month'])
    expect(phone.PHONE_MESSAGES.duplicate).toBe("We couldn't send this application. If you've already applied for this job with this phone number, you don't need to apply again.")
    expect(phone.PHONE_MESSAGES.closed).toBe('This job is no longer open.')
    expect(phone.PHONE_MESSAGES.tooMany).toBe('You have sent several applications recently. Please try again later.')
    const T = await import('@/lib/email/templates')
    const base = { orgName: 'Bole Builders', title: 'Mason', reference: 'HLA-2026-000001', applicantName: 'Abebe', url: 'https://www.hagerland.com/account/jobs/x' }
    const byPhone = T.newApplicationEmail({ ...base, byPhone: true })
    expect(byPhone.subject).toBe('New application for Mason (HLA-2026-000001)')
    expect(byPhone.text).toContain('Abebe applied for "Mason" by phone. Open the application to see how to contact them.')
    expect(T.newApplicationEmail(base).text).toContain('Abebe applied for "Mason". Open the application to read the cover note and download the CV.')
  })
})

describe('candidate visibility (decision 2)', () => {
  const pub = { status: 'published', verification_level: 'listed' }
  it('verified, or a job approved by HagerLand that it has not removed', () => {
    expect(canSeeCandidates(pub, [])).toBe(false)
    expect(canSeeCandidates({ ...pub, verification_level: 'verified' }, [])).toBe(true)
    expect(canSeeCandidates(pub, [{ published_at: '2026-10-01T10:00:00Z', status: 'expired' }])).toBe(true)
    expect(canSeeCandidates(pub, [{ published_at: '2026-10-01T10:00:00Z', status: 'archived' }])).toBe(true)
    expect(canSeeCandidates(pub, [{ published_at: '2026-10-01T10:00:00Z', status: 'removed' }])).toBe(false)
    expect(canSeeCandidates(pub, [{ published_at: null, status: 'pending_review' }])).toBe(false)
    expect(canSeeCandidates({ ...pub, status: 'pending_review', verification_level: 'verified' }, [])).toBe(false)
  })
})

describe('12-month deletion dates (Addis Ababa, Q7)', () => {
  it('12 months earlier, with 29 February becoming the 28th', () => {
    expect(twelveMonthsBefore('2026-10-25')).toBe('2025-10-25')
    expect(twelveMonthsBefore('2028-02-29')).toBe('2027-02-28')
    expect(twelveMonthsBefore('2027-03-01')).toBe('2026-03-01')
  })
  it('uses the Addis Ababa day, not London or UTC', () => {
    // 21:30 UTC on 24 Oct 2025 is 22:30 in London (BST) but already 00:30 on 25 Oct in Addis Ababa.
    const applied = '2025-10-24T21:30:00Z'
    expect(addisDay(applied)).toBe('2025-10-25')
    expect(isDueForDeletion(applied, new Date('2026-10-24T20:59:00Z'))).toBe(false) // 23:59 on 24 Oct in Addis: one day before
    expect(isDueForDeletion(applied, new Date('2026-10-24T21:00:00Z'))).toBe(true) // 00:00 on 25 Oct in Addis: the 12-month date
    // 20:30 UTC on 24 Oct 2025 is 23:30 in Addis, still the 24th: due from 00:00 Addis on 24 Oct 2026.
    expect(isDueForDeletion('2025-10-24T20:30:00Z', new Date('2026-10-23T21:00:00Z'))).toBe(true)
    expect(isDueForDeletion('2025-10-24T20:30:00Z', new Date('2026-10-23T20:59:00Z'))).toBe(false)
    expect(deletionCutoff(new Date('2026-10-25T08:00:00Z'))).toBe('2025-10-25T21:00:00.000Z')
  })
  it('a leap-day application is deleted on 1 March of the next year', () => {
    const leap = '2028-02-29T09:00:00Z'
    expect(isDueForDeletion(leap, new Date('2029-02-28T09:00:00Z'))).toBe(false)
    expect(isDueForDeletion(leap, new Date('2029-03-01T09:00:00Z'))).toBe(true)
  })
  it('clears exactly the personal details and keeps the rest', () => {
    expect(Object.keys(clearedApplication('x')).sort()).toEqual(['area_text', 'cover_note', 'cv_path', 'email', 'employer_notes', 'language', 'name', 'personal_data_deleted_at', 'phone', 'preferred_contact'])
    expect(clearedApplication('x').name).toBe('Removed')
    expect(Object.keys(clearedRegisterEntry('x')).sort()).toEqual(['admin_notes', 'area_text', 'language', 'name', 'personal_data_deleted_at', 'phone', 'preferred_contact'])
  })
})

function fakeAdapter(due: Record<CleanupKind, string[]>, failing: string[] = []) {
  const cleared: string[] = []
  const adapter: CleanupAdapter = {
    countDue: async (k) => due[k].length,
    listDue: async (k, limit) => due[k].slice(0, limit),
    clear: async (k, id) => {
      if (failing.includes(id)) throw new Error('storage down')
      cleared.push(id)
      return { cvFileDeleted: k === 'applications' && id.endsWith('cv') }
    },
    countKept: async () => ({ hired: 0, periodNotSet: 0 }),
    trimHeld: async () => 0,
  }
  return { adapter, cleared }
}

describe('the deletion run (dry run first, failures isolated)', () => {
  const due = { applications: ['a1', 'a2-cv', 'a3'], register: ['w1'], emails: ['e1', 'e2'], shortlist: [] }
  it('dry run counts and changes nothing', async () => {
    const { adapter, cleared } = fakeAdapter(due)
    const r = await runCleanupCore(adapter, 'dry_run')
    expect(r.counts.due).toEqual({ applications: 3, register: 1, emails: 2, shortlist: 0 })
    expect(r.counts.cleared).toEqual({ applications: 0, register: 0, emails: 0, shortlist: 0 })
    expect(cleared).toEqual([])
    expect(cleanupDigestCounts(r).filter(([, n]) => n > 0).map(([l]) => l)).toEqual([
      'Jobs data (dry run): job applications whose personal details would be deleted',
      'Jobs data (dry run): worker register entries whose personal details would be deleted',
      'Jobs data (dry run): old queued emails whose personal details would be deleted',
    ])
  })
  it('live: one failing row is counted and the others are still cleared', async () => {
    const { adapter, cleared } = fakeAdapter(due, ['a2-cv'])
    const errors: string[] = []
    const r = await runCleanupCore(adapter, 'live', { onError: (_k, id) => errors.push(id) })
    expect(cleared).toEqual(['a1', 'a3', 'w1', 'e1', 'e2'])
    expect(r.counts.failed).toEqual({ applications: 1, register: 0, emails: 0, shortlist: 0 })
    expect(r.failures).toEqual([{ kind: 'applications', id: 'a2-cv' }])
    expect(errors).toEqual(['a2-cv'])
    expect(cleanupDigestCounts(r)).toContainEqual(['Jobs data: job applications that could not be cleared (retried tomorrow)', 1])
  })
  it('live: batches are limited and the rest wait for the next day', async () => {
    const { adapter, cleared } = fakeAdapter({ applications: ['a1', 'a2', 'a3'], register: [], emails: [], shortlist: [] })
    const r = await runCleanupCore(adapter, 'live', { batch: 2 })
    expect(cleared).toEqual(['a1', 'a2'])
    expect(r.counts.due.applications).toBe(3)
  })
})

describe('scam and fairness warnings (warnings only)', () => {
  it('flags money, passports, work abroad and unlawful requirements; leaves normal adverts alone', () => {
    expect(advertWarnings('Masons needed. Registration fee 500 birr.')).toHaveLength(1)
    expect(advertWarnings('Bring your passport to apply')[0]).toContain('passports')
    expect(advertWarnings('Cleaners for Dubai').some((w) => w.includes('abroad'))).toBe(true)
    expect(advertWarnings('Female only, age under 25').length).toBe(2)
    expect(advertWarnings('Site engineer for a G+12 building in Bole. Five years of experience with reinforced concrete.')).toEqual([])
  })
})

describe('admin access (Jobs Phase 2)', () => {
  it('the worker register is open to Owner and Operations only', () => {
    expect(roleCanAccess('operations', '/roodber8/jobs/register')).toBe(true)
    expect(roleCanAccess('owner', '/roodber8/jobs/register')).toBe(true)
    expect(roleCanAccess('agent', '/roodber8/jobs/register')).toBe(false)
    expect(roleCanAccess('content', '/roodber8/jobs/register')).toBe(false)
  })
  it('switches, deletion mode and the dry run are owner-only on the server; register edits are audited by reference', () => {
    const src = readFileSync('app/roodber8/actions/jobs-phase-2.ts', 'utf8')
    for (const name of ['setJobsSwitchAction', 'setJobsCleanupModeAction', 'runJobsDryRunAction']) {
      const body = src.split(`export async function ${name}`)[1].split('\nexport ')[0]
      expect(body, name).toMatch(/await assertAdmin\(AREA\)\s+await assertOwner\(\)/)
    }
    const page = readFileSync('app/roodber8/jobs/data/page.tsx', 'utf8')
    expect(page).toContain("if (!(await isOwnerSession())) redirect('/roodber8?denied=1')")
    expect(src).toContain("label: data.reference }, { status: parsed.data.status, notes_changed: true }")
  })
  it('public actions refuse while a switch is off (read fresh, never from the page cache)', () => {
    const src = readFileSync('app/actions/job-phone-actions.ts', 'utf8')
    expect(src).toContain('if (!(await readJobsSwitches()).phoneApply) return fail(PHONE_MESSAGES.unavailable)')
    expect(src).toContain('if (!(await readJobsSwitches()).workerRegister) return fail(PHONE_MESSAGES.unavailable)')
    expect(readFileSync('app/(site)/jobs/[slug]/apply-by-phone/page.tsx', 'utf8')).toContain('!switches.phoneApply) notFound()')
  })
})
