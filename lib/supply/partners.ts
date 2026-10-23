// Supply partners (admin): the private record HagerLand keeps about each supplier organisation. The values match
// the checks in migration 0034; labels are plain English for the admin screens.

export const SUPPLY_ROLES = [
  { value: 'importer', label: 'Importer' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'wholesaler', label: 'Wholesaler' },
  { value: 'retail_shop', label: 'Retail shop' },
  { value: 'contractor', label: 'Contractor' },
] as const
export type SupplyRole = (typeof SUPPLY_ROLES)[number]['value']

export const RELATIONSHIP_STATUSES = [
  { value: 'discovered', label: 'Discovered', hint: 'We know about them but have not spoken yet.' },
  { value: 'contacted', label: 'Contacted', hint: 'We have spoken or sent a message.' },
  { value: 'interested', label: 'Interested', hint: 'They want to work with HagerLand.' },
  { value: 'terms_agreed', label: 'Terms agreed', hint: 'Prices, delivery and payment terms are agreed.' },
  { value: 'active', label: 'Active', hint: 'We order from them.' },
  { value: 'inactive', label: 'Inactive', hint: 'We used to work together but do not now.' },
  { value: 'declined', label: 'Declined', hint: 'They or we decided not to work together.' },
  { value: 'do_not_contact', label: 'Do not contact', hint: 'They asked us not to contact them. Respect this.' },
  { value: 'needs_reverification', label: 'Needs re-verification', hint: 'Details or evidence are out of date: check again.' },
] as const
export type RelationshipStatus = (typeof RELATIONSHIP_STATUSES)[number]['value']

export const PARTNER_SOURCES = [
  { value: 'direct_call', label: 'Phone call with the business' },
  { value: 'site_visit', label: 'Site visit' },
  { value: 'partner_submitted', label: 'Sent by the business' },
  { value: 'price_list_photo', label: 'Photo of a price list' },
  { value: 'business_website', label: 'The business’s own website or page' },
  { value: 'import_google', label: 'Google import (confirm directly)' },
  { value: 'self_signup', label: 'Signed up on HagerLand' },
  { value: 'referral', label: 'Referral' },
  { value: 'other', label: 'Other' },
] as const
export type PartnerSource = (typeof PARTNER_SOURCES)[number]['value']

export const CONFIDENCE_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const

export const CONTACT_CHANNELS = [
  { value: 'phone', label: 'Phone call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'email', label: 'Email' },
  { value: 'in_person', label: 'In person' },
] as const

export const CONSENT_BASES = [
  { value: 'business_provided', label: 'The business gave us this contact' },
  { value: 'verbal_consent', label: 'The person agreed verbally' },
  { value: 'written_consent', label: 'The person agreed in writing or by message' },
  { value: 'public_business_listing', label: 'Published by the business itself' },
  { value: 'other', label: 'Other (explain in the note)' },
] as const

export function labelFor(list: readonly { value: string; label: string }[], value: string | null | undefined): string {
  return list.find((x) => x.value === value)?.label ?? value ?? ''
}

/** Re-verify 12 months after the latest verification (licence seen, TIN checked or site visit), as YYYY-MM-DD. */
export const REVERIFY_MONTHS = 12

export function defaultReverifyBy(dates: (string | null | undefined)[]): string | null {
  const times = dates.filter((d): d is string => Boolean(d)).map((d) => new Date(d).getTime()).filter((t) => Number.isFinite(t))
  if (!times.length) return null
  const latest = new Date(Math.max(...times))
  const due = new Date(Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth() + REVERIFY_MONTHS, latest.getUTCDate()))
  // 29 February + 12 months has no match: use the last day of February.
  if (due.getUTCDate() !== latest.getUTCDate()) due.setUTCDate(0)
  return due.toISOString().slice(0, 10)
}

/** Words that say what kind of business it is, not which one; ignored when comparing names. */
const COMMON_WORDS = new Set(['plc', 'pvt', 'ltd', 'share', 'company', 'co', 'sc', 'trading', 'trade', 'import', 'export', 'and', 'the', 'building', 'materials', 'material', 'construction', 'supply', 'supplies', 'general', 'enterprise', 'enterprises', 'business'])

/** Lower case, accents and punctuation removed, common business words dropped: "Abebe Trading PLC" → "abebe". */
export function businessNameKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter((w) => w && !COMMON_WORDS.has(w))
    .join(' ')
}

function trigrams(s: string): Set<string> {
  const out = new Set<string>()
  for (const word of s.split(' ').filter(Boolean)) {
    const padded = `  ${word} `
    for (let i = 0; i < padded.length - 2; i++) out.add(padded.slice(i, i + 3))
  }
  return out
}

/** Trigram similarity of two business names (0 to 1), like Postgres pg_trgm similarity() on the cleaned names. */
export function nameSimilarity(a: string, b: string): number {
  const x = trigrams(businessNameKey(a))
  const y = trigrams(businessNameKey(b))
  if (!x.size || !y.size) return 0
  let shared = 0
  for (const t of Array.from(x)) if (y.has(t)) shared++
  return shared / (x.size + y.size - shared)
}

/** Names this close count as a possible duplicate (the threshold the site's own search uses). */
export const NAME_MATCH_THRESHOLD = 0.3

/** What the admin panel sends (form values as text; blanks mean "not recorded"). Checked again on the server. */
export interface SupplyProfileInput {
  roles: string[]
  aka: string[]
  source: string
  source_note: string
  captured_at: string
  captured_by: string
  confidence: string
  licence_seen_at: string
  tin_checked_at: string
  site_visit_at: string
  verified_by: string
  reverify_by: string
  notes: string
}

export interface SupplyContactInput {
  id: string
  name: string
  role: string
  phone: string
  whatsapp: string
  telegram: string
  preferred_channel: string
  email: string
  consent_basis: string
  consent_note: string
  do_not_contact: boolean
  last_contacted_at: string
}
