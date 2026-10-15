// Build-cost estimator (spec 25.2h): pure calculation from HagerLand's admin-entered rates per m².

export const FINISHES = [
  { value: 'basic', label: 'Basic finish' },
  { value: 'standard', label: 'Standard finish' },
  { value: 'premium', label: 'Premium finish' },
] as const
export type Finish = (typeof FINISHES)[number]['value']

/** "G" is the ground floor only; "G+1" has one floor above it, and so on. */
export const FLOOR_OPTIONS = [
  { value: 1, label: 'G (ground floor only)' },
  { value: 2, label: 'G+1' },
  { value: 3, label: 'G+2' },
  { value: 4, label: 'G+3' },
  { value: 5, label: 'G+4' },
] as const

export interface Rate {
  location_id: string | null
  location_name: string | null
  finish: string
  rate_etb_per_m2: number
  updated_at: string
}

/** The rate for a place and finish, falling back to the nationwide rate (no location). */
export function pickRate(rates: Rate[], locationId: string | null, finish: string): Rate | null {
  return rates.find((r) => r.location_id === locationId && r.finish === finish) ?? rates.find((r) => r.location_id === null && r.finish === finish) ?? null
}

/** Total floor area × rate, rounded to the nearest 10,000 birr. Null when the inputs are not usable. */
export function estimateCost(footprintM2: number, floors: number, ratePerM2: number): { areaM2: number; total: number } | null {
  if (!Number.isFinite(footprintM2) || footprintM2 <= 0 || footprintM2 > 100_000 || !Number.isInteger(floors) || floors < 1 || floors > 50 || ratePerM2 <= 0) return null
  const areaM2 = Math.round(footprintM2 * floors)
  return { areaM2, total: Math.round((areaM2 * ratePerM2) / 10_000) * 10_000 }
}
