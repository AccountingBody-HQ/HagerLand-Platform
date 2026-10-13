import { describe, expect, it } from 'vitest'
import { formatArea, formatDate, formatETB, formatETBCents, formatETBCompact, formatPhone, normalisePhone, relativeTime, telegramLink, whatsappLink } from '@/lib/format'

describe('prices', () => {
  it('formats whole birr', () => expect(formatETB(4500000)).toBe('ETB 4,500,000'))
  it('formats cents, dropping .00', () => {
    expect(formatETBCents(120000)).toBe('ETB 1,200')
    expect(formatETBCents(120050)).toBe('ETB 1,200.50')
  })
  it('formats compact amounts', () => {
    expect(formatETBCompact(4_500_000)).toBe('ETB 4.5M')
    expect(formatETBCompact(35_000)).toBe('ETB 35K')
  })
  it('returns empty for missing values', () => expect(formatETB(null)).toBe(''))
})

describe('areas and dates', () => {
  it('formats square metres', () => expect(formatArea(120)).toBe('120 m²'))
  it('formats dates as 12 Oct 2026', () => expect(formatDate('2026-10-12T10:00:00Z')).toBe('12 Oct 2026'))
  it('describes freshness', () => {
    const now = new Date('2026-10-13T12:00:00Z')
    expect(relativeTime('2026-10-13T08:00:00Z', now)).toBe('today')
    expect(relativeTime('2026-10-12T08:00:00Z', now)).toBe('yesterday')
    expect(relativeTime('2026-10-10T08:00:00Z', now)).toBe('3 days ago')
  })
})

describe('phones', () => {
  it.each([
    ['0911234567', '+251911234567'],
    ['911234567', '+251911234567'],
    ['+251 91 123 4567', '+251911234567'],
    ['00251911234567', '+251911234567'],
    ['0711234567', '+251711234567'],
    ['+447700900123', '+447700900123'],
  ])('normalises %s', (input, out) => expect(normalisePhone(input)).toBe(out))
  it.each(['0811234567', '12345', '+2519112', 'abc', ''])('rejects %s', (input) => expect(normalisePhone(input)).toBeNull())
  it('displays Ethiopian numbers in groups', () => expect(formatPhone('+251911234567')).toBe('+251 91 123 4567'))
  it('builds WhatsApp and Telegram links', () => {
    expect(whatsappLink('+251911234567', 'Hi there')).toBe('https://wa.me/251911234567?text=Hi%20there')
    expect(telegramLink('@hagerland_et')).toBe('https://t.me/hagerland_et')
    expect(telegramLink('x')).toBeNull()
  })
})
