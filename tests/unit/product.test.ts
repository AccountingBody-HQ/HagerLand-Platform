import { describe, expect, it } from 'vitest'
import { preparePriceRows, productSchema } from '@/lib/validation/product'

describe('product rules', () => {
  const base = { name: 'Dangote cement 42.5R', category_id: '00000000-0000-4000-8000-000000000001', seller_org_id: '00000000-0000-4000-8000-000000000002', unit: 'bag', price_type: 'fixed', price_etb: '1,250.50', stock_status: 'in_stock', specs: '[{"label":"Weight","value":"50","unit":"kg"}]' }
  it('parses price and specs', () => {
    const p = productSchema.parse(base)
    expect(p.price_etb).toBe(1250.5)
    expect(p.specs).toEqual([{ label: 'Weight', value: '50', unit: 'kg' }])
  })
  it('requires a price unless on request', () => {
    expect(productSchema.safeParse({ ...base, price_etb: '' }).success).toBe(false)
    expect(productSchema.safeParse({ ...base, price_type: 'on_request', price_etb: '' }).success).toBe(true)
  })
  it('rejects unknown units', () => expect(productSchema.safeParse({ ...base, unit: 'bucket' }).success).toBe(false))
})

describe('bulk price updates', () => {
  it('matches SKUs and converts to cents', () => {
    const rows = preparePriceRows(
      [
        { sku: 'CEM-50', price: '1,250.50', stock_status: 'in_stock' },
        { sku: 'nope', price: '10' },
        { sku: 'CEM-50', price: 'abc' },
        { sku: 'CEM-50', stock_status: 'sold' },
      ],
      [{ id: 'p1', sku: 'cem-50', name: 'Cement' }],
    )
    expect(rows[0]).toMatchObject({ productId: 'p1', priceCents: 125050, stock: 'in_stock', errors: [] })
    expect(rows[1].errors).toContain('No product with this SKU')
    expect(rows[2].errors).toContain('Price must be a number')
    expect(rows[3].errors.join()).toContain('stock_status must be one of')
  })
})
