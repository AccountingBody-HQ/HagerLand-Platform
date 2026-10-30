import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

/** Fix F-3 (audit B-01, K-01): the quote choice is one database call; emails only when it made the choice. */

const state = vi.hoisted(() => ({
  rpc: { data: null as unknown, error: null as unknown },
  rpcArgs: [] as unknown[],
  request: null as Record<string, unknown> | null,
  user: null as { id: string } | null,
  emails: [] as unknown[],
  updates: [] as string[],
}))

function builder(table: string) {
  const chain: Record<string, unknown> = {}
  for (const k of ['select', 'eq', 'in', 'neq']) chain[k] = () => chain
  chain.update = () => {
    state.updates.push(table)
    return chain
  }
  chain.maybeSingle = async () => ({ data: table === 'service_requests' ? state.request : table === 'organisations' ? { name: 'Abebe Plumbing' } : null, error: null })
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null })
  return chain
}

vi.mock('@/lib/supabase/admin', () => ({
  getAdminSupabase: () => ({
    from: (t: string) => builder(t),
    rpc: async (name: string, args: unknown) => {
      state.rpcArgs.push({ name, args })
      return state.rpc
    },
  }),
}))
vi.mock('@/lib/auth', () => ({ getUser: async () => state.user }))
vi.mock('@/lib/email/send', () => ({ sendEmail: async (m: unknown) => void state.emails.push(m) }))
vi.mock('@/lib/enquiries', () => ({ orgManagerEmails: async () => ['owner@test.hagerland.invalid'], hagerlandInbox: async () => null }))
vi.mock('@/lib/log', () => ({ log: { error: () => undefined, info: () => undefined, warn: () => undefined } }))
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))

const REQ = '11111111-1111-4111-8111-111111111111'
const MATCH = '22222222-2222-4222-8222-222222222222'
const USER = '33333333-3333-4333-8333-333333333333'
const SUCCESS = 'You chose Abebe Plumbing. They will contact you to agree the details.'

beforeEach(() => {
  state.rpc = { data: null, error: null }
  state.rpcArgs = []
  state.emails = []
  state.updates = []
  state.user = { id: USER }
  state.request = { id: REQ, reference: 'HLS-2026-000001', title: 'Leaking pipe', status: 'quoted', requester_user_id: USER, access_token_hash: null, access_token_expires_at: null }
})

describe('reading the database answer', () => {
  it('maps every outcome, and anything unexpected is an error', async () => {
    const { readQuoteChoice } = await import('@/lib/service-requests/quote-choice')
    expect(readQuoteChoice({ outcome: 'chosen', org_id: 'o' }, null)).toEqual({ outcome: 'chosen', orgId: 'o' })
    expect(readQuoteChoice({ outcome: 'already_chosen', org_id: 'o' }, null)).toEqual({ outcome: 'already_chosen', orgId: 'o' })
    expect(readQuoteChoice({ outcome: 'not_allowed', reason: 'request_closed' }, null)).toEqual({ outcome: 'not_allowed', reason: 'request_closed' })
    expect(readQuoteChoice({ outcome: 'chosen', org_id: 'o' }, { message: 'boom' })).toEqual({ outcome: 'error' })
    expect(readQuoteChoice(null, null)).toEqual({ outcome: 'error' })
    expect(readQuoteChoice({ outcome: 'chosen' }, null)).toEqual({ outcome: 'error' })
    expect(readQuoteChoice({ outcome: 'something' }, null)).toEqual({ outcome: 'error' })
  })
  it('refusals use only the messages the flow already had', async () => {
    const { quoteChoiceRefusal, CHOICE_FAILED } = await import('@/lib/service-requests/quote-choice')
    expect(quoteChoiceRefusal('not_owner')).toBe('This link has expired. Ask for a new one below.')
    expect(quoteChoiceRefusal('request_closed')).toBe('This request is closed.')
    expect(quoteChoiceRefusal('quote_not_available')).toBe('That quote is not available.')
    expect(quoteChoiceRefusal('quote_expired')).toBe('That quote has expired. Ask the provider for an updated quote.')
    expect(quoteChoiceRefusal('anything else')).toBe(CHOICE_FAILED)
    expect(CHOICE_FAILED).toBe('Something went wrong. Please refresh the page.')
  })
})

