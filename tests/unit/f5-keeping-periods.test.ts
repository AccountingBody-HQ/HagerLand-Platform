import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  AUDIT_SIX_YEARS,
  REMOVED_EMAIL,
  REMOVED_TEXT,
  RETENTION_KINDS,
  alwaysOnDigestCounts,
  auditKeep,
  clearedBuildProject,
  clearedCareRequest,
  clearedClaim,
  clearedDoNotContact,
  clearedEnquiry,
  clearedInvitation,
  clearedManagedProperty,
  clearedMatch,
  clearedOwnerMessage,
  clearedPartnerApplication,
  clearedQuoteRequest,
  clearedServiceRequest,
  clearedTradeAccount,
  latest,
  monthsBefore,
  retentionCutoff,
} from '@/lib/retention'
import { CLEANUP_KINDS, cleanupDigestCounts, cleanupRunText, cleanupUnreadable, runCleanupCore, type CleanupAdapter, type CleanupKind } from '@/lib/jobs-cleanup'

/** F-5 keeping periods (decision D3): periods, what clearing writes, audit classification, the shared run. */

describe('periods in Addis Ababa dates', () => {
  it('24 months and 6 years, with month ends handled', () => {
    expect(monthsBefore('2028-10-29', 24)).toBe('2026-10-29')
    expect(monthsBefore('2030-02-28', 24)).toBe('2028-02-28')
    expect(monthsBefore('2028-02-29', 24)).toBe('2026-02-28')
    expect(monthsBefore('2028-03-31', 1)).toBe('2028-02-29')
    expect(monthsBefore('2032-10-29', 72)).toBe('2026-10-29')
  })
  it('a record is due on the first Addis day after its anniversary (Addis is UTC+3)', () => {
    // 29 Oct 2028, 22:30 UTC is already 30 Oct in Addis Ababa: records from 30 Oct 2026 (Addis) and earlier are due.
    const cutoff = retentionCutoff(new Date('2028-10-29T22:30:00Z'), { months: 24 })
    expect(cutoff).toBe('2026-10-30T21:00:00.000Z')
    expect('2026-10-30T20:59:59.000Z' < cutoff).toBe(true)
    expect('2026-10-30T21:00:00.000Z' < cutoff).toBe(false)
    expect(retentionCutoff(new Date('2027-01-28T10:00:00Z'), { days: 90 })).toBe('2026-10-30T21:00:00.000Z')
  })
  it('last activity is the latest of the given moments', () => {
    expect(latest('2026-01-01T00:00:00Z', null, '2027-05-01T00:00:00Z', undefined, '2026-12-31T00:00:00Z')).toBe('2027-05-01T00:00:00Z')
    expect(latest(null, undefined)).toBeNull()
  })
})

