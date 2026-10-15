import { describe, expect, it } from 'vitest'
import { safeNextPath, textSchema, youtubeUrl, telegramSchema } from '@/lib/validation/common'
import { signupSchema } from '@/lib/validation/auth'
import { basicsSchema, detailsSchema } from '@/lib/validation/property'
import { organisationSchema } from '@/lib/validation/organisation'

describe('common rules', () => {
  it('only allows same-site redirects', () => {
    expect(safeNextPath('/account/listings')).toBe('/account/listings')
    expect(safeNextPath('//evil.example')).toBe('/account')
    expect(safeNextPath('https://evil.example')).toBe('/account')
    expect(safeNextPath('/\\evil')).toBe('/account')
  })
  it('strips control characters and enforces length', () => {
    expect(textSchema(10).parse('a\u0000b  c')).toBe('ab c')
    expect(textSchema(3).safeParse('toolong').success).toBe(false)
  })
  it('accepts only YouTube video links', () => {
    expect(youtubeUrl.safeParse('https://youtu.be/dQw4w9WgXcQ').success).toBe(true)
    expect(youtubeUrl.safeParse('https://evil.example/video').success).toBe(false)
  })
  it('normalises Telegram usernames', () => expect(telegramSchema.parse('https://t.me/HagerLand_ET')).toBe('HagerLand_ET'))
})

describe('sign-up', () => {
  const base = { intent: 'owner', full_name: 'Abebe Kebede', email: 'ABEBE@Example.com ', phone: '0911234567', password: 'long-enough-pass', terms: 'on' }
  it('accepts a valid sign-up and normalises it', () => {
    const r = signupSchema.parse(base)
    expect(r.email).toBe('abebe@example.com')
    expect(r.phone).toBe('+251911234567')
  })
  it('requires 10+ character passwords and accepted terms', () => {
    expect(signupSchema.safeParse({ ...base, password: 'short' }).success).toBe(false)
    expect(signupSchema.safeParse({ ...base, terms: undefined }).success).toBe(false)
  })
})

describe('listing rules', () => {
  it('needs a real description', () => {
    expect(basicsSchema.safeParse({ purpose: 'sale', property_type: 'house', title: 'Family home in Adama', description: 'too short' }).success).toBe(false)
  })
  it('needs a price unless price on request', () => {
    expect(detailsSchema.safeParse({ features: [] }).success).toBe(false)
    expect(detailsSchema.safeParse({ price_on_request: 'on', features: [] }).success).toBe(true)
    const r = detailsSchema.parse({ price_etb: '4,500,000', floors_label: 'G+2', features: ['lift'] })
    expect(r.price_etb).toBe(4500000)
  })
  it('rejects unknown features and bad building heights', () => {
    expect(detailsSchema.safeParse({ price_etb: '1', features: ['moat'] }).success).toBe(false)
    expect(detailsSchema.safeParse({ price_etb: '1', floors_label: 'twelve', features: [] }).success).toBe(false)
  })
})

describe('organisations', () => {
  it('requires a location and a valid phone, and rejects HagerLand as a kind', () => {
    const ok = organisationSchema.safeParse({ name: 'Addis Builders', kind: 'contractor', location_id: '00000000-0000-4000-8000-000000000001', phone: '0911234567', areas_served: [], service_ids: [], product_category_ids: [] })
    expect(ok.success).toBe(true)
    const bad = organisationSchema.safeParse({ name: 'X Corp', kind: 'hagerland', location_id: '00000000-0000-4000-8000-000000000001', phone: '0911234567', areas_served: [], service_ids: [], product_category_ids: [] })
    expect(bad.success).toBe(false)
  })
})
