import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

/** QC-1b: one-step cancel (0052), the trigger-function tidy, merges owner-only and never for partners, valuations. */

const read = (p: string) => readFileSync(p, 'utf8')

const state = vi.hoisted(() => ({
  owner: true,
  partners: new Set<string>(),
  partnerCalls: [] as string[][],
  writes: [] as string[],
  orgs: {} as Record<string, Record<string, unknown>>,
}))

function builder(table: string) {
  const chain: Record<string, unknown> = {}
  let id = ''
  for (const k of ['select', 'neq', 'in', 'ilike', 'order', 'limit']) chain[k] = () => chain
  chain.eq = (col: string, v: string) => {
    if (col === 'id') id = v
    return chain
  }
  for (const k of ['update', 'upsert', 'insert', 'delete']) {
    chain[k] = () => {
      state.writes.push(`${table}.${k}`)
      return chain
    }
  }
  chain.range = async () => ({ data: [], error: null })
  chain.maybeSingle = async () => ({ data: table === 'organisations' ? (state.orgs[id] ?? null) : null, error: null })
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: table === 'organisations' && !id ? Object.values(state.orgs) : [], error: null })
  return chain
}

vi.mock('@/lib/supabase/admin', () => ({ getAdminSupabase: () => ({ from: (t: string) => builder(t) }) }))
vi.mock('@/lib/supply/data', () => ({
  findPossibleDuplicates: async () => [],
  supplyPartnerOrgIds: async (ids: string[]) => {
    state.partnerCalls.push(ids)
    return new Set(ids.filter((i) => state.partners.has(i)))
  },
}))
vi.mock('@/lib/admin/guard', () => ({
  assertAdmin: async () => undefined,
  assertOwner: async () => {
    if (!state.owner) throw new Error('Unauthorized')
  },
  adminActor: async () => 'test',
  audit: async () => undefined,
  changedFields: () => ({}),
}))
vi.mock('@/lib/revalidate', () => ({ listTag: () => 'x', revalidateEntity: () => undefined }))
vi.mock('next/cache', () => ({ revalidatePath: () => undefined, revalidateTag: () => undefined }))
vi.mock('next/navigation', () => ({ redirect: () => undefined }))

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

beforeEach(() => {
  state.owner = true
  state.partners = new Set()
  state.partnerCalls = []
  state.writes = []
  state.orgs = {
    [A]: { id: A, name: 'Abebe Plumbing', kind: 'contractor', short_id: 'abc123', is_hagerland: false },
    [B]: { id: B, name: 'Abebe Plumbing PLC', kind: 'contractor', short_id: 'def456', is_hagerland: false },
  }
})

describe('F1 one-step cancel: the database answer', () => {
  it('maps every outcome, and anything unexpected is an error', async () => {
    const { readRequestCancel } = await import('@/lib/service-requests/quote-choice')
    expect(readRequestCancel({ outcome: 'cancelled' }, null)).toEqual({ outcome: 'cancelled' })
    expect(readRequestCancel({ outcome: 'not_found' }, null)).toEqual({ outcome: 'not_found' })
    expect(readRequestCancel({ outcome: 'not_allowed', reason: 'request_closed' }, null)).toEqual({ outcome: 'not_allowed', reason: 'request_closed' })
    expect(readRequestCancel({ outcome: 'cancelled' }, { message: 'boom' })).toEqual({ outcome: 'error' })
    expect(readRequestCancel(null, null)).toEqual({ outcome: 'error' })
    expect(readRequestCancel({ outcome: 'chosen' }, null)).toEqual({ outcome: 'error' })
  })
  it('refusals use only the messages the cancel flow already had', async () => {
    const { requestCancelRefusal } = await import('@/lib/service-requests/quote-choice')
    expect(requestCancelRefusal({ outcome: 'not_found' })).toBe('This link has expired. Ask for a new one below.')
    expect(requestCancelRefusal({ outcome: 'not_allowed', reason: 'not_owner' })).toBe('This link has expired. Ask for a new one below.')
    expect(requestCancelRefusal({ outcome: 'not_allowed', reason: 'request_closed' })).toBe('This request is already closed.')
    expect(requestCancelRefusal({ outcome: 'not_allowed', reason: 'other' })).toBe('Something went wrong. Please refresh the page.')
    expect(requestCancelRefusal({ outcome: 'error' })).toBe('Something went wrong. Please refresh the page.')
  })
})

