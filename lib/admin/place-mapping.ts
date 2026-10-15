/** Pure helpers for turning Google Places (New) results into HagerLand organisations. Unit-tested. */

export interface AddressComponent {
  longText?: string
  shortText?: string
  types?: string[]
}

export interface LocationRef {
  id: string
  name: string
  level: string
  parent_id: string | null
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Common alternative spellings seen in Google addresses for Ethiopian places. */
const ALIASES: Record<string, string> = {
  'addis abeba': 'addis ababa',
  'adis abeba': 'addis ababa',
  'dire dawa city': 'dire dawa',
  'bahir dar city': 'bahir dar',
  bahirdar: 'bahir dar',
  'nifas silk lafto': 'nifas silk lafto',
  'nefas silk lafto': 'nifas silk lafto',
  'kolfe keranio': 'kolfe keraniyo',
  'akaki kality': 'akaki kaliti',
  'addis ketema': 'addis ketema',
  mekele: 'mekelle',
  hawasa: 'hawassa',
  awassa: 'hawassa',
}

function canonical(s: string): string {
  const n = norm(s)
  return ALIASES[n] ?? n
}

/**
 * Picks the most specific HagerLand location named in the address (area → sub-city → city → region).
 * Falls back to the given default when nothing matches.
 */
export function matchLocation(components: AddressComponent[] | undefined, formattedAddress: string, locations: LocationRef[], fallbackId: string | null): string | null {
  const candidates = new Set<string>()
  for (const c of components ?? []) {
    if (c.longText) candidates.add(canonical(c.longText))
    if (c.shortText) candidates.add(canonical(c.shortText))
  }
  for (const part of formattedAddress.split(',')) candidates.add(canonical(part))
  const rank: Record<string, number> = { area: 4, sub_city: 3, city: 2, region: 1 }
  let best: LocationRef | null = null
  for (const loc of locations) {
    if (!candidates.has(canonical(loc.name))) continue
    if (!best || (rank[loc.level] ?? 0) > (rank[best.level] ?? 0)) best = loc
  }
  return best?.id ?? fallbackId
}

/** Google gives "+251 11 123 4567" or "011 123 4567"; we store E.164 (+251…), or null if not Ethiopian/valid. */
export function placePhone(international: string | undefined, national: string | undefined): string | null {
  const raw = (international || national || '').replace(/[^\d+]/g, '')
  if (!raw) return null
  let digits = raw
  if (digits.startsWith('+')) digits = digits.slice(1)
  else if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = `251${digits.slice(1)}`
  if (!/^251[1-9]\d{8}$/.test(digits)) return null
  return `+${digits}`
}

/** Only http(s) websites, without tracking parameters. */
export function placeWebsite(uri: string | undefined): string | null {
  if (!uri) return null
  try {
    const u = new URL(uri)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    for (const k of Array.from(u.searchParams.keys())) if (/^utm_|^gclid$|^fbclid$/.test(k)) u.searchParams.delete(k)
    return u.toString().slice(0, 300)
  } catch {
    return null
  }
}

/** Import log section for an organisation kind (dedupe key together with the place id). */
export function importSection(kind: string): string {
  return `org_${kind}`
}
