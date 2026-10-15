import { describe, expect, it } from 'vitest'
import { isAmharicPath, localizeHref, stripLocale } from '@/lib/i18n/config'
import { translator } from '@/lib/i18n/translate'
import { AM_MESSAGES, AM_NEEDS_NATIVE_REVIEW } from '@/lib/i18n/messages/am'
import { brand } from '@/lib/brand'

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
    for (const line of [brand.masterLine, brand.supportLine, brand.audienceLine, brand.heroEyebrow]) expect(AM_MESSAGES[line]).toBeTruthy()
  })
})
