import { readFileSync, readdirSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

/** S6-1 private partner registration, partner portal and product drafts (migration 0048). */

const state = vi.hoisted(() => ({
  switches: { registration: false, catalogueOrdering: false, tradePricing: false, homeBusinessRow: false },
  rpc: [] as unknown[],
  upserts: [] as unknown[],
  owner: true,
}))

vi.mock('@/lib/supply/partner-switches', () => ({ readSupplySwitches: async () => state.switches, readSupplySwitchesCached: async () => state.switches, readUnlockFacts: async () => ({ activePaymentMethods: 0, legalName: '', catalogueOrdering: false }), SUPPLY_SWITCHES_TAG: 'supply-switches' }))
// QC-2: consent records are written by the shared helper (tested in qc2.test.ts).
vi.mock('@/lib/data-transfer-server', () => ({ recordTransferConsent: async () => undefined, accountConsentRefusal: async () => null, accountConsented: async () => true }))
vi.mock('@/lib/supabase/admin', () => ({
  getAdminSupabase: () => ({
    rpc: (name: string, args: unknown) => {
      state.rpc.push({ name, args })
      return { single: async () => ({ data: { id: 'r', reference: 'HLB-2026-000001' }, error: null }) }
    },
    from: () => {
      const chain: Record<string, unknown> = {}
      for (const k of ['select', 'eq', 'in', 'is']) chain[k] = () => chain
      chain.maybeSingle = async () => ({ data: { value: false }, error: null })
      chain.upsert = async (row: unknown) => {
        state.upserts.push(row)
        return { error: null }
      }
      return chain
    },
  }),
}))
vi.mock('@/lib/admin/guard', () => ({
  assertAdmin: async () => undefined,
  assertOwner: async () => {
    if (!state.owner) throw new Error('owner only')
  },
  audit: async () => undefined,
  adminActor: async () => 'test',
}))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('next/cache', () => ({ revalidatePath: () => undefined, revalidateTag: () => undefined }))
vi.mock('@/lib/security', async (real) => ({ ...(await real<typeof import('@/lib/security')>()), getClientIp: () => '127.0.0.1', hashIp: () => 'hash' }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: async () => ({ allowed: true }) }))
vi.mock('@/lib/turnstile', () => ({ isHoneypotFilled: () => false, verifyTurnstileToken: async () => true }))
vi.mock('@/lib/email/send', () => ({ sendEmail: async () => true }))
// S6-2: the switch action also checks the owner's payment details (empty here).
vi.mock('@/lib/supply/order-requests-data', () => ({ readPaymentDetails: async () => '' }))

beforeEach(() => {
  state.switches = { registration: false, catalogueOrdering: false, tradePricing: false, homeBusinessRow: false }
  state.rpc = []
  state.upserts = []
  state.owner = true
})

function form(values: Record<string, string | string[]>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(values)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x)
  return f
}
const CITY = '11111111-1111-4111-8111-111111111111'
const GOOD = { business_name: 'Abebe Cement PLC', roles: ['manufacturer', 'supplier'], city_id: CITY, contact_name: 'Abebe Kebede', phone: '0911 234 567', consent: 'on', transfer_consent: 'on' }

