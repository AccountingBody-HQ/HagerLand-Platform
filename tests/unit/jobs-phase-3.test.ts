import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GUARANTEE_DAYS,
  addDays,
  addMonths,
  canReverse,
  clearedShortlistRow,
  deskSeesContact,
  employerContactButtons,
  employerSeesContact,
  feeTotals,
  firstNameOf,
  guaranteeEndsOn,
  guaranteeEndsSoon,
  hasLiveConsent,
  introductionBlocker,
  leftInsideGuarantee,
  nextPlacementStatus,
  percentageFeeMinor,
  placementHold,
  profileRefRange,
  retainUntil,
  shortlistClockFrom,
  shortlistDueForDeletion,
  todayAddis,
  type ConsentState,
  type Shares,
} from '@/lib/jobs-desk'
import { ABROAD_COUNTRIES, EMPLOYER_ABROAD_TEXT, employerAbroadAnswers, employerAbroadLines, parseEmployerAbroad, readEmployerAbroad } from '@/lib/service-requests/employer-abroad'
import { requestFormCopy } from '@/lib/service-requests/form-copy'
import { runCleanupCore, cleanupDigestCounts, cleanupRunText, type CleanupAdapter, type CleanupCounts } from '@/lib/jobs-cleanup'
import { roleCanAccess } from '@/lib/admin/roles'
import { placementConfirmedEmail, recruitmentIntroductionEmail } from '@/lib/email/templates'

/** Jobs Phase 3 (migration 0041): the recruitment desk's rules. Dates are Addis Ababa calendar days (UTC+3). */

const base: ConsentState = { consent_at: null, consent_withdrawn_at: null, declined_at: null, adult_confirmed_at: null, introduced_at: null, personal_data_deleted_at: null, name: 'Abebe Kebede' }
const T0 = '2026-11-01T08:00:00Z'

describe('consent and 18+ before an introduction (mirrors the database check)', () => {
  it('needs recorded consent, then a confirmed 18+, then a name', () => {
    expect(introductionBlocker(base)).toBe('Record their consent first.')
    expect(introductionBlocker({ ...base, consent_at: T0 })).toBe('Confirm they are 18 or older first.')
    expect(introductionBlocker({ ...base, consent_at: T0, adult_confirmed_at: T0, name: null })).toBe('Add their name first.')
    expect(introductionBlocker({ ...base, consent_at: T0, adult_confirmed_at: T0 })).toBeNull()
  })
  it('never after a refusal, a withdrawal, a deletion, or twice', () => {
    expect(introductionBlocker({ ...base, declined_at: T0, adult_confirmed_at: T0 })).toBe('This person said no.')
    expect(introductionBlocker({ ...base, consent_at: T0, consent_withdrawn_at: T0, adult_confirmed_at: T0 })).toBe('This person withdrew consent.')
    expect(introductionBlocker({ ...base, consent_at: T0, adult_confirmed_at: T0, personal_data_deleted_at: T0 })).toBe('Personal details were deleted.')
    expect(introductionBlocker({ ...base, consent_at: T0, adult_confirmed_at: T0, introduced_at: T0 })).toBe('Already introduced.')
  })
  it('live consent means recorded, not withdrawn and not refused', () => {
    expect(hasLiveConsent({ ...base, consent_at: T0 })).toBe(true)
    expect(hasLiveConsent({ ...base, consent_at: T0, consent_withdrawn_at: T0 })).toBe(false)
    expect(hasLiveConsent(base)).toBe(false)
  })
})