describe('what clearing writes satisfies every existing column rule (Q2)', () => {
  const at = '2028-11-01T06:00:00.000Z'
  const fits = (v: unknown, min: number, max: number) => typeof v === 'string' && v.length >= min && v.length <= max
  it('NOT NULL columns get values, minimum lengths are met, the date is set', () => {
    const e = clearedEnquiry(at)
    expect(fits(e.name, 2, 120) && fits(e.phone, 0, 32) && fits(e.message, 1, 2000)).toBe(true)
    expect(e.email).toBeNull()
    expect(e.personal_data_deleted_at).toBe(at)
    const s = clearedServiceRequest(at)
    expect(fits(s.name, 2, 120) && fits(s.phone, 0, 32) && fits(s.details, 0, 4000)).toBe(true)
    expect(s.attachment_paths).toEqual([])
    const q = clearedQuoteRequest(at, true)
    expect(fits(q.name, 2, 120) && fits(q.phone, 0, 32)).toBe(true)
    expect('quote_document_path' in q).toBe(false)
    expect(clearedQuoteRequest(at, false).quote_document_path).toBeNull()
    const c = clearedCareRequest(at)
    expect(fits(c.name, 2, 120) && typeof c.email === 'string' && typeof c.phone === 'string').toBe(true)
    expect(fits(clearedManagedProperty(at).owner_name, 2, 120)).toBe(true)
    expect(fits(clearedOwnerMessage.sender_name, 1, 120) && fits(clearedOwnerMessage.body, 1, 4000)).toBe(true)
    const b = clearedBuildProject(at)
    expect(fits(b.name, 2, 120) && typeof b.phone === 'string' && typeof b.email === 'string').toBe(true)
    const p = clearedPartnerApplication(at)
    expect(fits(p.contact_name, 2, 120) && p.email === REMOVED_EMAIL && fits(p.email, 0, 254)).toBe(true)
    const cl = clearedClaim(at)
    expect(fits(cl.claimant_name, 2, 120) && fits(cl.claimant_phone, 0, 32)).toBe(true)
    expect(cl.evidence_paths).toEqual([])
    expect(typeof clearedTradeAccount(at).phone).toBe('string')
    expect(fits(clearedDoNotContact.name, 1, 120)).toBe(true)
    const inv = clearedInvitation('11111111-1111-4111-8111-111111111111')
    expect(inv.email).toBe(inv.email.toLowerCase())
    expect(inv.token_hash).toBe('removed:11111111-1111-4111-8111-111111111111')
    expect(REMOVED_TEXT.length).toBeGreaterThan(0)
  })
  it('a won match keeps its quote document; others lose it', () => {
    expect(clearedMatch(true)).toEqual({ quote_message: null })
    expect(clearedMatch(false)).toEqual({ quote_message: null, quote_document_path: null })
  })
  it('what stays is never in the cleared values (references, statuses, amounts, area, answers)', () => {
    const all = [clearedEnquiry(at), clearedServiceRequest(at), clearedQuoteRequest(at, false), clearedCareRequest(at), clearedManagedProperty(at), clearedBuildProject(at), clearedPartnerApplication(at), clearedClaim(at), clearedTradeAccount(at)]
    for (const v of all) for (const keep of ['id', 'reference', 'status', 'created_at', 'location_id', 'location_text', 'answers', 'country_code', 'quoted_total_etb_cents', 'monthly_fee_minor', 'organisation_name', 'business_name']) expect(Object.keys(v), keep).not.toContain(keep)
  })
})

