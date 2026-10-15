import { describe, expect, it } from 'vitest'
import { guideSchema, parseFaqText, parseGuideBody, faqToText } from '@/lib/guides'
import { estimateCost, pickRate, type Rate } from '@/lib/estimator'

describe('guides (spec 25.2g)', () => {
  it('turns the plain-text body into headings, paragraphs and lists', () => {
    expect(parseGuideBody('Intro line one\nline two\n\n## Heading\n- a\n- b\nAfter list')).toEqual([
      { type: 'p', text: 'Intro line one line two' },
      { type: 'h2', text: 'Heading' },
      { type: 'ul', items: ['a', 'b'] },
      { type: 'p', text: 'After list' },
    ])
  })
  it('keeps HTML as text (nothing is interpreted)', () => {
    expect(parseGuideBody('<script>alert(1)</script>')).toEqual([{ type: 'p', text: '<script>alert(1)</script>' }])
  })
  it('reads and writes FAQ pairs', () => {
    const items = parseFaqText('Q: One?\nA: Yes.\n\nQ: Two?\nA: No,\nreally.\n\nQ: Missing answer')
    expect(items).toEqual([{ question: 'One?', answer: 'Yes.' }, { question: 'Two?', answer: 'No,\nreally.' }])
    expect(parseFaqText(faqToText(items))).toEqual(items)
  })
  it('refuses to publish content that has not been checked', () => {
    const base = { title: 'A good guide', slug: 'a-good-guide', topic: 'property', summary: 'A short summary here.', body: 'x'.repeat(60), status: 'published' }
    expect(guideSchema.safeParse({ ...base }).success).toBe(false)
    expect(guideSchema.safeParse({ ...base, reviewed: 'on' }).success).toBe(true)
    expect(guideSchema.safeParse({ ...base, status: 'draft' }).success).toBe(true)
  })
})

describe('build-cost estimator (spec 25.2h)', () => {
  const rates: Rate[] = [
    { location_id: null, location_name: null, finish: 'standard', rate_etb_per_m2: 20000, updated_at: '2026-10-01' },
    { location_id: 'addis', location_name: 'Addis Ababa', finish: 'standard', rate_etb_per_m2: 25000, updated_at: '2026-10-01' },
  ]
  it('uses the local rate, else the nationwide one', () => {
    expect(pickRate(rates, 'addis', 'standard')?.rate_etb_per_m2).toBe(25000)
    expect(pickRate(rates, 'hawassa', 'standard')?.rate_etb_per_m2).toBe(20000)
    expect(pickRate(rates, 'addis', 'premium')).toBeNull()
  })
  it('multiplies the total floor area by the rate', () => {
    expect(estimateCost(120, 2, 25000)).toEqual({ areaM2: 240, total: 6_000_000 })
    expect(estimateCost(0, 2, 25000)).toBeNull()
    expect(estimateCost(100, 0, 25000)).toBeNull()
  })
})
