import { describe, expect, it } from 'vitest'
import { isAmharicPath, localizeHref, stripLocale } from '@/lib/i18n/config'
import { translator } from '@/lib/i18n/translate'
import { AM_MESSAGES, AM_NEEDS_NATIVE_REVIEW } from '@/lib/i18n/messages/am'
import { brand } from '@/lib/brand'

/**
 * Fix F-4: English texts whose old Amharic was removed because the English changed. They fall back to English until a
 * native speaker translates them (never machine or draft Amharic). Exactly these six; every other rule stays.
 */
const AWAITING_NATIVE_REVIEW = [
  'Buy, rent, build and manage property in Ethiopia, with partners we check, wherever you live.',
  'Buy, rent, build, manage and maintain property in Ethiopia, supported by our own team and professionals across Ethiopia.',
  'Tradespeople for repairs, servicing and emergencies, matched by HagerLand.',
  'Building materials with one clear quote and delivery to your site in Addis Ababa.',
  'Hire professionals',
  'Construction materials with one clear quote, delivered to site in Addis Ababa.',
]

describe('i18n (spec 25.2m)', () => {
  it('prefixes public links in Amharic and leaves admin, APIs and English alone', () => {
    expect(localizeHref('/property/for-sale', 'am')).toBe('/am/property/for-sale')
    expect(localizeHref('/', 'am')).toBe('/am')
    expect(localizeHref('/supplies?x=1#a', 'am')).toBe('/am/supplies?x=1#a')
    expect(localizeHref('/roodber8/settings', 'am')).toBe('/roodber8/settings')
    expect(localizeHref('/api/health', 'am')).toBe('/api/health')
    expect(localizeHref('/am/property', 'am')).toBe('/am/property')
    expect(localizeHref('https://example.com', 'am')).toBe('https://example.com')
    expect(localizeHref('/property', 'en')).toBe('/property')
  })
  it('recognises and strips the Amharic prefix', () => {
    expect(isAmharicPath('/am')).toBe(true)
    expect(isAmharicPath('/am/jobs')).toBe(true)
    expect(isAmharicPath('/amenities')).toBe(false)
    expect(stripLocale('/am')).toBe('/')
    expect(stripLocale('/am/jobs')).toBe('/jobs')
    expect(stripLocale('/jobs')).toBe('/jobs')
  })
  it('translates known text and falls back to English for anything else', () => {
    const t = translator('am')
    expect(t('Property')).toBe('ንብረት')
    expect(t('Some text without a translation')).toBe('Some text without a translation')
    expect(translator('en')('Property')).toBe('Property')
  })
  it('has a non-empty Ethiopic translation for every entry, including the brand lines, and is marked for native review', () => {
    expect(AM_NEEDS_NATIVE_REVIEW).toBe(true)
    for (const [en, am] of Object.entries(AM_MESSAGES)) {
      expect(am.trim(), en).not.toBe('')
      if (en !== 'English') expect(/[ሀ-፿]/.test(am), en).toBe(true)
    }
    for (const line of [brand.masterLine, brand.supportLine, brand.audienceLine, brand.heroEyebrow]) if (!AWAITING_NATIVE_REVIEW.includes(line)) expect(AM_MESSAGES[line], line).toBeTruthy()
  })
  it('only the six English texts changed by Fix F-4 are awaiting a native speaker (they show in English until then)', () => {
    expect(AWAITING_NATIVE_REVIEW).toHaveLength(6)
    expect(AWAITING_NATIVE_REVIEW).toContain(brand.supportLine)
    for (const en of AWAITING_NATIVE_REVIEW) {
      expect(AM_MESSAGES[en], en).toBeUndefined()
      expect(translator('am')(en)).toBe(en)
    }
    for (const line of [brand.masterLine, brand.audienceLine, brand.heroEyebrow]) expect(AWAITING_NATIVE_REVIEW).not.toContain(line)
  })
})