describe('what the employer and the desk may see', () => {
  const shares: Shares = { share_phone: true, share_whatsapp: false, share_telegram: true, share_sms: false, share_email: true }
  it('the employer sees contact details only for introduced people whose consent stands', () => {
    expect(employerSeesContact({ ...base, consent_at: T0, introduced_at: T0 })).toBe(true)
    expect(employerSeesContact({ ...base, consent_at: T0, introduced_at: T0, consent_withdrawn_at: T0 })).toBe(false)
    expect(employerSeesContact({ ...base, consent_at: T0 })).toBe(false)
    expect(employerSeesContact({ ...base, consent_at: T0, introduced_at: T0, personal_data_deleted_at: T0 })).toBe(false)
  })
  it('only the methods the person agreed to share, in the approved order', () => {
    expect(employerContactButtons(shares, '+251911223344', 'a@example.com')).toEqual([
      { label: 'Call', href: 'tel:+251911223344' },
      { label: 'Telegram', href: 'https://t.me/+251911223344' },
      { label: 'Email', href: 'mailto:a@example.com' },
    ])
    expect(employerContactButtons({ ...shares, share_email: false }, null, null)).toEqual([])
  })
  it('another employer’s applicant: reference and trade only until they agree to this employer', () => {
    expect(deskSeesContact({ other_employer: true, consent_at: null })).toBe(false)
    expect(deskSeesContact({ other_employer: true, consent_at: T0 })).toBe(true)
    expect(deskSeesContact({ other_employer: false, consent_at: null })).toBe(true)
  })
  it('first name for the "no longer available" line; candidate references', () => {
    expect(firstNameOf('  Abebe Kebede ')).toBe('Abebe')
    expect(firstNameOf(null)).toBe('')
    expect(profileRefRange('c-1a2b3c4d')).toEqual({ from: '1a2b3c4d-0000-0000-0000-000000000000', to: '1a2b3c4d-ffff-ffff-ffff-ffffffffffff' })
    expect(profileRefRange('C-12')).toBeNull()
  })
})

