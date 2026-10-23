// Supplier offers (admin): pure helpers for price lists. Matches the checks in migration 0035 and is unit-tested.
import { UNITS } from '@/lib/units'

export const OFFER_SOURCES = [
  { value: 'direct_call', label: 'Phone call with the business' },
  { value: 'site_visit', label: 'Site visit' },
  { value: 'partner_submitted', label: 'Sent by the business' },
  { value: 'price_list_photo', label: 'Photo of a price list' },
  { value: 'business_website', label: 'The business’s own website or page' },
  { value: 'other', label: 'Other' },
] as const
export type OfferSource = (typeof OFFER_SOURCES)[number]['value']

export const OFFER_STATUSES = ['current', 'superseded', 'withdrawn'] as const
export const VAT_OPTIONS = [
  { value: 'unknown', label: 'Not known' },
  { value: 'yes', label: 'Yes, VAT included' },
  { value: 'no', label: 'No, VAT on top' },
] as const

/** "Dangote OPC 42.5 Cement, 50kg!" → "dangote opc 42 5 cement 50kg". Amharic letters are kept. */
export function itemKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 200)
}

/** ETB text to cents: "1,250", "1250.50", "ETB 1,250", "1 250 birr". Null for zero, negatives and anything else. */
export function parsePriceEtb(input: string): number | null {
  const text = input.trim().replace(/^(etb|br|birr)\.?\s*/i, '').replace(/\s*(etb|br|birr)\.?$/i, '')
  if (!/^\d{1,3}([,\s]\d{3})*(\.\d{1,2})?$|^\d+(\.\d{1,2})?$/.test(text)) return null
  const cents = Math.round(Number(text.replace(/[,\s]/g, '')) * 100)
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 100_000_000_000 ? cents : null
}

const UNIT_SYNONYMS: Record<string, string> = {
  bag: 'bag', bags: 'bag', sack: 'bag', sacks: 'bag',
  quintal: 'quintal', quintals: 'quintal', kuntal: 'quintal', qt: 'quintal', ql: 'quintal',
  piece: 'piece', pieces: 'piece', pcs: 'piece', pc: 'piece', each: 'piece', ea: 'piece',
  tonne: 'tonne', tonnes: 'tonne', ton: 'tonne', tons: 'tonne', t: 'tonne',
  m2: 'm2', 'm²': 'm2', sqm: 'm2', 'sq m': 'm2', 'square metre': 'm2', 'square meter': 'm2',
  m3: 'm3', 'm³': 'm3', 'cubic metre': 'm3', 'cubic meter': 'm3', cbm: 'm3',
  metre: 'metre', metres: 'metre', meter: 'metre', meters: 'metre', m: 'metre',
  litre: 'litre', litres: 'litre', liter: 'litre', liters: 'litre', l: 'litre', ltr: 'litre',
  kg: 'kg', kgs: 'kg', kilo: 'kg', kilos: 'kg',
  box: 'box', boxes: 'box', roll: 'roll', rolls: 'roll', sheet: 'sheet', sheets: 'sheet', set: 'set', sets: 'set', pair: 'pair', pairs: 'pair',
}

/** A unit as people type it → one of the site's units (lib/units), or null. */
export function normaliseUnit(input: string): string | null {
  const key = input.trim().toLowerCase().replace(/\.$/, '').replace(/\s+/g, ' ')
  const unit = UNIT_SYNONYMS[key] ?? null
  return unit && UNITS.some((u) => u.value === unit) ? unit : null
}

/** Categories whose prices move weekly; anything else that names cement or reinforcement steel counts too. */
export const SHORT_VALIDITY_CATEGORY_SLUGS = ['cement-concrete', 'steel-rebar']
const SHORT_VALIDITY_WORDS = /\b(cement|rebar|re-bar|reinforcement|reinforcing|deformed bar|steel bar)\b|ሲሚንቶ|ብረት/i

export const VALIDITY_DAYS = { short: 7, fx: 14, standard: 30 } as const

export function defaultValidityDays(opts: { categorySlug?: string | null; itemName?: string | null; fxLinked?: boolean }): number {
  if ((opts.categorySlug && SHORT_VALIDITY_CATEGORY_SLUGS.includes(opts.categorySlug)) || SHORT_VALIDITY_WORDS.test(opts.itemName ?? '')) return VALIDITY_DAYS.short
  return opts.fxLinked ? VALIDITY_DAYS.fx : VALIDITY_DAYS.standard
}

/** YYYY-MM-DD plus days (calendar dates, no time zone drift). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000)
}

export type Freshness = 'fresh' | 'ageing' | 'expired'

/** Fresh: under half its validity used. Ageing: over half. Expired: past valid until. */
export function freshness(priceDate: string, validUntil: string, today: string): Freshness {
  if (today > validUntil) return 'expired'
  const total = Math.max(1, daysBetween(priceDate, validUntil))
  return daysBetween(priceDate, today) * 2 > total ? 'ageing' : 'fresh'
}

export const FRESHNESS_LABEL: Record<Freshness, string> = { fresh: 'Fresh', ageing: 'Ageing', expired: 'Expired' }

export interface PastedLine {
  line: number
  raw: string
  item: string
  unit: string | null
  priceCents: number | null
  packSize: number | null
  errors: string[]
}

/**
 * One price per line: item, unit, price, optional pack size. Separated by tabs (pasted from a spreadsheet), semicolons
 * or commas (put a space after each comma; "1,250" is read as one price). Blank lines are skipped. Problems are listed in plain English and the line is not imported.
 */
export function parsePastedLines(text: string): PastedLine[] {
  const out: PastedLine[] = []
  text.replace(/\r\n?/g, '\n').split('\n').forEach((raw, i) => {
    if (!raw.trim()) return
    const sep = raw.includes('\t') ? '\t' : raw.includes(';') ? ';' : ','
    // With commas between columns, "1,250" (no space, three digits after) is a thousands separator, not a column.
    const protectedRaw = sep === ',' ? raw.replace(/(\d),(?=\d{3}(?!\d))/g, '$1\u0000') : raw
    const cells = protectedRaw.split(sep).map((c) => c.replace(/\u0000/g, ',').trim())
    const errors: string[] = []
    if (cells.length < 3) errors.push('Write item, unit and price, separated by commas')
    if (cells.length > 4) errors.push('Too many columns: use item, unit, price and (optionally) pack size')
    const [item = '', unitText = '', priceText = '', packText = ''] = cells
    if (!item) errors.push('The item name is missing')
    else if (item.length > 200) errors.push('The item name is too long (200 characters at most)')
    const unit = unitText ? normaliseUnit(unitText) : null
    if (cells.length >= 3 && !unit) errors.push(`“${unitText}” is not a unit we know. Use bag, quintal, piece, tonne, m2, m3, metre, litre, kg…`)
    const priceCents = priceText ? parsePriceEtb(priceText) : null
    if (cells.length >= 3 && priceCents === null) errors.push(`“${priceText}” is not a price. Write it like 1250 or 1,250.50`)
    let packSize: number | null = null
    if (packText) {
      const n = Number(packText.replace(/[^\d.]/g, ''))
      if (Number.isFinite(n) && n > 0) packSize = n
      else errors.push(`“${packText}” is not a pack size`)
    }
    out.push({ line: i + 1, raw, item, unit, priceCents, packSize, errors })
  })
  return out
}
