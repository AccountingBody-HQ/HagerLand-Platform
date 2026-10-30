/**
 * The ten business verticals (spec 24.2). Status and editable text live in the `verticals` table;
 * this module holds what code needs to know about each one (paths it owns) and safe defaults used
 * when the database cannot be reached. Edge-safe: no server-only imports.
 */

export type VerticalStatus = 'live' | 'coming_soon' | 'hidden'

export const VERTICAL_KEYS = [
  'property',
  'building-supplies',
  'professionals',
  'contractors',
  'repairs-maintenance',
  'finance',
  'insurance',
  'diaspora',
  'jobs',
  'our-developments',
] as const
export type VerticalKey = (typeof VERTICAL_KEYS)[number]

export interface Vertical {
  key: VerticalKey
  name: string
  navLabel: string
  slug: string
  status: VerticalStatus
  sort: number
  shortDescription: string
  intro: string
  icon: string
  seoTitle: string | null
  seoDescription: string | null
  interestEnabled: boolean
  partnerSignupEnabled: boolean
}

/** URL prefixes each vertical owns. Pages under a prefix follow that vertical's status. */
export const VERTICAL_PATHS: Record<VerticalKey, string[]> = {
  property: ['/property', '/developments', '/agents', '/developers', '/agency'],
  'building-supplies': ['/supplies', '/suppliers'],
  professionals: ['/professionals'],
  contractors: ['/contractors'],
  'repairs-maintenance': ['/repairs-maintenance'],
  finance: ['/finance'],
  insurance: ['/insurance'],
  diaspora: ['/diaspora'],
  jobs: ['/jobs'],
  'our-developments': ['/our-developments'],
}

export function isVerticalKey(v: unknown): v is VerticalKey {
  return typeof v === 'string' && (VERTICAL_KEYS as readonly string[]).includes(v)
}

export function verticalHref(v: Pick<Vertical, 'slug'>): string {
  return `/${v.slug}`
}

/** The vertical whose pages include this path, if any. */
export function verticalForPath(pathname: string): VerticalKey | null {
  for (const key of VERTICAL_KEYS) {
    if (VERTICAL_PATHS[key].some((p) => pathname === p || pathname.startsWith(`${p}/`))) return key
  }
  return null
}

/** Defaults (migration 0011 seed), used only if the registry cannot be read. */
export const DEFAULT_VERTICALS: Vertical[] = [
  ['property', 'Property', 'Property', 'property', 'live', 'house', 'Homes, land and commercial property for sale and to rent.'],
  ['building-supplies', 'Building Supplies', 'Building Supplies', 'supplies', 'live', 'truck', 'Construction materials with one clear quote, delivered to site in Addis Ababa.'],
  ['professionals', 'Find Professionals', 'Professionals & Contractors', 'professionals', 'live', 'ruler', 'Architects, engineers, surveyors and property specialists.'],
  ['contractors', 'Construction & Contractors', 'Contractors', 'contractors', 'live', 'hard-hat', 'Builders, contractors and trades, with quotes on request.'],
  ['repairs-maintenance', 'Repairs & Maintenance', 'Repairs & Maintenance', 'repairs-maintenance', 'live', 'wrench', 'Plumbing, electrical, roofing, cleaning and emergency repairs.'],
  ['finance', 'Finance', 'Finance', 'finance', 'coming_soon', 'landmark', 'Mortgages, construction finance and more, through licensed partners.'],
  ['insurance', 'Insurance', 'Insurance', 'insurance', 'coming_soon', 'shield-check', 'Home, building, landlord and construction insurance, through licensed partners.'],
  ['diaspora', 'Diaspora Services', 'Diaspora Services', 'diaspora', 'live', 'globe', 'Buy, build and look after property in Ethiopia from wherever you live.'],
  ['jobs', 'Jobs & Recruitment', 'Jobs & Recruitment', 'jobs', 'coming_soon', 'briefcase', 'Jobs in construction, engineering and property.'],
  ['our-developments', 'Our Developments', 'Our Developments', 'our-developments', 'coming_soon', 'building-2', 'Homes HagerLand intends to develop.'],
].map(([key, name, navLabel, slug, status, icon, shortDescription], i) => ({
  key: key as VerticalKey,
  name,
  navLabel,
  slug,
  status: status as VerticalStatus,
  sort: (i + 1) * 10,
  shortDescription,
  intro: '',
  icon,
  seoTitle: null,
  seoDescription: null,
  interestEnabled: status === 'coming_soon',
  partnerSignupEnabled: key === 'finance' || key === 'insurance',
}))

/** Lookup by key with hidden verticals treated as absent. */
export function visibleVertical(list: Vertical[], key: VerticalKey): Vertical | null {
  const v = list.find((x) => x.key === key)
  return v && v.status !== 'hidden' ? v : null
}

export function isLive(list: Vertical[], key: VerticalKey): boolean {
  return list.find((x) => x.key === key)?.status === 'live'
}
