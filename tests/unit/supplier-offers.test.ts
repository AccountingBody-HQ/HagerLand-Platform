import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { addDays, defaultValidityDays, freshness, itemKey, normaliseUnit, OFFER_SOURCES, parsePastedLines, parsePriceEtb } from '@/lib/supply/offers'
import { UNITS } from '@/lib/units'
import { roleCanAccess, roleCanExport } from '@/lib/admin/roles'

const migration = readFileSync('supabase/migrations/0035_supplier_offers.sql', 'utf8')

describe('itemKey', () => {
  it('ignores case, accents, punctuation and spacing', () => {
    expect(itemKey('Dangote OPC 42.5 Cement, 50kg!')).toBe('dangote opc 42 5 cement 50kg')
    expect(itemKey('  dangote  opc 42-5 cement   50KG ')).toBe('dangote opc 42 5 cement 50kg')
    expect(itemKey('Café Crème')).toBe('cafe creme')
  })
  it('keeps Amharic text intact', () => {
    expect(itemKey('ሲሚንቶ ዳንጎቴ 50 ኪ.ግ')).toBe('ሲሚንቶ ዳንጎቴ 50 ኪ ግ')
    expect(itemKey('ብረት።')).toBe('ብረት')
  })
})

describe('parsePriceEtb', () => {
  it.each([
    ['1250', 125000],
    ['1,250', 125000],
    ['1250.50', 125050],
    ['1,250.5', 125050],
    ['ETB 1,250', 125000],
    ['1 250', 125000],
    ['38.5', 3850],
    ['1250 birr', 125000],
    ['Br 980', 98000],
    ['0.01', 1],
  ])('reads %s', (input, cents) => expect(parsePriceEtb(input)).toBe(cents))

  it.each(['', '0', '0.00', '-5', 'abc', '12,50', '1.234', '1,2345', 'ETB', '1e5', '12..5'])('rejects %s', (input) => expect(parsePriceEtb(input)).toBeNull())
})

describe('normaliseUnit', () => {
  it.each([
    ['bag', 'bag'], ['Bags', 'bag'], ['sack', 'bag'],
    ['quintal', 'quintal'], ['kuntal', 'quintal'], ['qt', 'quintal'],
    ['pcs', 'piece'], ['pc', 'piece'], ['Piece', 'piece'],
    ['ton', 'tonne'], ['t', 'tonne'],
    ['sqm', 'm2'], ['sq m', 'm2'], ['m²', 'm2'],
    ['cubic metre', 'm3'], ['m3', 'm3'],
    ['m', 'metre'], ['meter', 'metre'],
    ['l', 'litre'], ['Litres', 'litre'],
  ])('maps %s to %s', (input, unit) => expect(normaliseUnit(input)).toBe(unit))
  it('rejects unknown units', () => {
    expect(normaliseUnit('truck')).toBeNull()
    expect(normaliseUnit('')).toBeNull()
  })
  it('only ever returns the site’s units', () => {
    for (const v of ['bag', 'qt', 'pcs', 't', 'sqm', 'cbm', 'm', 'l', 'kg', 'box', 'roll', 'sheet', 'set', 'pair']) expect(UNITS.map((u) => u.value)).toContain(normaliseUnit(v))
  })
})

describe('defaultValidityDays', () => {
  it('is 7 days for cement and reinforcement steel, by category or by name', () => {
    expect(defaultValidityDays({ categorySlug: 'cement-concrete' })).toBe(7)
    expect(defaultValidityDays({ categorySlug: 'steel-rebar' })).toBe(7)
    expect(defaultValidityDays({ itemName: 'Dangote OPC cement 50kg' })).toBe(7)
    expect(defaultValidityDays({ itemName: 'Rebar 12mm' })).toBe(7)
    expect(defaultValidityDays({ itemName: 'ሲሚንቶ 50 ኪ.ግ' })).toBe(7)
    expect(defaultValidityDays({ itemName: 'Cement', fxLinked: true })).toBe(7)
  })
  it('is 14 days for imported or foreign-currency-linked items and 30 otherwise', () => {
    expect(defaultValidityDays({ itemName: 'Ceramic tiles 60x60', fxLinked: true })).toBe(14)
    expect(defaultValidityDays({ itemName: 'Hollow block 20cm' })).toBe(30)
    expect(defaultValidityDays({ categorySlug: 'blocks-bricks', itemName: 'Hollow block' })).toBe(30)
  })
  it('adds calendar days', () => {
    expect(addDays('2026-10-23', 7)).toBe('2026-10-30')
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04')
  })
})

