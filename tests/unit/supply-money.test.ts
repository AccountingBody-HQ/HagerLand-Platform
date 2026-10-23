import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  bpsToPercent,
  canTransition,
  commissionDueCents,
  customerNetPaid,
  customerTotalCents,
  hagerlandEarned,
  lineTotalCents,
  needsAction,
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  percentToBps,
  roundHalfUp,
  summariseLedger,
  supplierTotalCents,
  type LedgerRow,
  type MoneyModel,
} from '@/lib/supply/money'
import { roleCanAccess } from '@/lib/admin/roles'

const migration = readFileSync('supabase/migrations/0037_supply_orders_ledger.sql', 'utf8')

describe('rounding and totals', () => {
  it('rounds half up to the cent', () => {
    expect(roundHalfUp(0.5)).toBe(1)
    expect(roundHalfUp(2.5)).toBe(3)
    expect(roundHalfUp(2.4999)).toBe(2)
    expect(roundHalfUp(100.49999999999999)).toBe(101)
    expect(lineTotalCents(3333, 1.5)).toBe(5000)
    expect(lineTotalCents(125000, 50)).toBe(6250000)
    expect(lineTotalCents(101, 0.5)).toBe(51)
  })
  it('adds up supplier and customer totals with delivery', () => {
    const lines = [
      { quantity: 50, supplierUnitPriceCents: 122000, customerUnitPriceCents: 130000 },
      { quantity: 2.5, supplierUnitPriceCents: 3333, customerUnitPriceCents: 4001 },
    ]
    expect(supplierTotalCents(lines, 100000)).toBe(6100000 + 8333 + 100000)
    expect(customerTotalCents(lines, 50000)).toBe(6500000 + 10003 + 50000)
    expect(customerTotalCents([{ quantity: 1, supplierUnitPriceCents: 1, customerUnitPriceCents: null }], 0)).toBeNull()
  })
  it('works out commission from a rate in basis points', () => {
    expect(commissionDueCents(6100000, 500)).toBe(305000)
    expect(commissionDueCents(333, 150)).toBe(5)
    expect(percentToBps('5')).toBe(500)
    expect(percentToBps('2.5%')).toBe(250)
    expect(percentToBps('12.75')).toBe(1275)
    expect(percentToBps('101')).toBeNull()
    expect(percentToBps('abc')).toBeNull()
    expect(bpsToPercent(500)).toBe('5%')
    expect(bpsToPercent(1000)).toBe('10%')
    expect(bpsToPercent(250)).toBe('2.5%')
    expect(bpsToPercent(1275)).toBe('12.75%')
  })
})

describe('ledger summary and HagerLand earned', () => {
  const e = (id: string, entry_type: string, direction: string, amount_cents: number, reverses_entry_id: string | null = null): LedgerRow => ({ id, entry_type, direction, amount_cents, reverses_entry_id })
  it('model A: payments − refunds − supplier payments + service fees, with reversals taken out', () => {
    const rows = [
      e('p1', 'customer_payment', 'in', 500000),
      e('p2', 'customer_payment', 'in', 700000),
      e('r1', 'reversal', 'out', 500000, 'p1'),
      e('p3', 'customer_payment', 'in', 500000),
      e('s1', 'supplier_payment', 'out', 1000000),
      e('f1', 'service_fee', 'in', 20000),
      e('x1', 'refund', 'out', 50000),
      e('a1', 'adjustment', 'out', 1000),
    ]
    const s = summariseLedger(rows)
    expect(s).toMatchObject({ customerPaid: 1200000, refunds: 50000, supplierPaid: 1000000, serviceFees: 20000, adjustmentsOut: 1000 })
    expect(customerNetPaid(s)).toBe(1150000)
    expect(hagerlandEarned('A', s)).toBe(1200000 - 50000 - 1000000 + 20000 - 1000)
  })
  it('model B: commission received + service fees; commission due is tracked separately', () => {
    const s = summariseLedger([e('d', 'commission_due', 'receivable', 305000), e('c', 'commission_received', 'in', 305000), e('f', 'service_fee', 'in', 10000), e('rd', 'reversal', 'receivable', 305000, 'd')])
    expect(s.commissionDue).toBe(0)
    expect(s.commissionReceived).toBe(305000)
    expect(hagerlandEarned('B', s)).toBe(315000)
  })
})

