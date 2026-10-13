import { ADDED_WITHIN, COMMERCIAL_TYPES, COMPLETION, FEATURES, FINISHING, FURNISHING, LISTER_TYPES, PROPERTY_TYPES, labelOf, type CompletionStatus, type FinishingStatus, type Furnishing, type PropertyType } from '@/lib/labels'
import { formatETBCompact, formatNumber } from '@/lib/format'

export type RawParams = Record<string, string | string[] | undefined>

export interface PropertyFilters {
  q?: string
  types: PropertyType[]
  priceMin?: number
  priceMax?: number
  beds?: number
  baths?: number
  areaMin?: number
  areaMax?: number
  finishing: FinishingStatus[]
  furnishing: Furnishing[]
  completion: CompletionStatus[]
  features: string[]
  deed?: boolean
  lister?: string
  added?: number
  excludeNegotiable?: boolean
  sort: 'relevance' | 'newest' | 'price_asc' | 'price_desc' | 'area_desc'
  page: number
}

export const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'area_desc', label: 'Largest' },
  { value: 'relevance', label: 'Most relevant' },
] as const

const PAGE_SIZE = 24
export { PAGE_SIZE as PROPERTY_PAGE_SIZE }

function list(v: string | string[] | undefined): string[] {
  if (!v) return []
  return (Array.isArray(v) ? v : [v]).flatMap((x) => x.split(',')).map((x) => x.trim()).filter(Boolean)
}

function num(v: string | string[] | undefined, max = 1e12): number | undefined {
  const s = Array.isArray(v) ? v[0] : v
  if (!s) return undefined
  const n = Number(s.replace(/[,\s]/g, ''))
  return Number.isFinite(n) && n >= 0 && n <= max ? Math.floor(n) : undefined
}

function oneOf<T extends string>(values: readonly T[], v: string[]): T[] {
  return v.filter((x): x is T => (values as readonly string[]).includes(x))
}

export function parsePropertyParams(raw: RawParams): PropertyFilters {
  const typeTokens = list(raw.type)
  const types = Array.from(new Set(typeTokens.flatMap((t) => (t === 'commercial' ? COMMERCIAL_TYPES : [t]))))
  const q = (Array.isArray(raw.q) ? raw.q[0] : raw.q)?.trim().slice(0, 100) || undefined
  const sortRaw = Array.isArray(raw.sort) ? raw.sort[0] : raw.sort
  const sort = (SORTS.map((s) => s.value) as string[]).includes(sortRaw ?? '') ? (sortRaw as PropertyFilters['sort']) : q ? 'relevance' : 'newest'
  return {
    q,
    types: oneOf(PROPERTY_TYPES.map((t) => t.value), types),
    priceMin: num(raw.price_min),
    priceMax: num(raw.price_max),
    beds: num(raw.beds, 20),
    baths: num(raw.baths, 20),
    areaMin: num(raw.area_min),
    areaMax: num(raw.area_max),
    finishing: oneOf(FINISHING.map((f) => f.value), list(raw.finishing)),
    furnishing: oneOf(FURNISHING.map((f) => f.value), list(raw.furnishing)),
    completion: oneOf(COMPLETION.map((c) => c.value), list(raw.completion)),
    features: oneOf(FEATURES.map((f) => f.value), list(raw.features)),
    deed: (Array.isArray(raw.deed) ? raw.deed[0] : raw.deed) === '1' ? true : undefined,
    lister: LISTER_TYPES.some((l) => l.value === raw.lister) ? (raw.lister as string) : undefined,
    added: ADDED_WITHIN.some((a) => a.value === raw.added) ? Number(raw.added) : undefined,
    excludeNegotiable: raw.negotiable === '0' ? true : undefined,
    sort,
    page: Math.min(Math.max(num(raw.page, 500) ?? 1, 1), 500),
  }
}

/** Serialises filters back to a query string (page/sort optional). */
export function toQuery(f: PropertyFilters, overrides: Partial<PropertyFilters> = {}): string {
  const v = { ...f, ...overrides }
  const p = new URLSearchParams()
  if (v.q) p.set('q', v.q)
  if (v.types.length) p.set('type', v.types.join(','))
  if (v.priceMin !== undefined) p.set('price_min', String(v.priceMin))
  if (v.priceMax !== undefined) p.set('price_max', String(v.priceMax))
  if (v.beds !== undefined) p.set('beds', String(v.beds))
  if (v.baths !== undefined) p.set('baths', String(v.baths))
  if (v.areaMin !== undefined) p.set('area_min', String(v.areaMin))
  if (v.areaMax !== undefined) p.set('area_max', String(v.areaMax))
  if (v.finishing.length) p.set('finishing', v.finishing.join(','))
  if (v.furnishing.length) p.set('furnishing', v.furnishing.join(','))
  if (v.completion.length) p.set('completion', v.completion.join(','))
  if (v.features.length) p.set('features', v.features.join(','))
  if (v.deed) p.set('deed', '1')
  if (v.lister) p.set('lister', v.lister)
  if (v.added) p.set('added', String(v.added))
  if (v.excludeNegotiable) p.set('negotiable', '0')
  if (v.sort !== (v.q ? 'relevance' : 'newest')) p.set('sort', v.sort)
  if (v.page > 1) p.set('page', String(v.page))
  const s = p.toString()
  return s ? `?${s}` : ''
}