describe('chooseQuoteAction', () => {
  it('chosen: the success message and one email to the provider', async () => {
    const { chooseQuoteAction } = await import('@/app/actions/service-request-actions')
    state.rpc = { data: { outcome: 'chosen', org_id: 'org', match_id: MATCH, deal_id: 'd' }, error: null }
    expect(await chooseQuoteAction({ request_id: REQ, match_id: MATCH })).toEqual({ ok: true, data: { message: SUCCESS } })
    expect(state.emails).toHaveLength(1)
    expect(state.rpcArgs).toEqual([{ name: 'choose_service_request_quote', args: { p_request_id: REQ, p_match_id: MATCH, p_actor_user_id: USER } }])
    expect(state.updates).toEqual([])
  })
  it('already chosen (a double tap): the same success message, no second email', async () => {
    const { chooseQuoteAction } = await import('@/app/actions/service-request-actions')
    state.request = { ...state.request, status: 'won' }
    state.rpc = { data: { outcome: 'already_chosen', org_id: 'org', match_id: MATCH }, error: null }
    expect(await chooseQuoteAction({ request_id: REQ, match_id: MATCH })).toEqual({ ok: true, data: { message: SUCCESS } })
    expect(state.emails).toHaveLength(0)
  })
  it('not allowed: the existing message, no email', async () => {
    const { chooseQuoteAction } = await import('@/app/actions/service-request-actions')
    state.rpc = { data: { outcome: 'not_allowed', reason: 'request_closed' }, error: null }
    expect(await chooseQuoteAction({ request_id: REQ, match_id: MATCH })).toEqual({ ok: false, error: 'This request is closed.' })
    expect(state.emails).toHaveLength(0)
  })
  it('a database error: the generic message, no email, never "You chose"', async () => {
    const { chooseQuoteAction } = await import('@/app/actions/service-request-actions')
    state.rpc = { data: null, error: { message: 'connection lost' } }
    expect(await chooseQuoteAction({ request_id: REQ, match_id: MATCH })).toEqual({ ok: false, error: 'Something went wrong. Please refresh the page.' })
    expect(state.emails).toHaveLength(0)
  })
  it('not the requester: refused before the database is asked', async () => {
    const { chooseQuoteAction } = await import('@/app/actions/service-request-actions')
    state.user = { id: '44444444-4444-4444-8444-444444444444' }
    expect(await chooseQuoteAction({ request_id: REQ, match_id: MATCH })).toEqual({ ok: false, error: 'This link has expired. Ask for a new one below.' })
    expect(state.rpcArgs).toEqual([])
  })
  it('a private link: the database gets the link fingerprint, never a user id', async () => {
    const { chooseQuoteAction } = await import('@/app/actions/service-request-actions')
    const { hashRequestToken, newRequestToken } = await import('@/lib/service-requests/token')
    const link = newRequestToken()
    state.user = null
    state.request = { ...state.request, requester_user_id: null, access_token_hash: link.hash, access_token_expires_at: link.expiresAt }
    state.rpc = { data: { outcome: 'chosen', org_id: 'org' }, error: null }
    expect((await chooseQuoteAction({ request_id: REQ, match_id: MATCH, token: link.token })).ok).toBe(true)
    expect(state.rpcArgs).toEqual([{ name: 'choose_service_request_quote', args: { p_request_id: REQ, p_match_id: MATCH, p_token_hash: hashRequestToken(link.token) } }])
  })
})

