import { z } from 'zod'
import { UNITS } from '@/lib/units'
import { decimalFromForm, intFromForm, optionalText, textSchema } from './common'

const blank = (v: unknown) => (v === '' || v === null ? undefined : v)

/** Organisations that sell through HagerLand Supply themselves (spec 25.2c). */
export const SELLER_KINDS = ['supplier', 'manufacturer'] as const

export const specSchema = z.object({ label: z.string().trim().min(1).max(80), value: z.string().trim().min(1).max(160), unit: z.string().trim().max(20).optional() })

export const productSchema = z
  .object({
    id: z.preprocess(blank, z.uuid().optional()),
    name: textSchema(160, { min: 2, label: 'Name' }),
    category_id: z.uuid({ error: 'Choose a category' }),
    brand_id: z.preprocess(blank, z.uuid().optional()),
    new_brand: optionalText(80, 'Brand'),
    seller_org_id: z.uuid({ error: 'Choose the seller' }),
    sku: optionalText(60, 'SKU'),
    model_number: optionalText(60, 'Model'),
    summary: optionalText(300, 'Summary'),
    description: optionalText(8000, 'Description'),
    specs: z.preprocess((v) => {
      if (typeof v !== 'string' || !v) return []
      try {
        return JSON.parse(v)
      } catch {
        return []
      }
    }, z.array(specSchema).max(40)),
    unit: z.enum(UNITS.map((u) => u.value) as [string, ...string[]]),
    pack_size: optionalText(60, 'Pack size'),
    min_order_qty: decimalFromForm({ min: 0.01, max: 1_000_000 }),
    price_type: z.enum(['fixed', 'from', 'on_request']),
    price_etb: decimalFromForm({ min: 0, max: 1_000_000_000 }),
    trade_price_etb: decimalFromForm({ min: 0, max: 1_000_000_000 }),
    stock_status: z.enum(['in_stock', 'low_stock', 'out_of_stock', 'made_to_order', 'available_on_request']),
    lead_time_days: intFromForm({ min: 0, max: 365 }),
    country_of_origin: optionalText(60, 'Country'),
    warranty: optionalText(120, 'Warranty'),
    delivery_available: z.preprocess((v) => v === 'on' || v === 'true', z.boolean()),
  })
  .refine((d) => d.price_type === 'on_request' || d.price_etb !== undefined, { message: 'Enter a price, or choose "Price on request"', path: ['price_etb'] })

export type ProductInput = z.infer<typeof productSchema>

/** Bulk price update rows: sku, price (ETB), stock_status. */
export interface PriceRow {
  line: number
  sku: string
  priceCents: number | null
  stock: string | null
  productId: string | null
  productName: string
  errors: string[]
  duplicate?: boolean
}

const STOCK = ['in_stock', 'low_stock', 'out_of_stock', 'made_to_order', 'available_on_request']

export function preparePriceRows(rows: Record<string, string>[], products: { id: string; sku: string | null; name: string }[]): PriceRow[] {
  return rows.map((r, i) => {
    const errors: string[] = []
    const sku = (r.sku ?? '').trim()
    const product = products.find((p) => p.sku && p.sku.toLowerCase() === sku.toLowerCase())
    if (!sku) errors.push('SKU is missing')
    else if (!product) errors.push('No product with this SKU')
    const priceRaw = (r.price ?? r.price_etb ?? '').replace(/[,\s]/g, '')
    let priceCents: number | null = null
    if (priceRaw) {
      const n = Number(priceRaw)
      if (!Number.isFinite(n) || n < 0) errors.push('Price must be a number')
      else priceCents = Math.round(n * 100)
    }
    const stock = (r.stock_status ?? '').trim().toLowerCase() || null
    if (stock && !STOCK.includes(stock)) errors.push(`stock_status must be one of ${STOCK.join(', ')}`)
    if (priceCents === null && !stock) errors.push('Nothing to update (give a price or a stock status)')
    return { line: i + 2, sku, priceCents, stock, productId: product?.id ?? null, productName: product?.name ?? '', errors }
  })
}
