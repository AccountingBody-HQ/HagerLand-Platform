import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { normaliseSupplyPhone } from '@/lib/supply/phone'
import { businessNameKey, CONSENT_BASES, CONTACT_CHANNELS, defaultReverifyBy, labelFor, nameSimilarity, NAME_MATCH_THRESHOLD, PARTNER_SOURCES, RELATIONSHIP_STATUSES, SUPPLY_ROLES } from '@/lib/supply/partners'
import { roleCanAccess, roleCanExport } from '@/lib/admin/roles'

const migration = readFileSync('supabase/migrations/0034_supply_partners.sql', 'utf8')

describe('normaliseSupplyPhone', () => {
  it.each([
    ['0911 23 45 67', '+251911234567'],
    ['0911-234-567', '+251911234567'],
    ['(0911) 234567', '+251911234567'],
    ['911234567', '+251911234567'],
    ['+251911234567', '+251911234567'],
    ['+251 91 123 4567', '+251911234567'],
    ['251911234567', '+251911234567'],
    ['00251911234567', '+251911234567'],
    ['0711234567', '+251711234567'],
    ['+251711234567', '+251711234567'],
    ['011 551 2345', '+251115512345'],
    ['0115512345', '+251115512345'],
    ['+251 11 551 2345', '+251115512345'],
    ['022 111 2233', '+251221112233'],
    ['0581234567', '+251581234567'],
    ['+44 20 7946 0958', '+442079460958'],
  ])('normalises %s', (input, out) => expect(normaliseSupplyPhone(input)).toBe(out))

  it.each(['', '   ', 'abc', '12345', '0811234567', '0611234567', '+2519112', '+25191123456789', '091123456', '09112345678', '2510911234567', '442079460958', '091a234567'])('rejects %s', (input) =>
    expect(normaliseSupplyPhone(input)).toBeNull(),
  )
})

describe('supply partner constants', () => {
  const checkList = (column: string) => {
    const m = new RegExp(`${column}[^\\n]*?(?:in|array\\[)\\s*\\(?((?:'[a-z_]+',?\\s*)+)`).exec(migration)
    return Array.from((m?.[1] ?? '').matchAll(/'([a-z_]+)'/g)).map((x) => x[1])
  }

  it('match the database checks in migration 0034', () => {
    expect(checkList('roles <@')).toEqual(SUPPLY_ROLES.map((r) => r.value))
    expect(checkList('check \\(relationship_status')).toEqual(RELATIONSHIP_STATUSES.map((s) => s.value))
    expect(checkList('source text check \\(source')).toEqual(PARTNER_SOURCES.map((s) => s.value))
    expect(checkList('preferred_channel')).toEqual(CONTACT_CHANNELS.map((s) => s.value))
    expect(checkList('consent_basis')).toEqual(CONSENT_BASES.map((s) => s.value))
  })

  it('have plain-English labels', () => {
    expect(labelFor(RELATIONSHIP_STATUSES, 'terms_agreed')).toBe('Terms agreed')
    expect(labelFor(SUPPLY_ROLES, 'retail_shop')).toBe('Retail shop')
    expect(labelFor(SUPPLY_ROLES, 'unknown')).toBe('unknown')
    for (const s of RELATIONSHIP_STATUSES) expect(s.hint.length).toBeGreaterThan(10)
  })
})

describe('defaultReverifyBy', () => {
  it('is 12 months after the latest verification date', () => {
    expect(defaultReverifyBy(['2026-03-01T00:00:00Z', '2026-10-20T00:00:00Z', null])).toBe('2027-10-20')
    expect(defaultReverifyBy([null, '2026-01-31T00:00:00Z', undefined])).toBe('2027-01-31')
  })
  it('handles 29 February', () => expect(defaultReverifyBy(['2028-02-29T00:00:00Z'])).toBe('2029-02-28'))
  it('is empty without any verification date', () => {
    expect(defaultReverifyBy([null, undefined])).toBeNull()
    expect(defaultReverifyBy(['not a date'])).toBeNull()
  })
})

describe('duplicate names', () => {
  it('ignores common business words, case and accents', () => {
    expect(businessNameKey('Abebe Building Materials Trading PLC')).toBe('abebe')
    expect(businessNameKey('Café Tsehay Import & Export')).toBe('cafe tsehay')
  })
  it('scores spelling variants as possible duplicates and different shops as not', () => {
    expect(nameSimilarity('Abebe Trading PLC', 'Abebe Building Materials')).toBe(1)
    expect(nameSimilarity('Tesfaye Cement Supply', 'Tesfay Cement')).toBeGreaterThanOrEqual(NAME_MATCH_THRESHOLD)
    expect(nameSimilarity('Tesfaye Cement Supply', 'Merkato Steel House')).toBeLessThan(NAME_MATCH_THRESHOLD)
    expect(nameSimilarity('PLC', 'Trading')).toBe(0)
  })
})

describe('supply partner access', () => {
  it('is for owner and operations only', () => {
    expect(roleCanAccess('owner', '/roodber8/supply/partners')).toBe(true)
    expect(roleCanAccess('operations', '/roodber8/supply/partners')).toBe(true)
    expect(roleCanAccess('agent', '/roodber8/supply/partners')).toBe(false)
    expect(roleCanAccess('content', '/roodber8/supply/partners')).toBe(false)
    // Later supply areas (agreements, ledger) stay owner-only until given out on purpose.
    expect(roleCanAccess('operations', '/roodber8/supply/agreements')).toBe(false)
    expect(roleCanExport('operations', 'supply-partners')).toBe(false)
  })
})

describe('organisations CSV export', () => {
  it('keeps its columns: no supply partner data', () => {
    const route = readFileSync('app/roodber8/export/[kind]/route.ts', 'utf8')
    const block = route.slice(route.indexOf("case 'organisations':"), route.indexOf("case 'developments':"))
    expect(/select\('([^']+)'\)/.exec(block)?.[1]).toBe('short_id, name, kind, status, verification_level, phone, whatsapp, email, website, source, plan, views_count, enquiries_count, created_at')
    expect(route).not.toMatch(/supply_partners|supply_contacts/)
  })
})

describe('migration 0034', () => {
  it('gives visitors and signed-in users no access at all', () => {
    expect(migration).toMatch(/alter table public\.supply_partners enable row level security/)
    expect(migration).toMatch(/alter table public\.supply_contacts enable row level security/)
    expect(migration).toMatch(/revoke all on table public\.supply_partners, public\.supply_contacts from public, anon, authenticated/)
    expect(migration).not.toMatch(/\bgrant\b|create policy|create view|security definer|\bdrop\b|\btruncate\b|alter table public\.(?!supply_)/i)
  })
})