describe('registration form rules', () => {
  it('normalises the phone to +251, keeps every chosen role and requires consent', async () => {
    const { registrationSchema, registrationFormValues } = await import('@/lib/supply/partner-rules')
    const ok = registrationSchema.safeParse(registrationFormValues(form(GOOD)))
    expect(ok.success).toBe(true)
    expect(ok.data?.phone).toBe('+251911234567')
    expect(ok.data?.roles).toEqual(['manufacturer', 'supplier'])
    expect(registrationSchema.safeParse(registrationFormValues(form({ ...GOOD, consent: '' }))).success).toBe(false)
    expect(registrationSchema.safeParse(registrationFormValues(form({ ...GOOD, phone: '12' }))).success).toBe(false)
    expect(registrationSchema.safeParse(registrationFormValues(form({ ...GOOD, roles: [] }))).success).toBe(false)
    // "Retail shop" is a staff choice only; the public form offers Manufacturer / Importer / Supplier or shop.
    expect(registrationSchema.safeParse(registrationFormValues(form({ ...GOOD, roles: ['retail_shop'] }))).success).toBe(false)
    expect(registrationSchema.safeParse(registrationFormValues(form({ ...GOOD, roles: ['owner'] }))).success).toBe(false)
  })
  it('errors reuse the site’s existing texts', async () => {
    const { registrationSchema, registrationFormValues } = await import('@/lib/supply/partner-rules')
    const r = registrationSchema.safeParse(registrationFormValues(form({ business_name: '', phone: '', contact_name: '' })))
    const messages = r.error?.issues.map((i) => i.message) ?? []
    expect(messages).toEqual(expect.arrayContaining(['Enter the organisation name', 'Choose the type of organisation', 'Choose the location', 'Enter your name', 'Enter a phone number']))
  })
  it('a homepage card pre-selects only a public role', async () => {
    const { preselectedRole } = await import('@/lib/supply/partner-rules')
    expect(preselectedRole('manufacturer')).toBe('manufacturer')
    expect(preselectedRole('importer')).toBe('importer')
    expect(preselectedRole('supplier')).toBe('supplier')
    expect(preselectedRole('retail_shop')).toBeNull()
    expect(preselectedRole('<script>')).toBeNull()
  })
  it('records a consent wording version and the approved consent text', async () => {
    const { CONSENT_TEXT, CONSENT_VERSION } = await import('@/lib/supply/partner-rules')
    expect(CONSENT_TEXT).toBe('I agree that HagerLand may contact me about supplying products. I can ask to stop at any time.')
    expect(CONSENT_VERSION).toMatch(/^s6-1-/)
  })
})

describe('registration decisions', () => {
  it('only the agreed moves, and every decision is the owner’s', async () => {
    const { canMoveRegistration, ownerOnlyRegistrationMove } = await import('@/lib/supply/partner-rules')
    expect(canMoveRegistration('submitted', 'approved')).toBe(true)
    expect(canMoveRegistration('approved', 'suspended')).toBe(true)
    expect(canMoveRegistration('suspended', 'approved')).toBe(true)
    expect(canMoveRegistration('approved', 'declined')).toBe(false)
    expect(canMoveRegistration('declined', 'approved')).toBe(false)
    expect(ownerOnlyRegistrationMove('in_review')).toBe(false)
    for (const to of ['approved', 'declined', 'changes_requested', 'suspended'] as const) expect(ownerOnlyRegistrationMove(to)).toBe(true)
  })
})

describe('product drafts', () => {
  it('reads specifications as "Label: value" lines', async () => {
    const { parseSpecLines, specLines } = await import('@/lib/supply/partner-rules')
    const specs = parseSpecLines('Strength: 42.5 N\n\nColour\n')
    expect(specs).toEqual([{ label: 'Strength', value: '42.5 N' }, { label: 'Colour', value: '' }])
    expect(specLines(specs)).toBe('Strength: 42.5 N\nColour')
  })
  it('keeps only photos in the draft’s own private folder', async () => {
    const { ownPhotoPaths } = await import('@/lib/supply/partner-rules')
    const id = '22222222-2222-4222-8222-222222222222'
    const mine = `docs/partner/${id}/33333333-3333-4333-8333-333333333333.jpg`
    expect(ownPhotoPaths(id, [mine, mine, 'docs/partner/other/x.jpg', `docs/claim/${id}/a.jpg`, `docs/partner/${id}/../x.jpg`])).toEqual([mine])
  })
  it('a partner edits only before sending or when changes were asked for; withdraws only before a decision', async () => {
    const { PARTNER_EDITABLE, PARTNER_WITHDRAWABLE, REVIEWABLE } = await import('@/lib/supply/partner-rules')
    expect(PARTNER_EDITABLE).toEqual(['draft', 'changes_requested'])
    expect(PARTNER_WITHDRAWABLE).toEqual(['draft', 'submitted', 'changes_requested'])
    expect(REVIEWABLE).toEqual(['submitted'])
  })
  it('the draft form turns birr into cents and refuses bad numbers', async () => {
    const { draftSchema } = await import('@/lib/supply/partner-rules')
    const base = { id: '22222222-2222-4222-8222-222222222222', name: 'Portland cement', unit: 'bag', intent: 'save' }
    expect(draftSchema.parse({ ...base, proposed_price: '1,250.50' }).proposed_price).toBe(125050)
    expect(draftSchema.safeParse({ ...base, proposed_price: 'cheap' }).success).toBe(false)
    expect(draftSchema.safeParse({ ...base, unit: 'barrel' }).success).toBe(false)
    expect(draftSchema.safeParse({ ...base, intent: 'publish' }).success).toBe(false)
  })
  it('statuses are the partner’s approved words', async () => {
    const { DRAFT_STATUS_LABEL } = await import('@/lib/supply/partner-rules')
    expect(Object.values(DRAFT_STATUS_LABEL)).toEqual(['Draft', 'Sent for review', 'Changes requested', 'Approved', 'Not accepted', 'Withdrawn'])
  })
})

