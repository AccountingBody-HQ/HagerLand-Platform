/** "Start a building project" (spec 26.9): choices and labels shared by the form, account and admin pages. */

export const BUDGET_BANDS = [
  { value: 'under_2m', label: 'Under ETB 2 million' },
  { value: '2m_5m', label: 'ETB 2–5 million' },
  { value: '5m_10m', label: 'ETB 5–10 million' },
  { value: '10m_25m', label: 'ETB 10–25 million' },
  { value: '25m_50m', label: 'ETB 25–50 million' },
  { value: 'over_50m', label: 'Over ETB 50 million' },
  { value: 'not_sure', label: 'Not sure yet' },
] as const

export const TIMELINES = [
  { value: 'now', label: 'As soon as possible' },
  { value: '3_months', label: 'Within 3 months' },
  { value: '6_months', label: 'Within 6 months' },
  { value: '12_months', label: 'Within a year' },
  { value: 'later', label: 'Later, still planning' },
] as const

export const PROJECT_SERVICES = [
  { value: 'design', label: 'Design', text: 'An architect to design the building', slug: 'architects' },
  { value: 'engineering', label: 'Engineering', text: 'A structural engineer for the structure and permits', slug: 'structural-engineers' },
  { value: 'contractor', label: 'Building contractor', text: 'A contractor to build it', slug: 'building-contractors' },
  { value: 'materials', label: 'Materials', text: 'A materials quote from HagerLand Supply', slug: null },
  { value: 'finance', label: 'Finance', text: 'Construction finance through licensed partners', slug: 'construction-finance' },
] as const

export type ProjectService = (typeof PROJECT_SERVICES)[number]['value']
export const PROJECT_SERVICE_VALUES = PROJECT_SERVICES.map((s) => s.value) as [ProjectService, ...ProjectService[]]
export const BUDGET_VALUES = BUDGET_BANDS.map((b) => b.value) as [string, ...string[]]
export const TIMELINE_VALUES = TIMELINES.map((t) => t.value) as [string, ...string[]]

export const PROJECT_STATUS_LABEL: Record<string, string> = { submitted: 'Received', in_progress: 'In progress', on_hold: 'On hold', closed: 'Closed' }

export function floorsLabel(floors: number | null): string | null {
  if (floors === null || floors === undefined) return null
  return floors === 0 ? 'Ground floor only (G)' : `G+${floors}`
}

export const labelOf = (list: readonly { value: string; label: string }[], v: string | null | undefined) => list.find((x) => x.value === v)?.label ?? v ?? ''