describe('migration 0052', () => {
  const sql = read('supabase/migrations/0052_service_request_cancel.sql')
  const code = sql.replace(/--.*$/gm, '')
  const TRIGGER_FUNCTIONS = ['add_owner_on_org_insert', 'agency_instruction_marks_listing', 'create_profile_on_signup', 'pillars_after_change', 'protect_last_owner', 'sync_featured_from_promotions', 'reviews_check_eligible']
  it('is additive: one function, revokes and grants, and its own record; nothing dropped, deleted or altered', () => {
    expect(code).not.toMatch(/\b(drop|truncate|delete|alter|create table|create trigger|create policy|create view)\b/i)
    expect(code.match(/create or replace function/gi)).toHaveLength(1)
    expect(code).toMatch(/^begin;/m)
    expect(code).toMatch(/^commit;/m)
    expect(code).toContain("values ('0052', 'service_request_cancel') on conflict (version) do nothing;")
    // The only writes are inside the function and the migration record.
    const outside = code.replace(/as \$\$[\s\S]*?\$\$;/, '')
    expect(outside).not.toMatch(/\bupdate\b/i)
    expect(outside.match(/\binsert\b/gi)).toHaveLength(1)
  })
  it('the cancel is security definer with a fixed search path, service role only', () => {
    expect(code).toMatch(/security definer\s+set search_path = ''/)
    expect(code).toContain('revoke all on function public.service_request_cancel(uuid, uuid, text) from public, anon, authenticated;')
    expect(code).toContain('grant execute on function public.service_request_cancel(uuid, uuid, text) to service_role;')
    expect(code).not.toMatch(/grant [^;]* to (public|anon|authenticated)/)
  })
  it("keeps today's rules: the open states, the reason, and the offers withdrawn", () => {
    expect(code).toContain("if r.status not in ('submitted', 'triaged', 'matched', 'quoted') then")
    expect(code).toContain("set status = 'cancelled', closed_reason = 'customer_cancelled', closed_at = v_now where id = r.id;")
    expect(code).toMatch(/update public\.service_request_matches set status = 'withdrawn'\s+where request_id = r\.id and status in \('offered', 'accepted', 'quoted'\);/)
    expect(code).toContain('for update;')
  })
  it('takes execute away from the seven trigger functions only (property_unavailable is a public lookup, not a trigger)', () => {
    const revoke = code.slice(code.indexOf('revoke execute on function'))
    for (const f of TRIGGER_FUNCTIONS) expect(revoke, f).toContain(`public.${f}()`)
    expect(code).not.toContain('property_unavailable')
    expect(revoke.slice(0, revoke.indexOf(';'))).toMatch(/from public, anon, authenticated$/)
  })
  it('the health check expects 0052 last; the verify file is read-only', async () => {
    const { EXPECTED_MIGRATIONS } = await import('@/lib/health')
    expect(EXPECTED_MIGRATIONS).toContain('0052')
    const verify = read('docs/sql/0052_service_request_cancel_verify.sql').replace(/--.*$/gm, '')
    expect(verify).not.toMatch(/\b(insert|update|delete|drop|truncate|alter|create|grant|revoke)\b/i)
    expect(verify).toContain('6fc7e565')
  })
})

