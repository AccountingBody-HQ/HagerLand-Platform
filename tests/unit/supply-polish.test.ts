import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { relationshipStatusChange } from '@/lib/supply/partners'
import { newerVersion, rememberedVersion, rememberVersion } from '@/lib/admin/latest-version'
import { refundableCents, summariseLedger, type LedgerRow } from '@/lib/supply/money'

describe('P1: one status rule for "Change status" and "Save supply record"', () => {
  const now = new Date('2026-10-24T09:00:00Z')
  it('gives the columns to write for a new status, with the time of the change', () => {
    expect(relationshipStatusChange('discovered', 'active', now)).toEqual({ ok: true, patch: { relationship_status: 'active', status_changed_at: '2026-10-24T09:00:00.000Z' } })
  })
  it('writes nothing when the status is the same', () => {
    expect(relationshipStatusChange('active', 'active', now)).toEqual({ ok: true, patch: null })
  })
  it('refuses a status that is not on the list', () => {
    expect(relationshipStatusChange('active', 'best_friend', now)).toEqual({ ok: false, error: 'Choose a status from the list.' })
    expect(relationshipStatusChange('active', '', now).ok).toBe(false)
  })
  it('both actions use the rule and the same audit entry; the main save checks it before saving anything', () => {
    const src = readFileSync('app/roodber8/actions/supply-partners.ts', 'utf8')
    const save = src.slice(src.indexOf('export async function saveSupplyPartnerAction'), src.indexOf('export async function setSupplyPartnerStatusAction'))
    const change = src.slice(src.indexOf('export async function setSupplyPartnerStatusAction'), src.indexOf('/** Adds a photo'))
    for (const body of [save, change]) {
      expect(body).toContain('relationshipStatusChange(')
      expect(body).toContain('audit(...statusAudit(')
    }
    // A refused status returns before the record is written.
    expect(save.indexOf('Nothing was saved')).toBeLessThan(save.indexOf(".update({ ...row, ...statusPatch })"))
    // One write for the record and its status, so a failed save changes neither.
    expect(save).toContain(".update({ ...row, ...statusPatch })")
    expect((src.match(/'supply\.partner\.status'/g) ?? []).length).toBe(1)
  })
})

describe('P2: own saves do not look like someone else’s change', () => {
  it('picks the later updated_at', () => {
    expect(newerVersion('2026-10-24T09:00:00.000Z', '2026-10-24T09:00:01.500Z')).toBe('2026-10-24T09:00:01.500Z')
    expect(newerVersion('2026-10-24T09:00:02+00:00', '2026-10-24T09:00:01Z')).toBe('2026-10-24T09:00:02+00:00')
    expect(newerVersion(null, '2026-10-24T09:00:00Z')).toBe('2026-10-24T09:00:00Z')
    expect(newerVersion('2026-10-24T09:00:00Z', undefined)).toBe('2026-10-24T09:00:00Z')
  })
  it('remembering never goes back to an older version', () => {
    rememberVersion('order:test', '2026-10-24T09:00:05Z')
    rememberVersion('order:test', '2026-10-24T09:00:01Z')
    rememberVersion('order:test', null)
    expect(rememberedVersion('order:test')).toBe('2026-10-24T09:00:05Z')
    expect(rememberedVersion('order:other')).toBeNull()
  })
  it('order saves return the new updated_at, and a status change that matched nothing is a stale edit', () => {
    const src = readFileSync('app/roodber8/actions/supply-orders.ts', 'utf8')
    for (const fn of ['saveDraftOrderAction', 'setOrderStatusAction', 'setPromisedDateAction']) {
      const body = src.slice(src.indexOf(`export async function ${fn}`))
      const end = body.indexOf('\n}\n')
      expect(body.slice(0, end), fn).toContain('updatedAt: saved.updated_at')
      expect(body.slice(0, end), fn).toContain('fail(STALE_EDIT)')
    }
    expect(src).toContain('if (!saved) return fail(STALE_EDIT)')
  })
})

describe('P5: refund prefill', () => {
  const row = (id: string, entry_type: string, direction: string, amount_cents: number, reverses_entry_id: string | null = null): LedgerRow => ({ id, entry_type, direction, amount_cents, reverses_entry_id })
  it('is payments minus refunds already recorded', () => {
    expect(refundableCents(summariseLedger([row('a', 'customer_payment', 'in', 3_000_000), row('b', 'customer_payment', 'in', 4_100_000)]))).toBe(7_100_000)
    expect(refundableCents(summariseLedger([row('a', 'customer_payment', 'in', 7_100_000), row('b', 'refund', 'out', 2_000_000)]))).toBe(5_100_000)
  })
  it('is zero when everything was refunded, and never negative', () => {
    expect(refundableCents(summariseLedger([row('a', 'customer_payment', 'in', 1_000_000), row('b', 'refund', 'out', 1_000_000)]))).toBe(0)
    expect(refundableCents(summariseLedger([row('b', 'refund', 'out', 500_000)]))).toBe(0)
    expect(refundableCents(summariseLedger([]))).toBe(0)
  })
  it('a reversed payment is not refundable', () => {
    expect(refundableCents(summariseLedger([row('a', 'customer_payment', 'in', 1_000_000), row('r', 'reversal', 'out', 1_000_000, 'a')]))).toBe(0)
  })
})