export function hasFilters(f: PropertyFilters): boolean {
  return toQuery({ ...f, page: 1, sort: f.q ? 'relevance' : 'newest' }) !== ''
}

export function countActiveFilters(f: PropertyFilters): number {
  return (
    f.types.length +
    (f.priceMin !== undefined || f.priceMax !== undefined ? 1 : 0) +
    (f.beds !== undefined ? 1 : 0) +
    (f.baths !== undefined ? 1 : 0) +
    (f.areaMin !== undefined || f.areaMax !== undefined ? 1 : 0) +
    f.finishing.length +
    f.furnishing.length +
    f.completion.length +
    f.features.length +
    (f.deed ? 1 : 0) +
    (f.lister ? 1 : 0) +
    (f.added ? 1 : 0) +
    (f.excludeNegotiable ? 1 : 0)
  )
}

/** Removable chips for each active filter. */
export function activeChips(f: PropertyFilters, basePath: string): { label: string; href: string }[] {
  const base = { ...f, page: 1 }
  const chips: { label: string; href: string }[] = []
  const add = (label: string, o: Partial<PropertyFilters>) => chips.push({ label, href: `${basePath}${toQuery(base, o)}` })
  if (f.q) add(`“${f.q}”`, { q: undefined })
  f.types.forEach((t) => add(PROPERTY_TYPES.find((x) => x.value === t)?.label ?? t, { types: f.types.filter((x) => x !== t) }))
  if (f.priceMin !== undefined || f.priceMax !== undefined) {
    const label = f.priceMin !== undefined && f.priceMax !== undefined ? `${formatETBCompact(f.priceMin)} – ${formatETBCompact(f.priceMax)}` : f.priceMin !== undefined ? `From ${formatETBCompact(f.priceMin)}` : `Up to ${formatETBCompact(f.priceMax ?? 0)}`
    add(label, { priceMin: undefined, priceMax: undefined })
  }
  if (f.beds !== undefined) add(f.beds === 0 ? 'Studio+' : `${f.beds}+ beds`, { beds: undefined })
  if (f.baths !== undefined) add(`${f.baths}+ baths`, { baths: undefined })
  if (f.areaMin !== undefined || f.areaMax !== undefined) add(`${f.areaMin ? formatNumber(f.areaMin) : '0'}–${f.areaMax ? formatNumber(f.areaMax) : '∞'} m²`, { areaMin: undefined, areaMax: undefined })
  f.finishing.forEach((x) => add(labelOf(FINISHING, x), { finishing: f.finishing.filter((y) => y !== x) }))
  f.furnishing.forEach((x) => add(labelOf(FURNISHING, x), { furnishing: f.furnishing.filter((y) => y !== x) }))
  f.completion.forEach((x) => add(labelOf(COMPLETION, x), { completion: f.completion.filter((y) => y !== x) }))
  f.features.forEach((x) => add(FEATURES.find((y) => y.value === x)?.label ?? x, { features: f.features.filter((y) => y !== x) }))
  if (f.deed) add('Title deed available', { deed: undefined })
  if (f.lister) add(LISTER_TYPES.find((l) => l.value === f.lister)?.label ?? f.lister, { lister: undefined })
  if (f.added) add(ADDED_WITHIN.find((a) => a.value === String(f.added))?.label ?? '', { added: undefined })
  if (f.excludeNegotiable) add('Fixed price only', { excludeNegotiable: undefined })
  return chips
}

export const PRICE_STEPS_SALE = [500_000, 1_000_000, 2_000_000, 3_000_000, 5_000_000, 7_500_000, 10_000_000, 15_000_000, 20_000_000, 30_000_000, 50_000_000, 100_000_000]
export const PRICE_STEPS_RENT = [5_000, 10_000, 15_000, 20_000, 30_000, 40_000, 50_000, 75_000, 100_000, 150_000, 250_000, 500_000]
