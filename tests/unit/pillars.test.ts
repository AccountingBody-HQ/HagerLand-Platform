import { describe, expect, it } from 'vitest'
import { activeModes, DEFAULT_PILLARS, JOURNEY, MODE_LABELS, modeStatus, PILLAR_KEYS, pillarForPath, serviceOn, VERTICAL_PILLAR } from '@/lib/pillars'
import { VERTICAL_KEYS } from '@/lib/verticals'

describe('pillar modes (spec 26.3)', () => {
  it('visible when any mode is on, coming soon with only interest, hidden with none', () => {
    expect(modeStatus({ direct: true, aggregate: false, interest: false })).toBe('live')
    expect(modeStatus({ direct: false, aggregate: true, interest: true })).toBe('live')
    expect(modeStatus({ direct: false, aggregate: false, interest: true })).toBe('coming_soon')
    expect(modeStatus({ direct: false, aggregate: false, interest: false })).toBe('hidden')
  })

  it('customer labels never use the letters D, A or I', () => {
    expect(Object.values(MODE_LABELS)).toEqual(['Provided by HagerLand', 'Trusted partners', 'Register your interest'])
    expect(activeModes({ direct: true, aggregate: false, interest: true })).toEqual(['direct', 'interest'])
  })

  it('launch defaults follow AB’s approval of 15 Oct 2026', () => {
    const m = Object.fromEntries(DEFAULT_PILLARS.map((p) => [p.key, [p.direct, p.aggregate, p.interest]]))
    expect(m).toEqual({
      buy: [true, true, false],
      rent: [true, true, false],
      build: [false, true, true],
      maintain: [true, true, false],
      manage: [true, true, false],
      finance: [false, false, true],
      insurance: [false, false, true],
      advice: [true, false, false],
      supplies: [true, true, false],
      jobs: [true, true, true],
    })
    expect(DEFAULT_PILLARS.map((p) => p.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('every vertical maps to a pillar and the journey strip uses known pillars', () => {
    for (const v of VERTICAL_KEYS) expect(PILLAR_KEYS).toContain(VERTICAL_PILLAR[v])
    expect(JOURNEY.map((j) => j.label)).toEqual(['Find', 'Buy or rent', 'Finance', 'Build', 'Supply', 'Insure', 'Maintain', 'Manage', 'Sell or let'])
  })

  it('deep pages belong to their pillar', () => {
    expect(pillarForPath('/buy')).toBe('buy')
    expect(pillarForPath('/property/for-sale/addis-ababa')).toBe('buy')
    expect(pillarForPath('/property/to-rent')).toBe('rent')
    expect(pillarForPath('/repairs-maintenance')).toBe('maintain')
    expect(pillarForPath('/diaspora/property-care')).toBe('manage')
    expect(pillarForPath('/guides/a-guide')).toBe('advice')
    expect(pillarForPath('/supplies/roofing')).toBe('supplies')
    expect(pillarForPath('/about')).toBeNull()
  })

  it('a sub-service is on only when its switch is on and its pillar is visible', () => {
    const list = DEFAULT_PILLARS.map((p) => (p.key === 'buy' ? { ...p, services: [{ key: 'estate-agency', name: 'Agency', direct: true, aggregate: false, interest: false }] } : p))
    expect(serviceOn(list, 'buy', 'estate-agency')).toBe(true)
    expect(serviceOn(list, 'buy', 'estate-agency', 'aggregate')).toBe(false)
    const hidden = list.map((p) => (p.key === 'buy' ? { ...p, status: 'hidden' as const } : p))
    expect(serviceOn(hidden, 'buy', 'estate-agency')).toBe(false)
  })
})