describe('F3 merges: owner only, never a supply partner', () => {
  it('the owner merges two ordinary businesses', async () => {
    const { mergeOrganisationsAction } = await import('@/app/roodber8/actions/organisations')
    expect(await mergeOrganisationsAction(A, B)).toEqual({ ok: true, data: { message: 'Abebe Plumbing was merged into Abebe Plumbing PLC.' } })
    expect(state.partnerCalls).toContainEqual([A, B])
  })
  it('Operations (not the owner) is refused by the server, before anything is read or written', async () => {
    const { mergeOrganisationsAction, searchMergeTargetsAction } = await import('@/app/roodber8/actions/organisations')
    state.owner = false
    await expect(mergeOrganisationsAction(A, B)).rejects.toThrow('Unauthorized')
    await expect(searchMergeTargetsAction(A, 'Abebe')).rejects.toThrow('Unauthorized')
    expect(state.writes).toEqual([])
  })
  it('a partner on either side: refused with the approved message, nothing written', async () => {
    const { mergeOrganisationsAction } = await import('@/app/roodber8/actions/organisations')
    for (const p of [A, B]) {
      state.partners = new Set([p])
      expect(await mergeOrganisationsAction(A, B)).toEqual({ ok: false, error: 'Merging is not available for supply partner businesses.' })
    }
    expect(state.writes).toEqual([])
  })
  it('the HagerLand refusals are unchanged', async () => {
    const { mergeOrganisationsAction } = await import('@/app/roodber8/actions/organisations')
    state.orgs[A].is_hagerland = true
    expect(await mergeOrganisationsAction(A, B)).toEqual({ ok: false, error: 'HagerLand organisations cannot be merged.' })
    state.orgs[A].is_hagerland = false
    state.orgs[B].is_hagerland = true
    expect(await mergeOrganisationsAction(A, B)).toEqual({ ok: false, error: 'Nothing can be merged into a HagerLand organisation.' })
  })
  it('the search leaves partners out, and a partner cannot search at all', async () => {
    const { searchMergeTargetsAction } = await import('@/app/roodber8/actions/organisations')
    state.partners = new Set([B])
    expect(await searchMergeTargetsAction(A, 'Abebe')).toEqual({ ok: true, data: { results: [{ id: A, label: 'Abebe Plumbing (abc123)' }] } })
    state.partners = new Set([A])
    expect(await searchMergeTargetsAction(A, 'Abebe')).toEqual({ ok: false, error: 'Merging is not available for supply partner businesses.' })
  })
  it('the page shows the merge panel to the owner only, and the approved line for a partner', () => {
    const page = read('app/roodber8/organisations/[id]/page.tsx')
    expect(page).toContain('{owner && !isHl && (\n            <Panel title="Merge duplicate">')
    expect(page).toContain('{partnerIds.has(o.id) ? <p className="text-small text-muted">{MERGE_PARTNER_REFUSED}</p> : <MergeTool orgId={o.id} />}')
    expect(read('lib/admin/merge.ts')).toContain("export const MERGE_PARTNER_REFUSED = 'Merging is not available for supply partner businesses.'")
  })
  it('partners are a partner record or a partner registration, read in parts (never more than 1,000 rows at once)', () => {
    const data = read('lib/supply/data.ts')
    const fn = data.slice(data.indexOf('export async function supplyPartnerOrgIds'))
    expect(fn).toContain("readAllIn(orgIds, (part) => db.from('supply_partners').select('org_id').in('org_id', part)")
    expect(fn).toContain("readAllIn(orgIds, (part) => db.from('partner_registrations').select('id, org_id').in('org_id', part)")
  })
})

describe('F4 valuations: preferred times, time zone and IP fingerprint cleared too', () => {
  const cutoff = '2024-10-30T21:00:00.000Z'
  const oldTs = '2024-09-01T10:00:00Z'
  const empty = { address_line: null, details: null, notes: null, report_path: null, preferred_times: null, time_zone: null, ip_hash: null }
  const v = (over: Record<string, unknown> = {}) => ({ status: 'completed', created_at: oldTs, updated_at: oldTs, appointment_at: null, ...empty, ...over }) as never
  it('a valuation with only one of the new fields left is still due; one with everything empty is not', async () => {
    const { valuationDue } = await import('@/lib/retention')
    expect(valuationDue(v(), cutoff, false)).toBe(false)
    expect(valuationDue(v({ preferred_times: 'Mornings' }), cutoff, false)).toBe(true)
    expect(valuationDue(v({ time_zone: 'Africa/Addis_Ababa' }), cutoff, false)).toBe(true)
    expect(valuationDue(v({ ip_hash: 'abc' }), cutoff, false)).toBe(true)
    expect(valuationDue(v({ ip_hash: 'abc', status: 'booked' }), cutoff, false)).toBe(false)
  })
  it('a cleared valuation is recognised only when every cleared field is empty', async () => {
    const { valuationActivity } = await import('@/lib/retention')
    const changed = '2026-10-30T06:00:00Z'
    expect(valuationActivity(v({ updated_at: changed }))).toBe(oldTs)
    expect(valuationActivity(v({ updated_at: changed, preferred_times: 'Mornings' }))).toBe(changed)
  })
  it('the clearing sets the new fields to empty and the keeping period reads them', async () => {
    const { clearedValuation } = await import('@/lib/retention')
    expect(clearedValuation).toEqual(empty)
    const data = read('lib/retention-data.ts')
    expect(data.match(/address_line, details, notes, report_path, preferred_times, time_zone, ip_hash'\)/g)).toHaveLength(2)
  })
})
