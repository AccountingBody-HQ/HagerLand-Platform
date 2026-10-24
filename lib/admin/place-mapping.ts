/** Pure helpers for Google Places (New) results shown in the admin (never stored; see lib/imports/compliance.ts). Unit-tested. */

export interface AddressComponent {
  longText?: string
  shortText?: string
  types?: string[]
}

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
