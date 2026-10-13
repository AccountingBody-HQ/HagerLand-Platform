export const DEV_CSV_COLUMNS = ['name', 'kind', 'city', 'sub_city', 'area', 'developer_name', 'completion_status', 'floors_label', 'total_units', 'price_from_etb', 'description'] as const

export interface LocationRef {
  id: string
  parent_id: string | null
  name: string
  level: string
}

export interface ImportRow {
  line: number
  name: string
  kind: string
  locationId: string | null
  locationLabel: string
  developerOrgId: string | null
  developerName: string
  completion: string | null
  floors: string | null
  totalUnits: number | null
  priceFrom: number | null
  description: string | null
  errors: string[]
  duplicate: boolean
}

const KINDS = ['development', 'condominium_site', 'building', 'compound', 'mixed_use_project']
const COMPLETION = ['off_plan', 'under_construction', 'ready']
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** Finds the deepest location matching city → sub-city → area names (case-insensitive). */
export function resolveLocation(locations: LocationRef[], city: string, subCity: string, area: string): LocationRef | null {
  const byName = (name: string, parent: string | null) => locations.find((l) => norm(l.name) === norm(name) && (parent === undefined || l.parent_id === parent))
  if (!city) return null
  const cityLoc = locations.find((l) => norm(l.name) === norm(city) && (l.level === 'city' || l.level === 'region'))
  if (!cityLoc) return null
  let current = cityLoc
  for (const part of [subCity, area]) {
    if (!part) break
    const child = byName(part, current.id) ?? locations.find((l) => norm(l.name) === norm(part) && l.parent_id && locations.find((p) => p.id === l.parent_id)?.parent_id === current.id)
    if (!child) return null
    current = child
  }
  return current
}

/** Validates CSV rows and flags duplicates by name + location (spec 18.2 #4). */
export function prepareImport(
  rows: Record<string, string>[],
  locations: LocationRef[],
  developers: { id: string; name: string }[],
  existing: { name: string; location_id: string | null }[],
): ImportRow[] {
  const seen = new Set(existing.map((e) => `${norm(e.name)}|${e.location_id ?? ''}`))
  return rows.map((r, i) => {
    const errors: string[] = []
    const name = (r.name ?? '').trim()
    if (name.length < 2) errors.push('Name is missing')
    const kind = (r.kind || 'development').trim().toLowerCase()
    if (!KINDS.includes(kind)) errors.push(`Kind must be one of ${KINDS.join(', ')}`)
    const loc = resolveLocation(locations, r.city ?? '', r.sub_city ?? '', r.area ?? '')
    if (!loc) errors.push('Location not found (check city, sub_city and area spelling, or add the area in Locations first)')
    const completion = (r.completion_status ?? '').trim().toLowerCase() || null
    if (completion && !COMPLETION.includes(completion)) errors.push('completion_status must be off_plan, under_construction or ready')
    const floors = (r.floors_label ?? '').trim().toUpperCase() || null
    if (floors && !/^(G|B)(\+\d{1,3})?$/.test(floors)) errors.push('floors_label must look like G+12')
    const num = (v: string | undefined) => (v && v.trim() ? Number(v.replace(/[,\s]/g, '')) : null)
    const totalUnits = num(r.total_units)
    const priceFrom = num(r.price_from_etb)
    if (totalUnits !== null && (!Number.isInteger(totalUnits) || totalUnits < 0)) errors.push('total_units must be a whole number')
    if (priceFrom !== null && (!Number.isFinite(priceFrom) || priceFrom < 0)) errors.push('price_from_etb must be a number')
    const devName = (r.developer_name ?? '').trim()
    const dev = devName ? developers.find((d) => norm(d.name) === norm(devName)) ?? null : null
    const key = `${norm(name)}|${loc?.id ?? ''}`
    const duplicate = seen.has(key)
    seen.add(key)
    return {
      line: i + 2,
      name,
      kind,
      locationId: loc?.id ?? null,
      locationLabel: [r.area, r.sub_city, r.city].filter(Boolean).join(', '),
      developerOrgId: dev?.id ?? null,
      developerName: devName,
      completion,
      floors,
      totalUnits,
      priceFrom,
      description: (r.description ?? '').trim() || null,
      errors,
      duplicate,
    }
  })
}