describe('order status changes', () => {
  it('match the database table in migration 0037 exactly', () => {
    const fn = migration.slice(migration.indexOf('create or replace function public.supply_order_transition_allowed'), migration.indexOf('create or replace function public.supply_orders_guard'))
    const pairs = (block: string) => Array.from(block.matchAll(/\('([a-z_]+)', '([a-z_]+)'\)/g)).map((m) => `${m[1]}>${m[2]}`)
    const common = pairs(fn.slice(0, fn.indexOf("or (p_model = 'A'")))
    const onlyA = pairs(fn.slice(fn.indexOf("or (p_model = 'A'"), fn.indexOf("or (p_model = 'B'")))
    const onlyB = pairs(fn.slice(fn.indexOf("or (p_model = 'B'")))
    const fromTs = (model: MoneyModel) => Object.entries(ORDER_TRANSITIONS[model]).flatMap(([from, tos]) => (tos ?? []).map((to) => `${from}>${to}`)).sort()
    expect(fromTs('A')).toEqual([...common, ...onlyA].sort())
    expect(fromTs('B')).toEqual([...common, ...onlyB].sort())
  })
  it('never lets a model A order be placed before payment, and model B never waits for payment', () => {
    expect(canTransition('A', 'draft', 'placed')).toBe(false)
    expect(canTransition('A', 'awaiting_payment', 'placed')).toBe(false)
    expect(canTransition('A', 'paid', 'placed')).toBe(true)
    expect(canTransition('B', 'draft', 'placed')).toBe(true)
    for (const s of ORDER_STATUSES) {
      expect(canTransition('B', s, 'awaiting_payment')).toBe(false)
      expect(canTransition('B', s, 'paid')).toBe(false)
    }
  })
  it('allows cancelling only before delivery, completing only from delivered, and nothing after completed or cancelled', () => {
    for (const s of ['draft', 'awaiting_payment', 'paid', 'placed', 'confirmed', 'out_for_delivery'] as const) expect(canTransition('A', s, 'cancelled')).toBe(true)
    expect(canTransition('A', 'delivered', 'cancelled')).toBe(false)
    expect(canTransition('A', 'disputed', 'cancelled')).toBe(true)
    expect(ORDER_STATUSES.filter((s) => canTransition('A', s, 'completed'))).toEqual(['delivered'])
    for (const to of ORDER_STATUSES) {
      expect(canTransition('A', 'completed', to)).toBe(false)
      expect(canTransition('B', 'cancelled', to)).toBe(false)
    }
  })
})

describe('needs action', () => {
  const now = new Date('2026-10-23T12:00:00Z').getTime()
  const ago = (days: number) => new Date(now - days * 86_400_000).toISOString()
  it('flags orders stuck at a step and deliveries without proof', () => {
    expect(needsAction({ status: 'awaiting_payment', statusChangedAt: ago(4), hasProof: false }, now)).toBe('Waiting for payment for more than 3 days')
    expect(needsAction({ status: 'awaiting_payment', statusChangedAt: ago(2), hasProof: false }, now)).toBeNull()
    expect(needsAction({ status: 'placed', statusChangedAt: ago(3), hasProof: false }, now)).toBe('Not confirmed by the supplier after 2 days')
    expect(needsAction({ status: 'out_for_delivery', statusChangedAt: ago(4), hasProof: false }, now)).toBe('Out for delivery for more than 3 days')
    expect(needsAction({ status: 'delivered', statusChangedAt: ago(0), hasProof: false }, now)).toBe('Delivered without delivery proof')
    expect(needsAction({ status: 'delivered', statusChangedAt: ago(0), hasProof: true }, now)).toBeNull()
  })
})

describe('who can open orders and the ledger', () => {
  it('orders: owner and operations; ledger and agreements: owner only', () => {
    expect(roleCanAccess('operations', '/roodber8/supply/orders')).toBe(true)
    expect(roleCanAccess('operations', '/roodber8/supply/orders/abc')).toBe(true)
    expect(roleCanAccess('operations', '/roodber8/supply/ledger')).toBe(false)
    expect(roleCanAccess('operations', '/roodber8/supply/agreements')).toBe(false)
    for (const role of ['agent', 'content'] as const) {
      expect(roleCanAccess(role, '/roodber8/supply/orders')).toBe(false)
      expect(roleCanAccess(role, '/roodber8/supply/ledger')).toBe(false)
    }
    expect(roleCanAccess('owner', '/roodber8/supply/ledger')).toBe(true)
  })
})

describe('migration 0037', () => {
  it('keeps every new table server-only and never drops anything', () => {
    for (const t of ['supply_agreements', 'supply_orders', 'supply_order_lines', 'supply_order_events', 'supply_delivery_proofs', 'supply_ledger_entries']) expect(migration).toContain(`alter table public.${t} enable row level security`)
    expect(migration).toMatch(/revoke all on table public\.supply_agreements, public\.supply_orders, public\.supply_order_lines, public\.supply_order_events,\s+public\.supply_delivery_proofs, public\.supply_ledger_entries from public, anon, authenticated/)
    expect(migration).not.toMatch(/\bdrop\b|\btruncate table\b|create policy|security definer/i)
    expect(migration).not.toMatch(/grant [a-z, ]+ on (table )?public\./i)
  })
})
