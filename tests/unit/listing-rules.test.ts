import { describe, expect, it } from 'vitest'
import { canRenew, resumeOutcome } from '@/lib/listing-rules'

const now = Date.parse('2026-10-13T12:00:00Z')
const day = 86_400_000
const iso = (t: number) => new Date(t).toISOString()

describe('resuming a paused listing', () => {
  it('republishes when unchanged and not expired', () => expect(resumeOutcome({ expires_at: iso(now + 10 * day), pending_changes: null }, now)).toBe('publish'))
  it('sends it for review when there are pending changes', () => expect(resumeOutcome({ expires_at: iso(now + 10 * day), pending_changes: { price_etb: 1 } }, now)).toBe('review'))
  it('treats empty pending changes as no changes', () => expect(resumeOutcome({ expires_at: iso(now + 10 * day), pending_changes: {} }, now)).toBe('publish'))
  it('expires it when the expiry date has passed, even with changes', () => expect(resumeOutcome({ expires_at: iso(now - day), pending_changes: { a: 1 } }, now)).toBe('expire'))
  it('expires it when there is no expiry date', () => expect(resumeOutcome({ expires_at: null, pending_changes: null }, now)).toBe('expire'))
})

describe('renewing', () => {
  it('allows renewal in the last 14 days', () => {
    expect(canRenew({ status: 'published', expires_at: iso(now + 5 * day) }, now)).toBe(true)
    expect(canRenew({ status: 'published', expires_at: iso(now + 30 * day) }, now)).toBe(false)
  })
  it('allows renewal up to 30 days after expiry', () => {
    expect(canRenew({ status: 'expired', expires_at: iso(now - 10 * day) }, now)).toBe(true)
    expect(canRenew({ status: 'expired', expires_at: iso(now - 40 * day) }, now)).toBe(false)
  })
  it('does not renew drafts', () => expect(canRenew({ status: 'draft', expires_at: null }, now)).toBe(false))
})
