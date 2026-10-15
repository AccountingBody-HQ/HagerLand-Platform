/**
 * The ten business pillars of the property ecosystem and their operating modes (spec Section 26.2–26.3).
 * Modes and editable text live in the `pillars` table; this module holds what code needs to know about each
 * pillar (its hub, the deeper pages it owns, its matching vertical) and safe defaults used when the database
 * cannot be reached. Edge-safe: no server-only imports.
 */
import type { VerticalKey, VerticalStatus } from '@/lib/verticals'

export const PILLAR_KEYS = ['buy', 'rent', 'build', 'maintain', 'manage', 'finance', 'insurance', 'advice', 'supplies', 'jobs'] as const
export type PillarKey = (typeof PILLAR_KEYS)[number]

export type PillarMode = 'direct' | 'aggregate' | 'interest'

/** Customer-facing labels: never the letters D/A/I (spec 26.3). */
export const MODE_LABELS: Record<PillarMode, string> = {
  direct: 'Provided by HagerLand',
  aggregate: 'Trusted partners',
  interest: 'Register your interest',
}

export interface PillarService {
  key: string
  name: string
  direct: boolean
  aggregate: boolean
  interest: boolean
}

export interface Pillar {
  key: PillarKey
  number: number
  name: string
  navLabel: string
  slug: string
  tagline: string
  description: string
  icon: string
  direct: boolean
  aggregate: boolean
  interest: boolean
  status: VerticalStatus
  seoTitle: string | null
  seoDescription: string | null
  services: PillarService[]
}

export function isPillarKey(v: unknown): v is PillarKey {
  return typeof v === 'string' && (PILLAR_KEYS as readonly string[]).includes(v)
}

/** Visible if any mode is on; only Interest → coming soon; nothing → hidden (spec 26.3). */
export function modeStatus(m: { direct: boolean; aggregate: boolean; interest: boolean }): VerticalStatus {
  if (m.direct || m.aggregate) return 'live'
  if (m.interest) return 'coming_soon'
  return 'hidden'
}

/** The labels a customer sees for the modes that are on, in D → A → I order. Interest-only shows as coming soon. */
export function activeModes(m: { direct: boolean; aggregate: boolean; interest: boolean }): PillarMode[] {
  return (['direct', 'aggregate', 'interest'] as const).filter((k) => m[k])
}

export function pillarHref(p: Pick<Pillar, 'slug'>): string {
  return `/${p.slug}`
}

/** Lifecycle journey strip (spec 26.4): find → buy/rent → finance → build → supply → insure → maintain → manage → sell/let. */
export const JOURNEY: { label: string; pillar: PillarKey }[] = [
  { label: 'Find', pillar: 'advice' },
  { label: 'Buy or rent', pillar: 'buy' },
  { label: 'Finance', pillar: 'finance' },
  { label: 'Build', pillar: 'build' },
  { label: 'Supply', pillar: 'supplies' },
  { label: 'Insure', pillar: 'insurance' },
  { label: 'Maintain', pillar: 'maintain' },
  { label: 'Manage', pillar: 'manage' },
  { label: 'Sell or let', pillar: 'rent' },
]

/** The existing vertical a pillar's interest registrations are filed under (interest_registrations.vertical_key). */
export const PILLAR_INTEREST_VERTICAL: Record<PillarKey, VerticalKey> = {
  buy: 'property',
  rent: 'property',
  build: 'contractors',
  maintain: 'repairs-maintenance',
  manage: 'diaspora',
  finance: 'finance',
  insurance: 'insurance',
  advice: 'property',
  supplies: 'building-supplies',
  jobs: 'jobs',
}

/** The pillar an existing vertical's demand belongs to (mirrors SQL vertical_pillar()). */
export const VERTICAL_PILLAR: Record<VerticalKey, PillarKey> = {
  property: 'buy',
  'building-supplies': 'supplies',
  professionals: 'build',
  contractors: 'build',
  'our-developments': 'build',
  'repairs-maintenance': 'maintain',
  diaspora: 'manage',
  finance: 'finance',
  insurance: 'insurance',
  jobs: 'jobs',
}

/**
 * Deeper pages each pillar owns (spec 26.2). Every one links back to its hub. The canonical of each deeper page is
 * its own address: the hub is a short summary page that links to them, so no two pages carry the same content.
 */