describe('audit log classification (D3, Q4)', () => {
  /** Every action the code writes: audit('…') calls and direct inserts. Templates are expanded to their real values. */
  function actionsInCode(): string[] {
    const calls = execFileSync('git', ['grep', '-h', '-o', '-E', "audit\\(\\s*[`'][^`']+[`']", '--', 'app', 'lib']).toString().trim().split('\n')
    // Direct inserts into audit_log (sign-in, deletion requests, the Imports clean-up) and the daily run record.
    const inserts = execFileSync('git', ['grep', '-h', '-o', '-E', "from\\('audit_log'\\)\\.insert\\(\\{[^}]*action: '[a-z_.]+'", '--', 'app', 'lib']).toString().trim().split('\n').map((l) => `action: '${/action: '([a-z_.]+)'/.exec(l)![1]}'`)
    const src = [...calls, ...inserts]
    const out = new Set<string>(['cron.daily'])
    const templates: Record<string, string[]> = {
      '${entity}.note': ['property.note', 'development.note', 'organisation.note', 'product.note'],
      '${entity}.status': ['property.status', 'development.status', 'organisation.status', 'product.status'],
      '${entity}.${op}': ['property', 'development', 'organisation', 'portfolio', 'product'].flatMap((e) => ['approve', 'reject', 'changes', 'remove', 'approve_changes', 'reject_changes'].map((o) => `${e}.${o}`)),
      'jobs.desk.${o.data}': ['jobs.desk.interviewed', 'jobs.desk.not_hired'],
      'job.${parsed.data.status}': ['job.published', 'job.rejected', 'job.paused', 'job.removed'],
      'report.${status}': ['report.actioned', 'report.dismissed'],
      // The search stops at the first quote inside this template: `pillar.mode.${on ? 'on' : 'off'}`.
      'pillar.mode.${on ? ': ['pillar.mode.on', 'pillar.mode.off'],
      'trade_account.${decision}': ['trade_account.approved', 'trade_account.rejected', 'trade_account.revoked'],
      'review.${p.data.decision}': ['review.publish', 'review.reject'],
      '${k.data}_category.create': ['product_category.create', 'service_category.create'],
      '${k.data}_category.edit': ['product_category.edit', 'service_category.edit'],
      '${kind}.update': ['interest.update', 'partner.update'],
    }
    for (const raw of src) {
      const a = raw.replace(/^audit\(\s*[`']/, '').replace(/^action: '/, '').replace(/[`']$/, '')
      if (!a.includes('${')) out.add(a)
      else {
        expect(templates[a], `a new audit template needs classifying: ${a}`).toBeDefined()
        for (const x of templates[a]) out.add(x)
      }
    }
    return Array.from(out).sort()
  }
  it('every action written anywhere is classified (6 years or 24 months)', () => {
    const actions = actionsInCode()
    expect(actions.length).toBeGreaterThan(150)
    expect(actions.filter((a) => auditKeep(a) === null)).toEqual([])
  })
  it('money, records and data-protection decisions are kept 6 years; the rest 24 months', () => {
    for (const a of ['deal.create', 'supply.ledger.entry', 'supply.ledger.reverse', 'supply.order.status', 'supply.agreement.create', 'quote.issue', 'service_request.commercial', 'jobs.desk.fee_entry', 'jobs.desk.placement', 'jobs.desk.consent_withdrawn', 'agency.tenancy.create', 'agency.instruction.terms', 'managed_property.statement', 'trade_account.approved', 'user.delete', 'account.deletion_requested', 'jobs.cleanup_mode', 'imports.cleanup_mode', 'settings.update', 'staff.role', 'jobs.switch'])
      expect(auditKeep(a), a).toBe('six_years')
    for (const a of ['admin.login', 'property.approve', 'enquiry.status', 'service_request.match', 'quote.status', 'jobs.desk.notes', 'managed_property.update', 'agency.viewing.update', 'cron.daily', 'staff.login', 'verification.check'])
      expect(auditKeep(a), a).toBe('two_years')
    expect(AUDIT_SIX_YEARS.length).toBeGreaterThan(20)
  })
})

describe('the shared run (Dry run → Live) with the keeping-period kinds', () => {
  const none = () => Object.fromEntries(CLEANUP_KINDS.map((k) => [k, [] as string[]])) as Record<CleanupKind, string[]>
  function fake(due: Record<CleanupKind, string[]>, failing: string[] = []) {
    const cleared: string[] = []
    const batches: string[][] = []
    const adapter: CleanupAdapter = {
      countDue: async (k) => due[k].length,
      listDue: async (k, limit) => due[k].slice(0, limit),
      clear: async (_k, id) => {
        if (failing.includes(id)) throw new Error('down')
        cleared.push(id)
        return {}
      },
      clearMany: async (_k, ids) => {
        batches.push(ids)
        return ids.length
      },
      countKept: async () => ({ hired: 0, periodNotSet: 0 }),
      trimHeld: async () => 0,
    }
    return { adapter, cleared, batches }
  }
  it('every keeping-period kind is in the shared run', () => {
    for (const k of RETENTION_KINDS) expect(CLEANUP_KINDS).toContain(k)
  })
  it('dry run counts and clears nothing; digest lines above 0 only, counts not names', async () => {
    const due = { ...none(), enquiries: ['e1', 'e2'], audit_log: ['a1'] }
    const f = fake(due)
    const r = await runCleanupCore(f.adapter, 'dry_run')
    expect(f.cleared).toEqual([])
    expect(f.batches).toEqual([])
    const lines = cleanupDigestCounts(r).filter(([, n]) => n > 0).map(([l]) => l)
    expect(lines).toEqual(['Data clean-up (dry run): 2 enquiries whose personal details would be deleted', 'Data clean-up (dry run): 1 audit log entries whose personal details would be deleted'])
  })
  it('live: row kinds one by one with failures isolated; batch kinds in batches', async () => {
    const due = { ...none(), enquiries: ['e1', 'e2', 'e3'], claims: ['c1'], supply_contacts: ['s1', 's2'], audit_log: ['a1'] }
    const f = fake(due, ['e2'])
    const r = await runCleanupCore(f.adapter, 'live')
    expect(f.cleared).toEqual(['e1', 'e3', 'c1'])
    expect(f.batches).toEqual([['s1', 's2'], ['a1']])
    expect(r.counts.failed.enquiries).toBe(1)
    expect(cleanupDigestCounts(r).filter(([, n]) => n > 0)).toEqual([
      ['Data clean-up: personal details deleted from 2 enquiries', 2],
      ['1 enquiries could not be cleared (retried tomorrow)', 1],
      ['Data clean-up: personal details deleted from 1 business claims', 1],
      ['Data clean-up: personal details deleted from 2 supply contacts', 2],
      ['Data clean-up: personal details deleted from 1 audit log entries', 1],
    ])
  })
  it('one kind that cannot be read is reported ("could not be read", never 0) and the other kinds still run', async () => {
    const due = { ...none(), enquiries: ['e1'], claims: ['c1'] }
    const f = fake(due)
    const adapter: CleanupAdapter = { ...f.adapter, countDue: async (k) => { if (k === 'partner_applications') throw new Error('permission denied'); return due[k].length } }
    const r = await runCleanupCore(adapter, 'live')
    expect(f.cleared).toEqual(['e1', 'c1'])
    expect(r.counts.unreadable).toEqual(['partner_applications'])
    expect(r.failures).toContainEqual({ kind: 'partner_applications', id: 'count' })
    expect(cleanupUnreadable(r)).toEqual(['Data clean-up: partner applications'])
    expect(cleanupRunText('live', r.counts)).toContain('partner applications could not be read')
  })
  it('the always-on housekeeping lines (D4): counts only, shown above 0', () => {
    expect(alwaysOnDigestCounts({ errorsDeleted: 3, invitationsDeleted: 0, invitationsCleared: 1 }).filter(([, n]) => n > 0)).toEqual([
      ['Data clean-up: personal details deleted from 3 old error records (always on)', 3],
      ['Data clean-up: personal details deleted from 1 accepted invitations (always on)', 1],
    ])
    expect(alwaysOnDigestCounts(null)).toEqual([])
  })
})

describe('the code', () => {
  it('the always-on housekeeping runs in the daily job whatever the switch', () => {
    const daily = readFileSync('lib/cron/daily.ts', 'utf8')
    expect(daily).toContain("step('data housekeeping', () => runAlwaysOnCleanup(new Date(now)), null)")
    expect(readFileSync('lib/retention-data.ts', 'utf8').split('export async function runAlwaysOnCleanup')[1]).not.toMatch(/cleanupMode|readJobsSwitches/)
  })
  it('the unused contact-form email template is gone (D8)', () => {
    expect(readFileSync('lib/email/templates.ts', 'utf8')).not.toContain('contactMessageEmail')
    let hits = ''
    try {
      hits = execFileSync('git', ['grep', '--untracked', '-l', 'contactMessageEmail', '--', 'app', 'lib', 'components', 'tests', 'e2e']).toString()
    } catch {
      hits = ''
    }
    expect(hits.split('\n').filter(Boolean).filter((f) => f !== 'tests/unit/f5-keeping-periods.test.ts')).toEqual([])
  })
  it('0047 is additive: no drop, delete, truncate or alter … drop; records itself', () => {
    const sql = readFileSync('supabase/migrations/0047_keeping_periods.sql', 'utf8').replace(/--.*$/gm, '')
    expect(sql).not.toMatch(/\b(drop|truncate|delete)\b/i)
    expect(sql).toContain("values ('0047', 'keeping_periods')")
  })
  it('the health check expects 0047 last', async () => {
    const { EXPECTED_MIGRATIONS } = await import('@/lib/health')
    expect(EXPECTED_MIGRATIONS[EXPECTED_MIGRATIONS.length - 1]).toBe('0047')
  })
})