describe('replacement guarantee and placement statuses (Addis Ababa dates)', () => {
  it('defaults: 30 days for trades, 90 for professionals; end date across months, years and leap days', () => {
    expect(DEFAULT_GUARANTEE_DAYS).toEqual({ trade: 30, professional: 90 })
    expect(guaranteeEndsOn('2026-11-01', 30)).toBe('2026-12-01')
    expect(guaranteeEndsOn('2026-12-15', 30)).toBe('2027-01-14')
    expect(guaranteeEndsOn('2028-02-01', 90)).toBe('2028-05-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })
  it('hired → guarantee running on the start date → completed the day after the guarantee ends', () => {
    const p = { status: 'hired', start_date: '2026-11-01', guarantee_ends_on: '2026-12-01' }
    expect(nextPlacementStatus(p, '2026-10-31')).toBeNull()
    expect(nextPlacementStatus(p, '2026-11-01')).toBe('guarantee_running')
    expect(nextPlacementStatus({ ...p, status: 'guarantee_running' }, '2026-12-01')).toBeNull()
    expect(nextPlacementStatus({ ...p, status: 'guarantee_running' }, '2026-12-02')).toBe('completed')
    expect(nextPlacementStatus({ ...p, status: 'replaced' }, '2027-01-01')).toBeNull()
  })
  it('the Addis day starts at 21:00 UTC the evening before', () => {
    expect(todayAddis(new Date('2026-10-31T20:59:00Z'))).toBe('2026-10-31')
    expect(todayAddis(new Date('2026-10-31T21:00:00Z'))).toBe('2026-11-01')
    const p = { status: 'hired', start_date: '2026-11-01', guarantee_ends_on: '2026-12-01' }
    expect(nextPlacementStatus(p, todayAddis(new Date('2026-10-31T20:59:00Z')))).toBeNull()
    expect(nextPlacementStatus(p, todayAddis(new Date('2026-10-31T21:00:00Z')))).toBe('guarantee_running')
  })
  it('"guarantee ends within 7 days" for the digest; leaving on the last day is still inside', () => {
    const p = { status: 'guarantee_running', start_date: '2026-11-01', guarantee_ends_on: '2026-12-01' }
    expect(guaranteeEndsSoon(p, '2026-11-23')).toBe(false)
    expect(guaranteeEndsSoon(p, '2026-11-24')).toBe(true)
    expect(guaranteeEndsSoon(p, '2026-12-01')).toBe(true)
    expect(guaranteeEndsSoon(p, '2026-12-02')).toBe(false)
    expect(leftInsideGuarantee(p, '2026-12-01')).toBe(true)
    expect(leftInsideGuarantee(p, '2026-12-02')).toBe(false)
  })
})

describe('fees (owner only)', () => {
  it('a percentage is worked out from the pay it is based on', () => {
    expect(percentageFeeMinor(1500, 36_000_000)).toBe(5_400_000)
    expect(percentageFeeMinor(1250, 3_000_001)).toBe(375_000)
  })
  it('totals ignore reversed entries; an entry is reversed once and a reversal never', () => {
    const entries = [
      { id: 'd', entry_type: 'fee_due', amount_minor: 300_000, reverses_entry_id: null },
      { id: 'r1', entry_type: 'fee_received', amount_minor: 100_000, reverses_entry_id: null },
      { id: 'x', entry_type: 'fee_received', amount_minor: 50_000, reverses_entry_id: null },
      { id: 'rev', entry_type: 'reversal', amount_minor: 50_000, reverses_entry_id: 'x' },
    ]
    expect(feeTotals(entries)).toEqual({ due: 300_000, received: 100_000, waived: 0, outstanding: 200_000 })
    expect(canReverse(entries[2], entries)).toBe(false)
    expect(canReverse(entries[3], entries)).toBe(false)
    expect(canReverse(entries[1], entries)).toBe(true)
  })
})

describe('keeping and deleting (12 months; hired-through-HagerLand exception)', () => {
  it('keeping period: empty until the lawyer confirms; then from the later of guarantee end or last fee entry', () => {
    expect(retainUntil('2026-12-01', null, null)).toBeNull()
    expect(retainUntil('2026-12-01', null, 84)).toBe('2033-12-01')
    expect(retainUntil('2026-12-01', '2027-03-31', 1)).toBe('2027-04-30')
    expect(addMonths('2027-01-31', 1)).toBe('2027-02-28')
    expect(addMonths('2026-11-15', 14)).toBe('2028-01-15')
  })
  it('a placement holds records unless cancelled; "period not set" while the period is empty', () => {
    expect(placementHold(null, null, null, '2027-01-01')).toBe('none')
    expect(placementHold({ status: 'cancelled' }, null, null, '2027-01-01')).toBe('none')
    expect(placementHold({ status: 'completed' }, null, null, '2027-01-01')).toBe('period_not_set')
    expect(placementHold({ status: 'completed' }, '2027-01-01', 12, '2027-01-01')).toBe('hired')
    expect(placementHold({ status: 'completed' }, '2026-12-31', 12, '2027-01-01')).toBe('none')
  })
  it('shortlist rows: 12 months after the last activity, never later than 12 months after the assignment closes', () => {
    expect(shortlistClockFrom('2026-11-10T00:00:00Z', null)).toBe('2026-11-10T00:00:00Z')
    expect(shortlistClockFrom('2026-11-10T00:00:00Z', '2026-11-05T00:00:00Z')).toBe('2026-11-05T00:00:00Z')
    expect(shortlistClockFrom('2026-11-10T00:00:00Z', '2026-12-05T00:00:00Z')).toBe('2026-11-10T00:00:00Z')
    // Last activity on 10 Nov 2026 (Addis): kept on 9 Nov 2027, deleted from the start of 10 Nov 2027 Addis time.
    const activity = '2026-11-10T09:00:00Z'
    expect(shortlistDueForDeletion(activity, null, new Date('2027-11-09T20:59:00Z'))).toBe(false)
    expect(shortlistDueForDeletion(activity, null, new Date('2027-11-09T21:00:00Z'))).toBe(true)
    // 23:30 Addis on 9 Nov 2026 is still 9 Nov in Addis, though 10 Nov has not started in UTC… it is 20:30 UTC.
    expect(shortlistDueForDeletion('2026-11-09T20:30:00Z', null, new Date('2027-11-08T21:00:00Z'))).toBe(true)
    // Closed early: the clock runs from the closing day.
    expect(shortlistDueForDeletion('2027-06-01T09:00:00Z', '2026-11-10T09:00:00Z', new Date('2027-11-09T21:00:00Z'))).toBe(true)
  })
  it('clearing a shortlist row removes exactly the personal details', () => {
    expect(Object.keys(clearedShortlistRow('x')).sort()).toEqual(['area_text', 'consent_note', 'email', 'name', 'notes', 'personal_data_deleted_at', 'phone'])
  })
})

function adapter(kept: { hired: number; periodNotSet: number }) {
  const trims: number[] = []
  const a: CleanupAdapter = {
    countDue: async (k) => (k === 'shortlist' ? 2 : 0),
    listDue: async (k) => (k === 'shortlist' ? ['s1', 's2'] : []),
    clear: async () => ({}),
    countKept: async () => kept,
    trimHeld: async () => {
      trims.push(1)
      return 1
    },
  }
  return { a, trims }
}

describe('the deletion run with the exception (Dry run changes nothing)', () => {
  it('dry run: counts shortlist rows and the two "kept" numbers; never trims', async () => {
    const { a, trims } = adapter({ hired: 3, periodNotSet: 2 })
    const r = await runCleanupCore(a, 'dry_run')
    expect(r.counts.due.shortlist).toBe(2)
    expect(r.counts.cleared.shortlist).toBe(0)
    expect(r.counts.kept).toEqual({ hired: 3, periodNotSet: 2 })
    expect(trims).toEqual([])
    expect(cleanupDigestCounts(r)).toContainEqual(['Jobs data: kept: hired through HagerLand', 3])
    expect(cleanupDigestCounts(r)).toContainEqual(['Jobs data: kept: period not set', 2])
    expect(cleanupRunText('dry_run', r.counts)).toContain('kept: period not set 2')
  })
  it('live: clears due shortlist rows and trims held records', async () => {
    const { a, trims } = adapter({ hired: 1, periodNotSet: 0 })
    const r = await runCleanupCore(a, 'live')
    expect(r.counts.cleared.shortlist).toBe(2)
    expect(trims).toEqual([1])
  })
  it('runs logged before Phase 3 still read correctly', () => {
    const old = { due: { applications: 1, register: 0, emails: 0 }, cleared: { applications: 0, register: 0, emails: 0 }, failed: { applications: 0, register: 0, emails: 0 }, cvFilesDeleted: 0 } as unknown as CleanupCounts
    expect(cleanupRunText('dry_run', old)).toBe('1 job applications would be cleared · 0 worker register entries would be cleared · 0 old queued emails would be cleared')
  })
})

describe('"Are you based outside Ethiopia?" (staffing only)', () => {
  it('only the staffing form asks it', () => {
    expect(requestFormCopy('staffing').employerAbroad).toBe(true)
    expect(requestFormCopy('plumbers').employerAbroad).toBe(false)
    expect(requestFormCopy('staffing').hiddenQuestions).toEqual(['international'])
  })
  it('optional: no answer stores nothing; yes needs a country from the existing list (not Ethiopia); no needs nothing more', () => {
    expect(parseEmployerAbroad({})).toEqual({ value: null, errors: {} })
    expect(parseEmployerAbroad({ employer_abroad: 'maybe' }).errors).toEqual({ employer_abroad: 'Please choose yes or no' })
    expect(parseEmployerAbroad({ employer_abroad: 'yes' }).errors).toEqual({ employer_country: 'Choose one of the options' })
    expect(parseEmployerAbroad({ employer_abroad: 'yes', employer_country: 'ET' }).errors).toEqual({ employer_country: 'Choose one of the options' })
    expect(parseEmployerAbroad({ employer_abroad: 'yes', employer_country: 'GB' }).value).toEqual({ abroad: true, country: 'GB' })
    expect(parseEmployerAbroad({ employer_abroad: 'no', employer_country: 'GB' }).value).toEqual({ abroad: false, country: null })
    expect(ABROAD_COUNTRIES.some((c) => c.code === 'ET')).toBe(false)
    expect(ABROAD_COUNTRIES.some((c) => c.code === 'ZZ')).toBe(true)
  })
  it('is saved with the answers and shown with the approved wording', () => {
    const answers = employerAbroadAnswers({ abroad: true, country: 'GB' })
    expect(answers).toEqual({ employer_abroad: true, employer_country: 'GB' })
    expect(readEmployerAbroad(answers)).toEqual({ abroad: true, country: 'GB' })
    expect(employerAbroadLines(answers)).toEqual([['Are you based outside Ethiopia?', 'Yes'], ['Which country are you in?', 'United Kingdom']])
    expect(employerAbroadLines({ international: true })).toEqual([])
    expect(EMPLOYER_ABROAD_TEXT.confirmation).toBe('You told us you are based outside Ethiopia. We will agree a good time to call you.')
  })
})

describe('emails (approved wording; no contact details)', () => {
  it('the introduction email carries no phone numbers or email addresses', () => {
    const e = recruitmentIntroductionEmail({ reference: 'HLS-2026-000001', count: 2, link: 'https://www.hagerland.com/account/service-requests/x' })
    expect(e.subject).toBe('Candidates introduced for request HLS-2026-000001')
    expect(e.text).toContain('We have introduced 2 candidate(s) for your request HLS-2026-000001. Each of them agreed to be introduced to you. See their details on your request page.')
    expect(e.text).toContain('Please use their details only for this request. Candidates must never be asked for money.')
    expect(e.html).toContain('See the candidates')
    // No phone number (+251…, 09…) and no email address anywhere in the email.
    for (const body of [e.text, e.html]) expect(body).not.toMatch(/\+251|\b0?9\d{8}\b|mailto:|[\w.+-]+@[\w-]+\.[\w.]+/)
  })
  it('the placement email', () => {
    const e = placementConfirmedEmail({ name: 'Abebe Kebede', role: 'Mason', date: '1 November 2026' })
    expect(e.subject).toBe('Placement confirmed: Abebe Kebede, starting 1 November 2026')
    expect(e.text).toContain('Thank you for confirming that Abebe Kebede starts work as Mason on 1 November 2026. If they leave within the replacement period in your written agreement, we will look for a replacement at no extra cost.')
  })
})

describe('who may use the desk, and fees owner only (server checks)', () => {
  it('Owner and Operations open the desk; Agent and Content are refused', () => {
    expect(roleCanAccess('operations', '/roodber8/jobs/desk')).toBe(true)
    expect(roleCanAccess('operations', '/roodber8/jobs/desk/0b0d1c1e-0000-4000-8000-000000000000')).toBe(true)
    expect(roleCanAccess('agent', '/roodber8/jobs/desk')).toBe(false)
    expect(roleCanAccess('content', '/roodber8/jobs/desk')).toBe(false)
  })
  it('every fee action checks the owner on the server', () => {
    const src = readFileSync('app/roodber8/actions/jobs-desk.ts', 'utf8')
    for (const name of ['feeAgreementUploadAction', 'saveFeeTermsAction', 'setFeeStatusAction', 'addFeeEntryAction', 'reverseFeeEntryAction']) {
      const body = src.split(`export async function ${name}`)[1].split('\nexport ')[0]
      expect(body, name).toMatch(/await assertAdmin\(AREA\)\s+await assertOwner\(\)/)
    }
    expect(src).toMatch(/const AREA = '\/roodber8\/jobs\/desk'/)
  })
  it('the assignment page loads and renders money only for the owner', () => {
    const page = readFileSync('app/roodber8/jobs/desk/[id]/page.tsx', 'utf8')
    expect(page).toMatch(/if \(owner && placementIds\.length\)/)
    expect(page).toMatch(/\{owner && !p\.is_free_replacement && fee && <FeeTools/)
    // Operations' query of fee terms selects only the status.
    expect(page).toContain(".from('recruitment_fee_terms').select('placement_id, status')")
  })
  it('the recruitment desk switch gates what employers see and get', () => {
    const data = readFileSync('lib/jobs-desk-data.ts', 'utf8')
    expect(data).toMatch(/if \(!\(await readJobsSwitches\(\)\)\.recruitmentDesk\) return null/)
    const actions = readFileSync('app/roodber8/actions/jobs-desk.ts', 'utf8')
    expect(actions).toMatch(/const on = \(await readJobsSwitches\(\)\)\.recruitmentDesk\s+let emailed = false\s+if \(on\)/)
    expect(actions).toMatch(/if \(!\(await readJobsSwitches\(\)\)\.recruitmentDesk\) return false/)
    const terms = readFileSync('app/(site)/terms/page.tsx', 'utf8')
    expect(terms).toMatch(/\{jobsSwitches\.recruitmentDesk && \(/)
  })
  it('staffing requests are refused on every provider and quote path', () => {
    const sr = readFileSync('app/roodber8/actions/service-requests.ts', 'utf8')
    for (const name of ['matchProvidersAction', 'hagerlandQuoteAction', 'noProviderAction']) {
      const body = sr.split(`export async function ${name}`)[1].split('\nexport ')[0]
      expect(body, name).toContain('isStaffingRequest(')
    }
    // Tidy T-2 (T2-1): fees are now the owner's only on every service, staffing included (checked first).
    expect(sr.split('export async function saveMatchCommercialAction')[1].split('\nexport ')[0]).toContain("if (!(await isOwnerSession())) return fail('Only the owner can see or change fees.')")
    expect(readFileSync('lib/service-requests/notify.ts', 'utf8')).toContain('if (await isStaffingRequest(match.request_id)) return { guest: false }')
    const provider = readFileSync('app/(account)/account/requests/actions.ts', 'utf8')
    expect(provider.split('export async function respondToMatchAction')[1].split('\nexport ')[0]).toContain('isStaffingRequest(')
    expect(provider.split('export async function submitMatchQuoteAction')[1]).toContain('isStaffingRequest(')
    expect(readFileSync('lib/cron/daily.ts', 'utf8')).toContain('!(await isStaffingRequest(m.request_id))')
  })
})