describe('freshness', () => {
  it('is fresh, ageing, then expired', () => {
    expect(freshness('2026-10-01', '2026-10-31', '2026-10-01')).toBe('fresh')
    expect(freshness('2026-10-01', '2026-10-31', '2026-10-15')).toBe('fresh')
    expect(freshness('2026-10-01', '2026-10-31', '2026-10-17')).toBe('ageing')
    expect(freshness('2026-10-01', '2026-10-31', '2026-10-31')).toBe('ageing')
    expect(freshness('2026-10-01', '2026-10-31', '2026-11-01')).toBe('expired')
  })
  it('handles same-day validity', () => {
    expect(freshness('2026-10-23', '2026-10-23', '2026-10-23')).toBe('fresh')
    expect(freshness('2026-10-23', '2026-10-23', '2026-10-24')).toBe('expired')
  })
})

describe('parsePastedLines', () => {
  it('reads comma, tab and semicolon lines and skips blank ones', () => {
    const lines = parsePastedLines('Dangote cement 50kg, bag, 1250\n\nRebar 12mm\tpcs\t980\nHollow block 20cm; piece; 38.5; 1\n')
    expect(lines.map((l) => [l.line, l.item, l.unit, l.priceCents, l.packSize, l.errors])).toEqual([
      [1, 'Dangote cement 50kg', 'bag', 125000, null, []],
      [3, 'Rebar 12mm', 'piece', 98000, null, []],
      [4, 'Hollow block 20cm', 'piece', 3850, 1, []],
    ])
  })
  it('explains every problem in plain English', () => {
    const [few, many, unit, price, pack, noItem] = parsePastedLines('Cement 1250\nA, bag, 1, 2, 3\nSand, truck, 900\nSand, m3, free\nSand, m3, 900, lots\n, bag, 100')
    expect(few.errors).toEqual(['Write item, unit and price, separated by commas'])
    expect(many.errors[0]).toMatch(/Too many columns/)
    expect(unit.errors[0]).toMatch(/“truck” is not a unit we know/)
    expect(price.errors[0]).toMatch(/“free” is not a price/)
    expect(pack.errors[0]).toMatch(/“lots” is not a pack size/)
    expect(noItem.errors).toEqual(['The item name is missing'])
  })
  it('reads "1,250" in a comma-separated line as one price, and a spaced fourth column as the pack size', () => {
    expect(parsePastedLines('Cement, bag, 1,250, 50')[0]).toMatchObject({ priceCents: 125000, packSize: 50, errors: [] })
    expect(parsePastedLines('Block, piece, 38, 100')[0]).toMatchObject({ priceCents: 3800, packSize: 100, errors: [] })
    expect(parsePastedLines('Steel, tonne, 1,250,000.50')[0]).toMatchObject({ priceCents: 125000050, errors: [] })
  })
  it('keeps Amharic item names intact', () => {
    expect(parsePastedLines('ሲሚንቶ ዳንጎቴ, bag, 1,250')[0]).toMatchObject({ item: 'ሲሚንቶ ዳንጎቴ', unit: 'bag', priceCents: 125000, packSize: null, errors: [] })
    expect(parsePastedLines('ሲሚንቶ ዳንጎቴ; bag; 1,250')[0]).toMatchObject({ item: 'ሲሚንቶ ዳንጎቴ', unit: 'bag', priceCents: 125000, errors: [] })
  })
})

describe('migration 0035 and access', () => {
  it('matches the units and sources the app uses', () => {
    const units = /unit text not null check \(unit in \(([^)]+)\)\)/.exec(migration)?.[1]
    expect(Array.from((units ?? '').matchAll(/'([a-z0-9]+)'/g)).map((m) => m[1])).toEqual(UNITS.map((u) => u.value))
    const sources = /source text not null check \(source in \(([^)]+)\)\)/.exec(migration)?.[1]
    expect(Array.from((sources ?? '').matchAll(/'([a-z_]+)'/g)).map((m) => m[1])).toEqual(OFFER_SOURCES.map((s) => s.value))
  })
  it('gives visitors and signed-in users no access at all', () => {
    expect(migration).toMatch(/alter table public\.supplier_offers enable row level security/)
    expect(migration).toMatch(/revoke all on table public\.supplier_offers from public, anon, authenticated/)
    expect(migration).not.toMatch(/\bgrant\b|create policy|create view|security definer|\bdrop\b|\btruncate\b|alter table public\.(?!supplier_offers)/i)
    expect(migration).toMatch(/create unique index if not exists supplier_offers_one_current_key[\s\S]*where status = 'current'/)
  })
  it('is for owner and operations only', () => {
    for (const path of ['/roodber8/supply/partners/abc/offers', '/roodber8/supply/partners/expiring']) {
      expect(roleCanAccess('owner', path)).toBe(true)
      expect(roleCanAccess('operations', path)).toBe(true)
      expect(roleCanAccess('agent', path)).toBe(false)
      expect(roleCanAccess('content', path)).toBe(false)
    }
    expect(roleCanExport('operations', 'supplier-offers')).toBe(false)
  })
})
