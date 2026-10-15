import { describe, expect, it } from 'vitest'
import { announcementSchema, businessSchema, contactSchema, parsePickRefs, socialSchema, thresholdsSchema } from '@/lib/validation/settings'

describe('settings validation', () => {
  it('normalises phone numbers to E.164 and keeps empty values', () => {
    const c = contactSchema.parse({ phone: '0911 234 567', whatsapp: '', telegram: '@hagerland', email: '', supply_email: '', address: '', hours: '' })
    expect(c.phone).toBe('+251911234567')
    expect(c.whatsapp).toBe('')
    expect(c.telegram).toBe('hagerland')
    expect(contactSchema.parse({ phone: '011 123 4567' }).phone).toBe('+251111234567')
    expect(contactSchema.safeParse({ phone: '12' }).success).toBe(false)
    expect(contactSchema.safeParse({ email: 'nope' }).success).toBe(false)
  })

  it('requires https social links', () => {
    expect(socialSchema.safeParse({ facebook: 'http://facebook.com/x' }).success).toBe(false)
    expect(socialSchema.parse({ facebook: 'https://facebook.com/hagerland' }).facebook).toBe('https://facebook.com/hagerland')
  })

  it('keeps only complete claims', () => {
    const b = businessSchema.parse({ claims: [{ title: 'A', text: 'B' }, { title: '', text: 'x' }] })
    expect(b.claims).toEqual([{ title: 'A', text: 'B' }])
    expect(b.free_listing_confirmed).toBe(false)
  })

  it('validates announcement links and thresholds', () => {
    expect(announcementSchema.safeParse({ text: 'Hi', href: 'javascript:x' }).success).toBe(false)
    expect(announcementSchema.parse({ enabled: 'true', text: 'Hi', href: '/supplies' }).enabled).toBe(true)
    expect(thresholdsSchema.safeParse({ listing_expiry_days: 5, min_results_for_index: 3, private_owner_max_active_listings: 3, verified_business_count_min: 25 }).success).toBe(false)
  })

  it('parses homepage picks from references and links', () => {
    expect(parsePickRefs('abcd1234\nhttps://www.hagerland.com/property/2-bed-apartment-bole-wxyz9876, abcd1234')).toEqual(['abcd1234', 'wxyz9876'])
  })
})