describe('admin areas (staff roles on the server)', () => {
  it('Operations may open registrations and drafts; only the owner the switches; Agent and Content neither', async () => {
    const { roleCanAccess } = await import('@/lib/admin/roles')
    for (const p of ['/roodber8/supply/registrations', '/roodber8/supply/registrations/new', '/roodber8/supply/product-drafts/x']) {
      expect(roleCanAccess('operations', p)).toBe(true)
      expect(roleCanAccess('agent', p)).toBe(false)
      expect(roleCanAccess('content', p)).toBe(false)
    }
    expect(roleCanAccess('operations', '/roodber8/supply/switches')).toBe(false)
    expect(roleCanAccess('owner', '/roodber8/supply/switches')).toBe(true)
  })
  it('every decision and every money field is owner only in the code', () => {
    const regs = readFileSync('app/roodber8/actions/partner-registrations.ts', 'utf8')
    expect(regs).toContain("const AREA = '/roodber8/supply/registrations'")
    expect(regs).toMatch(/if \(ownerOnlyRegistrationMove\(target\.data\)\) await assertOwner\(\)/)
    expect(regs.split('export async function sendPartnerInvitationAction')[1]).toMatch(/^[\s\S]{0,200}await assertOwner\(\)/)
    const drafts = readFileSync('app/roodber8/actions/partner-drafts.ts', 'utf8')
    expect(drafts).toContain("const AREA = '/roodber8/supply/product-drafts'")
    for (const fn of ['rejectDraftAction', 'approveDraftAction']) expect(drafts.split(`export async function ${fn}`)[1]).toMatch(/^[\s\S]{0,200}await assertOwner\(\)/)
    expect(drafts.split('export async function requestDraftChangesAction')[1].split('\nexport ')[0]).not.toMatch(/proposed_price|partner_sku/)
    expect(readFileSync('app/roodber8/actions/supply-switches.ts', 'utf8')).toMatch(/await assertAdmin\(AREA\)\s+await assertOwner\(\)/)
  })
  it('Operations never get the partner’s price or code: the draft page reads them for the owner only', () => {
    const page = readFileSync('app/roodber8/supply/product-drafts/[id]/page.tsx', 'utf8')
    const content = /const CONTENT = '([^']+)'/.exec(page)?.[1] ?? ''
    expect(content).not.toMatch(/partner_sku|proposed_price/)
    expect(page).toContain(".select(owner ? CONTENT + OWNER_ONLY : CONTENT)")
    expect(page).toMatch(/\{owner && REVIEWABLE\.includes\(status\) && \(\s*<Panel title="Approve">/)
    // The list never reads them at all.
    expect(readFileSync('app/roodber8/supply/product-drafts/page.tsx', 'utf8')).not.toMatch(/partner_sku|proposed_price|cost_price/)
  })
})

