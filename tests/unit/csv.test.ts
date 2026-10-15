import { describe, expect, it } from 'vitest'
import { parseCsv, toCsv } from '@/lib/admin/csv'

describe('CSV', () => {
  it('round-trips quotes, commas and newlines', () => {
    const rows = [{ name: 'Bole "Heights", Tower A', note: 'line 1\nline 2', n: 3 }]
    const back = parseCsv(toCsv(rows))
    expect(back).toEqual([{ name: 'Bole "Heights", Tower A', note: 'line 1\nline 2', n: '3' }])
  })
  it('neutralises spreadsheet formulas', () => {
    expect(toCsv([{ a: '=HYPERLINK("x")' }])).toContain(`"'=HYPERLINK(""x"")"`)
  })
  it('ignores blank lines and a byte-order mark', () => {
    expect(parseCsv('﻿sku,price\r\n\r\nA1,100\r\n')).toEqual([{ sku: 'A1', price: '100' }])
  })
})