describe('cancelServiceRequestAction (QC-1b: one database call, migration 0052)', () => {
  const CANCELLED = { ok: true, data: { message: 'Your request is cancelled. Thank you for letting us know.' } }
  it('cancelled: the unchanged success message, one call, no writes of its own, no email', async () => {
    const { cancelServiceRequestAction } = await import('@/app/actions/service-request-actions')
    state.rpc = { data: { outcome: 'cancelled' }, error: null }
    expect(await cancelServiceRequestAction({ request_id: REQ })).toEqual(CANCELLED)
    expect(state.rpcArgs).toEqual([{ name: 'service_request_cancel', args: { p_request_id: REQ, p_actor_user_id: USER } }])
    expect(state.updates).toEqual([])
    expect(state.emails).toEqual([])
  })
  it('a database error (e.g. withdrawing the offers failed and nothing was saved): the existing generic message', async () => {
    const { cancelServiceRequestAction } = await import('@/app/actions/service-request-actions')
    state.rpc = { data: null, error: { message: 'boom' } }
    expect(await cancelServiceRequestAction({ request_id: REQ })).toEqual({ ok: false, error: 'Something went wrong. Please refresh the page.' })
    state.rpc = { data: { outcome: 'something else' }, error: null }
    expect(await cancelServiceRequestAction({ request_id: REQ })).toEqual({ ok: false, error: 'Something went wrong. Please refresh the page.' })
  })
  it('closed meanwhile: the existing "already closed" message', async () => {
    const { cancelServiceRequestAction } = await import('@/app/actions/service-request-actions')
    state.rpc = { data: { outcome: 'not_allowed', reason: 'request_closed' }, error: null }
    expect(await cancelServiceRequestAction({ request_id: REQ })).toEqual({ ok: false, error: 'This request is already closed.' })
  })
  it('the database does not recognise the customer or the request: the existing expired-link message', async () => {
    const { cancelServiceRequestAction } = await import('@/app/actions/service-request-actions')
    state.rpc = { data: { outcome: 'not_allowed', reason: 'not_owner' }, error: null }
    expect(await cancelServiceRequestAction({ request_id: REQ })).toEqual({ ok: false, error: 'This link has expired. Ask for a new one below.' })
    state.rpc = { data: { outcome: 'not_found' }, error: null }
    expect(await cancelServiceRequestAction({ request_id: REQ })).toEqual({ ok: false, error: 'This link has expired. Ask for a new one below.' })
  })
  it('not the requester, or already closed: refused before the database is asked, with the existing messages', async () => {
    const { cancelServiceRequestAction } = await import('@/app/actions/service-request-actions')
    state.user = { id: '44444444-4444-4444-8444-444444444444' }
    expect(await cancelServiceRequestAction({ request_id: REQ })).toEqual({ ok: false, error: 'This link has expired. Ask for a new one below.' })
    state.user = { id: USER }
    state.request = { ...state.request, status: 'cancelled' }
    expect(await cancelServiceRequestAction({ request_id: REQ })).toEqual({ ok: false, error: 'This request is already closed.' })
    expect(state.rpcArgs).toEqual([])
  })
  it('a private link: the database gets the link fingerprint, never a user id', async () => {
    const { cancelServiceRequestAction } = await import('@/app/actions/service-request-actions')
    const { hashRequestToken, newRequestToken } = await import('@/lib/service-requests/token')
    const link = newRequestToken()
    state.user = null
    state.request = { ...state.request, requester_user_id: null, access_token_hash: link.hash, access_token_expires_at: link.expiresAt }
    state.rpc = { data: { outcome: 'cancelled' }, error: null }
    expect(await cancelServiceRequestAction({ request_id: REQ, token: link.token })).toEqual(CANCELLED)
    expect(state.rpcArgs).toEqual([{ name: 'service_request_cancel', args: { p_request_id: REQ, p_token_hash: hashRequestToken(link.token) } }])
  })
})

describe('the code and the migration', () => {
  const action = readFileSync('app/actions/service-request-actions.ts', 'utf8')
  const sql = readFileSync('supabase/migrations/0046_safe_quote_choice.sql', 'utf8')
  it('the choice makes no writes of its own: everything is in the database function', () => {
    const choose = action.split('export async function chooseQuoteAction')[1].split('\nexport ')[0]
    expect(choose).not.toMatch(/\.(update|insert|upsert|delete)\(/)
    expect(choose).toContain("db.rpc('choose_service_request_quote'")
  })
  it('cancelling makes no writes of its own: everything is in the database function (QC-1b)', () => {
    const cancel = action.split('export async function cancelServiceRequestAction')[1].split('\nexport ')[0]
    expect(cancel).not.toMatch(/\.(update|insert|upsert|delete)\(/)
    expect(cancel).toContain(".rpc('service_request_cancel'")
  })
  it('0046 is additive, service role only, and records itself', () => {
    const code = sql.replace(/--.*$/gm, '')
    expect(code).not.toMatch(/\b(drop|truncate|delete|alter)\b/i)
    expect(code).toMatch(/security definer\s+set search_path = ''/)
    expect(code).toContain('revoke all on function public.choose_service_request_quote(uuid, uuid, uuid, text) from public, anon, authenticated;')
    expect(code).toContain('grant execute on function public.choose_service_request_quote(uuid, uuid, uuid, text) to service_role;')
    expect(code).toMatch(/where source_type = 'service_request' and match_id is not null;/)
    expect(code).toContain("values ('0046', 'safe_quote_choice')")
  })
  it('the health check expects 0046 (and the later ones)', async () => {
    const { EXPECTED_MIGRATIONS } = await import('@/lib/health')
    expect(EXPECTED_MIGRATIONS).toContain('0046')
  })
})

describe('the review queue (audit K-01)', () => {
  it('no "Mark Verified" button and no way to approve verification from the queue', () => {
    const page = readFileSync('app/roodber8/review/page.tsx', 'utf8')
    expect(page).not.toContain('Mark Verified')
    expect(page).toContain("label: 'Record the check on the business page'")
    const m = readFileSync('app/roodber8/actions/moderation.ts', 'utf8')
    expect(m).not.toContain('verificationDecisionAction')
    const decline = m.split('export async function declineVerificationAction')[1].split('\nexport ')[0]
    expect(decline).not.toMatch(/\bapprove\b|verification_level/)
    expect(decline).toContain("status: 'rejected'")
  })
})