describe('switches off close every door (L6)', () => {
  it('the public registration is refused before anything is saved', async () => {
    const { submitPartnerRegistrationAction } = await import('@/app/actions/partner-registration-actions')
    const res = await submitPartnerRegistrationAction(null, form(GOOD))
    expect(res).toEqual({ ok: false, error: 'Something went wrong. Please refresh the page.' })
    expect(state.rpc).toEqual([])
  })
  it('with the switch on, the registration goes through the one database step as a public-form registration', async () => {
    state.switches.registration = true
    vi.doMock('@/lib/supply/partner-registration-data', () => ({ checkPartnerPlaces: async () => ({ ok: true, categoryIds: [] }), notifyNewRegistration: async () => undefined }))
    vi.resetModules()
    const { submitPartnerRegistrationAction } = await import('@/app/actions/partner-registration-actions')
    const res = await submitPartnerRegistrationAction(null, form(GOOD))
    expect(res).toEqual({ ok: true, data: { reference: 'HLB-2026-000001' } })
    expect(state.rpc).toHaveLength(1)
    const call = state.rpc[0] as { name: string; args: Record<string, unknown> }
    expect(call.name).toBe('partner_register')
    expect(call.args).toMatchObject({ p_source: 'public_form', p_phone: '+251911234567', p_roles: ['manufacturer', 'supplier'] })
    vi.doUnmock('@/lib/supply/partner-registration-data')
  })
  it('pages, homepage row, privacy lines and sitemap', () => {
    const page = readFileSync('app/(site)/sell-through-hagerland/register/page.tsx', 'utf8')
    expect(page).toMatch(/if \(!\(await readSupplySwitches\(\)\)\.registration\) notFound\(\)/)
    expect(page).toContain("export const dynamic = 'force-dynamic'")
    const home = readFileSync('app/(site)/page.tsx', 'utf8')
    expect(home).toContain('{supplySwitches.homeBusinessRow && supplySwitches.registration && <BusinessRow t={t} lh={lh} />}')
    const privacy = readFileSync('app/(site)/privacy/page.tsx', 'utf8')
    expect(privacy.match(/\{partnerLines && <li>/g)).toHaveLength(2)
    expect(readFileSync('app/sitemap.ts', 'utf8')).not.toContain('sell-through-hagerland')
  })
  it('ordering and trade pricing cannot be switched on without their unlock; the others need the owner', async () => {
    const { setSupplySwitchAction } = await import('@/app/roodber8/actions/supply-switches')
    // QC-2: catalogue ordering needs an active payment method and the company name (neither here).
    expect(await setSupplySwitchAction('catalogueOrdering', true)).toMatchObject({ ok: false, error: 'Cannot be switched on yet: add an active payment method in Supplies → Payment methods; enter the company name in Settings → Legal entity.' })
    expect(await setSupplySwitchAction('tradePricing', true)).toMatchObject({ ok: false })
    expect(state.upserts).toEqual([])
    state.owner = false
    await expect(setSupplySwitchAction('registration', true)).rejects.toThrow('owner only')
    expect(state.upserts).toEqual([])
    state.owner = true
    expect(await setSupplySwitchAction('registration', true)).toMatchObject({ ok: true })
    // QC-1a: the /privacy date moves first (registration shows /privacy lines), then the switch.
    expect(state.upserts).toEqual([expect.objectContaining({ key: 'legal_switch_changed', value: { privacy: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) } }), expect.objectContaining({ key: 'supply_partner_registration', value: true })])
  })
})

