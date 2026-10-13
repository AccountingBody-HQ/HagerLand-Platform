import { describe, expect, it } from 'vitest'
import { convertFromEtb, formatMoney } from '@/lib/format'
import { COUNTRIES, CURRENCIES, countryByCode, isCurrency } from '@/lib/countries'
import { childLevel } from '@/lib/validation/taxonomy'
import { verticalForPath } from '@/lib/verticals'

describe('money in a record’s currency', () => {
  it('keeps ETB as “ETB 4,500,000” with no decimals', () => {
    expect(formatMoney(4_500_000, 'ETB')).toBe('ETB 4,500,000')
    expect(formatMoney(4_500_000.6, 'ETB')).toBe('ETB 4,500,001')
  })
  it('uses symbols or codes for other currencies', () => {
    expect(formatMoney(1250, 'GBP')).toBe('£1,250')
    expect(formatMoney(900, 'USD')).toBe('US$900')
    expect(formatMoney(3000, 'EUR')).toBe('€3,000')
    expect(formatMoney(12.5, 'GBP', { decimals: 2 })).toBe('£12.50')
  })
  it('returns empty for missing values', () => {
    expect(formatMoney(null, 'GBP')).toBe('')
    expect(formatMoney(Number.NaN, 'GBP')).toBe('')
  })
})

describe('approximate conversion', () => {
  it('divides by the birr-per-unit rate and rounds for display', () => {
    expect(convertFromEtb(4_500_000, 150)).toBe(30_000)
    expect(convertFromEtb(45_000, 160)).toBe(281)
    expect(convertFromEtb(1_234_567, 165.5)).toBe(7_460)
  })
  it('refuses zero or negative rates', () => {
    expect(convertFromEtb(1000, 0)).toBeNull()
    expect(convertFromEtb(1000, -3)).toBeNull()
  })
})

describe('countries', () => {
  it('lists Ethiopia and the twelve diaspora markets with a currency each', () => {
    expect(COUNTRIES).toHaveLength(13)
    expect(COUNTRIES.every((c) => isCurrency(c.currency))).toBe(true)
    expect(CURRENCIES).toHaveLength(12)
    expect(countryByCode('GB')?.currency).toBe('GBP')
    expect(countryByCode('XX')).toBeNull()
  })
  it('gives cities under a country the city level', () => {
    expect(childLevel('country')).toBe('city')
    expect(childLevel(null)).toBe('region')
  })
})

describe('vertical paths', () => {
  it('maps each page to the vertical that owns it', () => {
    expect(verticalForPath('/property/for-sale/addis-ababa')).toBe('property')
    expect(verticalForPath('/developments/x')).toBe('property')
    expect(verticalForPath('/suppliers')).toBe('building-supplies')
    expect(verticalForPath('/finance')).toBe('finance')
    expect(verticalForPath('/financeable')).toBeNull()
    expect(verticalForPath('/about')).toBeNull()
  })
})
