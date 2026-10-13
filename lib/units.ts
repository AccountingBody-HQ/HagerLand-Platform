export const UNITS: { value: string; label: string; plural: string }[] = [
  { value: 'piece', label: 'piece', plural: 'pieces' },
  { value: 'box', label: 'box', plural: 'boxes' },
  { value: 'metre', label: 'metre', plural: 'metres' },
  { value: 'roll', label: 'roll', plural: 'rolls' },
  { value: 'sheet', label: 'sheet', plural: 'sheets' },
  { value: 'bag', label: 'bag', plural: 'bags' },
  { value: 'quintal', label: 'quintal (100 kg)', plural: 'quintals' },
  { value: 'tonne', label: 'tonne', plural: 'tonnes' },
  { value: 'm2', label: 'm²', plural: 'm²' },
  { value: 'm3', label: 'm³', plural: 'm³' },
  { value: 'litre', label: 'litre', plural: 'litres' },
  { value: 'kg', label: 'kg', plural: 'kg' },
  { value: 'set', label: 'set', plural: 'sets' },
  { value: 'pair', label: 'pair', plural: 'pairs' },
]

export function unitLabel(unit: string | null | undefined, qty = 1): string {
  const u = UNITS.find((x) => x.value === unit)
  if (!u) return unit ?? ''
  return qty === 1 ? u.label.replace(' (100 kg)', '') : u.plural
}

/** Categories whose prices move often (spec 1.5): show "confirm on quote". */
export const VOLATILE_CATEGORY_SLUGS = ['cement-concrete', 'steel-rebar', 'sand-aggregates', 'blocks-bricks', 'corrugated-sheets']

export const STOCK_LABEL: Record<string, { label: string; tone: 'green' | 'warning' | 'danger' | 'neutral' | 'info' }> = {
  in_stock: { label: 'In stock', tone: 'green' },
  low_stock: { label: 'Low stock', tone: 'warning' },
  out_of_stock: { label: 'Out of stock', tone: 'danger' },
  made_to_order: { label: 'Made to order', tone: 'info' },
  available_on_request: { label: 'Available on request', tone: 'neutral' },
}