describe('the partner area', () => {
  it('lists through the partner_my_products view as the signed-in member, and is not found for anyone else', () => {
    const home = readFileSync('app/(site)/partner/page.tsx', 'utf8')
    expect(home).toContain("getServerSupabase().from('partner_my_products')")
    const data = readFileSync('lib/supply/partner-portal-data.ts', 'utf8')
    expect(data).toMatch(/if \(!membership\) notFound\(\)/)
    const access = readFileSync('lib/supply/partner-access.ts', 'utf8')
    expect(access).toContain(".eq('status', 'approved')")
    const draft = readFileSync('app/(site)/partner/[id]/page.tsx', 'utf8')
    expect(draft).toContain(".eq('org_id', membership.orgId)")
  })
  it('accepting an invitation adds a partner member, never a business member', () => {
    const actions = readFileSync('app/actions/partner-portal-actions.ts', 'utf8')
    expect(actions).toContain("from('partner_members').upsert(")
    expect(actions).not.toContain('organisation_members')
    expect(actions).not.toContain('org_invitations')
  })
  it('partner photos are photos only, in the partner’s own draft folder', () => {
    expect(readFileSync('app/api/uploads/sign/route.ts', 'utf8')).toContain("b.area === 'partner' && !IMAGE_TYPES.includes(b.content_type)")
    expect(readFileSync('lib/media-actions.ts', 'utf8')).toContain("d.area === 'partner' && !IMAGE_TYPES.includes(d.content_type)")
    expect(readFileSync('lib/media-access.ts', 'utf8')).toMatch(/case 'partner': \{[\s\S]*ownDraft\(scope\.id\)/)
  })
})

describe('keeping periods (F-5 machinery)', () => {
  it('the new kinds run under the shared switch', async () => {
    const { RETENTION_KINDS, DELETABLE_PREFIXES, CLEARED_DRAFT_STATUSES } = await import('@/lib/retention')
    expect(RETENTION_KINDS).toEqual(expect.arrayContaining(['partner_registrations', 'partner_drafts']))
    expect(DELETABLE_PREFIXES.partner).toBe('docs/partner/')
    expect(CLEARED_DRAFT_STATUSES).toEqual(['rejected', 'withdrawn'])
  })
  it('a registration is never cleared while an approved partner is active; otherwise 24 months after the last activity', async () => {
    const { partnerRegistrationDue } = await import('@/lib/retention')
    const { ENDED_RELATIONSHIP } = await import('@/lib/supply/partner-rules')
    const cutoff = '2028-10-29T21:00:00.000Z'
    const old = '2026-10-01T00:00:00.000Z'
    const recent = '2028-11-01T00:00:00.000Z'
    expect(partnerRegistrationDue({ status: 'approved', updated_at: old, relationship_status: 'active', relationship_changed_at: old }, cutoff, ENDED_RELATIONSHIP)).toBe(false)
    expect(partnerRegistrationDue({ status: 'approved', updated_at: old, relationship_status: 'inactive', relationship_changed_at: old }, cutoff, ENDED_RELATIONSHIP)).toBe(true)
    expect(partnerRegistrationDue({ status: 'approved', updated_at: old, relationship_status: 'inactive', relationship_changed_at: recent }, cutoff, ENDED_RELATIONSHIP)).toBe(false)
    expect(partnerRegistrationDue({ status: 'declined', updated_at: old, relationship_status: 'declined', relationship_changed_at: old }, cutoff, ENDED_RELATIONSHIP)).toBe(true)
    expect(partnerRegistrationDue({ status: 'submitted', updated_at: old, relationship_status: 'interested', relationship_changed_at: null }, cutoff, ENDED_RELATIONSHIP)).toBe(true)
    expect(partnerRegistrationDue({ status: 'suspended', updated_at: recent, relationship_status: 'active', relationship_changed_at: null }, cutoff, ENDED_RELATIONSHIP)).toBe(false)
  })
  it('clearing keeps the business, status and dates, and takes the contact details and private fields', async () => {
    const { clearedPartnerRegistration, clearedPartnerDraft } = await import('@/lib/retention')
    expect(clearedPartnerRegistration('t')).toEqual({ contact_name: 'Removed', phone: '', email: null, tin: null, other_names: null, message: null, admin_note: null, ip_hash: null, personal_data_deleted_at: 't' })
    expect(clearedPartnerDraft('t')).toEqual({ photo_paths: [], partner_sku: null, proposed_price_cents: null, stock_note: null, personal_data_deleted_at: 't' })
  })
  it('the source terms and the switches are kept 6 years in the audit log', async () => {
    const { auditKeep } = await import('@/lib/retention')
    expect(auditKeep('supply.source.create')).toBe('six_years')
    expect(auditKeep('supply.switch')).toBe('six_years')
    expect(auditKeep('supply.registration.status')).toBe('two_years')
    expect(auditKeep('supply.draft.approve')).toBe('two_years')
  })
})

describe('approved text (section 3), verbatim', () => {
  it('emails', async () => {
    const T = await import('@/lib/email/templates')
    const a = T.partnerRegistrationReceivedEmail({ reference: 'HLB-2026-000001', business: 'Abebe Cement PLC' })
    expect(a.subject).toBe('We received your registration (HLB-2026-000001)')
    expect(a.text).toContain('Thank you for registering Abebe Cement PLC with HagerLand Supply. Our team will contact you to talk about terms. Your details stay private.')
    const b = T.partnerInvitationEmail({ name: 'Abebe', business: 'Abebe Cement PLC', link: 'https://www.hagerland.com/partner/invite/x' })
    expect(b.subject).toBe('Your HagerLand Supply partner area')
    expect(b.text).toContain('Hello Abebe, we have set up a private partner area for Abebe Cement PLC. Use the button to sign in and add your products. The link works for 7 days.')
    expect(b.text).toContain('Open my partner area: https://www.hagerland.com/partner/invite/x')
    // The partner's identity never goes anywhere but to the partner and HagerLand's own inbox.
    expect(a.text).not.toMatch(/customer/i)
  })
  it('homepage row 2 and the registration page', () => {
    const row = readFileSync('components/home/BusinessRow.tsx', 'utf8')
    for (const s of [
      "t('Sell through HagerLand')",
      "t('Reach builders, homeowners and contractors across Ethiopia through HagerLand Supply.')",
      "'Make building products? Register with HagerLand Supply, and we will talk to you about offering them to our customers.'",
      "'Import building materials into Ethiopia? Register your business, and we will talk to you about supplying our customers.'",
      "'Supply products through HagerLand Supply, or buy from us at trade prices. You can do both.'",
      "'Register as a manufacturer'",
      "'Register as an importer'",
      "'Register as a supplier'",
      "'Open a trade account', href: '/supplies/trade'",
    ])
      expect(row).toContain(s)
    const page = readFileSync('app/(site)/sell-through-hagerland/register/page.tsx', 'utf8')
    expect(page).toContain("'Tell us about your business. Your details stay private: we do not publish a business page, and customers see HagerLand Supply, not your business. We will contact you to talk about terms.'")
    expect(page).toContain("'Once we agree terms, you add your products in your private partner area.'")
    const f = readFileSync('components/supply/PartnerRegistrationForm.tsx', 'utf8')
    expect(f).toContain('Thank you. Your registration <strong className="text-ink">{state.data.reference}</strong> is with our team. We will contact you to talk about terms.')
    for (const l of ['"Business name"', '"Other names"', 'What do you do? (choose all that apply)', 'Product categories', '"City"', '"Sub-city"', '"Woreda"', '"Contact name"', '"Phone"', '"Email"', '"TIN"', '"Anything else we should know?"', 'Send registration'])
      expect(f).toContain(l)
  })
  it('nothing new is written in Amharic', () => {
    const files = ['components/home/BusinessRow.tsx', 'components/supply/PartnerRegistrationForm.tsx', 'components/partner/PartnerDraftForm.tsx', 'lib/supply/partner-rules.ts', 'app/(site)/sell-through-hagerland/register/page.tsx']
    for (const f of files) expect(/[ሀ-፿]/.test(readFileSync(f, 'utf8')), f).toBe(false)
  })
})

describe('migration 0048', () => {
  const sql = readFileSync('supabase/migrations/0048_partner_registration.sql', 'utf8')
  const code = sql.replace(/--.*$/gm, '')
  it('is additive: no drop, delete, truncate, rename or grant to visitors; records itself', () => {
    // "on delete cascade / set null" are reference rules on new columns, not deletions.
    expect(code).not.toMatch(/\b(drop|truncate|rename)\b|delete\s+from/i)
    expect(code).not.toMatch(/grant [^;]* to anon/i)
    expect(code).toContain("values ('0048', 'partner_registration')")
    expect(code).toMatch(/^begin;[\s\S]*commit;\s*$/m)
    for (const t of ['partner_registrations', 'partner_members', 'partner_invitations', 'partner_product_drafts', 'product_sources'])
      expect(code).toContain(`alter table public.${t} enable row level security;`)
    expect(code).toContain('grant select on public.partner_my_products to authenticated;')
    expect(code).toMatch(/on conflict \(key\) do nothing;/)
  })
  it('the health check expects 0048 (S6-2 added 0049 after it)', async () => {
    const { EXPECTED_MIGRATIONS } = await import('@/lib/health')
    expect(EXPECTED_MIGRATIONS).toContain('0048')
  })
  it('a verify query exists, read-only', () => {
    const verify = readFileSync('docs/sql/0048_partner_registration_verify.sql', 'utf8').replace(/--.*$/gm, '')
    expect(verify).not.toMatch(/\b(insert|update|delete|drop|alter|create|truncate|grant|revoke)\b/i)
    expect(readdirSync('supabase/migrations').filter((f) => f.startsWith('0048'))).toEqual(['0048_partner_registration.sql'])
  })
})