export const PILLAR_DEEP_PATHS: Record<PillarKey, string[]> = {
  buy: ['/property/for-sale', '/developments', '/agency/sell', '/agency/buyer-representation', '/agency/property-sourcing', '/agency/developer-sales', '/agency/valuation', '/property/compare', '/property/map', '/agents', '/developers'],
  rent: ['/property/to-rent', '/agency/let', '/agency/landlords', '/agency/tenants'],
  build: ['/contractors', '/build/project', '/build-cost-estimator', '/our-developments'],
  maintain: ['/repairs-maintenance'],
  manage: ['/diaspora/property-care', '/owner'],
  finance: [],
  insurance: [],
  advice: ['/guides', '/advice/market-insight', '/advice/checklists', '/advice/glossary', '/help'],
  supplies: ['/suppliers', '/supplies/quote', '/supplies/materials-list', '/supplies/special-buys', '/supplies/trade'],
  jobs: [],
}

/** The pillar a deep page belongs to (used for "Back to …" links). Hubs themselves return their own key. */
export function pillarForPath(pathname: string): PillarKey | null {
  for (const key of PILLAR_KEYS) {
    if (pathname === `/${key}` || pathname.startsWith(`/${key}/`)) return key
  }
  for (const key of PILLAR_KEYS) {
    if (PILLAR_DEEP_PATHS[key].some((p) => pathname === p || pathname.startsWith(`${p}/`))) return key
  }
  return null
}

const D = (key: PillarKey, number: number, name: string, navLabel: string, tagline: string, icon: string, direct: boolean, aggregate: boolean, interest: boolean, description: string): Pillar => ({
  key,
  number,
  name,
  navLabel,
  slug: key,
  tagline,
  description,
  icon,
  direct,
  aggregate,
  interest,
  status: modeStatus({ direct, aggregate, interest }),
  seoTitle: null,
  seoDescription: null,
  services: [],
})

/** Launch defaults (migration 0027), used only if the registry cannot be read. */
export const DEFAULT_PILLARS: Pillar[] = [
  D('buy', 1, 'Buy & Sell Property', 'Buy', 'Listings, agency, transactions', 'house', true, true, false, 'Homes, land and commercial property for sale, new developments, and HagerLand’s own estate agency.'),
  D('rent', 2, 'Rent & Let Property', 'Rent', 'Landlords, tenants, lettings', 'key-round', true, true, false, 'Places to rent across Ethiopia, letting with HagerLand, tenant applications and tenancies.'),
  D('build', 3, 'Build & Develop Property', 'Build', 'Construction, renovation, development', 'hard-hat', false, true, true, 'Architects, engineers and contractors, building quotes and a build-cost estimator.'),
  D('maintain', 4, 'Repair & Maintain Property', 'Maintain', 'Trades, repairs, upkeep', 'wrench', true, true, false, 'Repairs, servicing and emergency help, coordinated by HagerLand.'),
  D('manage', 5, 'Manage Property', 'Manage', 'Management, tenants, diaspora care', 'users', true, true, false, 'HagerLand Property Care and trusted third-party property managers.'),
  D('finance', 6, 'Property Finance', 'Finance', 'Mortgages, construction and development finance', 'landmark', false, false, true, 'Property finance introduced through approved, licensed partners.'),
  D('insurance', 7, 'Property Insurance', 'Insurance', 'Home, landlord, commercial cover', 'shield-check', false, false, true, 'Property insurance introduced through approved, licensed partners.'),
  D('advice', 8, 'Knowledge & Advice', 'Advice & guides', 'Guides, awareness, market insight', 'book-open', true, false, false, 'Guides, area guides, market insight, checklists and a glossary.'),
  D('supplies', 9, 'Building & Construction Supplies', 'Supplies', 'Materials, tools, equipment', 'boxes', true, true, false, 'HagerLand Supply and a marketplace of suppliers.'),
  D('jobs', 10, 'Jobs, Recruitment & Staffing', 'Jobs', 'Talent, labour, hiring', 'briefcase', true, true, true, 'A job board, HagerLand recruitment and placement, and candidate and employer registers.'),
]

/** Lookup by key with hidden pillars treated as absent. */
export function visiblePillar(list: Pillar[], key: PillarKey): Pillar | null {
  const p = list.find((x) => x.key === key)
  return p && p.status !== 'hidden' ? p : null
}

/** A sub-service is on when its own switch is on (and its pillar is visible). */
export function serviceOn(list: Pillar[], pillar: PillarKey, service: string, mode: PillarMode = 'direct'): boolean {
  const p = visiblePillar(list, pillar)
  const s = p?.services.find((x) => x.key === service)
  return Boolean(s && s[mode])
}
