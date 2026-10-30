// Imports compliance (Google Places data). Pure rules, shared by the admin screens, the daily clean-up and tests.
// Google's terms (read 24 Oct 2026, see docs/RUNBOOK.md "Imports and Google data"): a place ID may be stored
// indefinitely; latitude/longitude for up to 30 consecutive calendar days; other Places content may not be stored and
// content may not be created from it. The Imports tool now stores only the place ID. Details stored by the tool before
// this change are kept for 30 days from the import, then cleared unless confirmed with the business.
import { daysBetween } from '@/lib/supply/offers'
import { addisDate } from '@/lib/supply/shortlist'

export const GOOGLE_DAYS = 30
/** Red "confirm soon" warning from this many days left. */
export const WARN_DAYS = 7
export const UNCONFIRMED_NAME = 'Unconfirmed lead — refetch from Google'

export const TRACKED_FIELDS = ['name', 'phone', 'address_line', 'website', 'description', 'lat_lng'] as const
export type TrackedField = (typeof TRACKED_FIELDS)[number]
/** Shown on the public site: all must be confirmed (or replaced) before an imported business is published. */
export const DISPLAYED_FIELDS: readonly TrackedField[] = ['name', 'phone', 'address_line', 'website', 'description']

export const FIELD_LABEL: Record<TrackedField, string> = {
  name: 'Name',
  phone: 'Phone',
  address_line: 'Address',
  website: 'Website',
  description: 'Description (AI-written from Google data)',
  lat_lng: 'Map position (latitude and longitude)',
}

export type FieldSource = 'google_places' | 'confirmed_with_business' | 'edited_by_hagerland'
export const SOURCE_LABEL: Record<FieldSource, string> = {
  google_places: 'From Google',
  confirmed_with_business: 'Confirmed with the business',
  edited_by_hagerland: 'Edited by HagerLand',
}

export const CONFIRM_METHODS = [
  { value: 'phone', label: 'Phone call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'visit', label: 'Visit' },
  { value: 'email', label: 'Email' },
] as const
export type ConfirmMethod = (typeof CONFIRM_METHODS)[number]['value']

export interface FieldSourceRow {
  field: TrackedField
  source: FieldSource
  fetchedAt: string | null
  confirmedAt: string | null
  clearedAt: string | null
}

export interface ImportedOrg {
  id: string
  status: string
  /** A business that claimed its page edits its own details: never cleared automatically. */
  claimed: boolean
  sources: FieldSourceRow[]
}

export type ComplianceState = 'confirmed' | 'within' | 'expired' | 'lead'
export const STATE_LABEL: Record<ComplianceState, string> = {
  confirmed: 'Confirmed with the business',
  within: 'Google data, within 30 days',
  expired: 'Google data past 30 days',
  lead: 'Lead: place ID only',
}

export interface Compliance {
  state: ComplianceState
  /** Fields still holding Google data (not cleared). */
  googleFields: TrackedField[]
  /** Of those, the ones past 30 days. */
  expiredFields: TrackedField[]
  /** Days left before the oldest Google field must be cleared (0 = last day; negative = overdue); null when none. */
  daysLeft: number | null
  isPublic: boolean
  /** What the clean-up does: clear (private) or ask the owner (public or claimed); nothing when not expired. */
  plan: { action: 'clear' | 'decision' | 'none'; fields: TrackedField[]; rename: boolean }
  /** Why it cannot be published yet; null when it can. */
  publishBlock: string | null
}

/** Whole days since Google data was fetched, by the calendar date in Addis Ababa. */
export function googleAgeDays(fetchedAt: string, today: string): number {
  return daysBetween(addisDate(fetchedAt), today)
}

/**
 * Days left of the 30 consecutive calendar days, counting the fetch day as day 1: 0 on the 30th day (29 days after
 * fetching, the last allowed day), negative from the next day.
 */
export function daysLeft(fetchedAt: string, today: string): number {
  return GOOGLE_DAYS - 1 - googleAgeDays(fetchedAt, today)
}

export const isExpired = (fetchedAt: string, today: string) => daysLeft(fetchedAt, today) < 0

export function compliance(org: ImportedOrg, today: string): Compliance {
  const google = org.sources.filter((s) => s.source === 'google_places' && !s.clearedAt && s.fetchedAt)
  const googleFields = google.map((s) => s.field)
  // Always in FIELD_LABEL order (QC-1a): the database returns sources in no fixed order.
  const expiredFields = google.filter((s) => isExpired(s.fetchedAt as string, today)).map((s) => s.field).sort((a, b) => TRACKED_FIELDS.indexOf(a) - TRACKED_FIELDS.indexOf(b))
  const left = google.length ? Math.min(...google.map((s) => daysLeft(s.fetchedAt as string, today))) : null
  const name = org.sources.find((s) => s.field === 'name')
  const nameConfirmed = Boolean(name && name.source !== 'google_places')
  const state: ComplianceState = expiredFields.length ? 'expired' : googleFields.length ? 'within' : nameConfirmed ? 'confirmed' : 'lead'
  const isPublic = org.status === 'published'
  const plan: Compliance['plan'] = !expiredFields.length
    ? { action: 'none', fields: [], rename: false }
    : { action: isPublic || org.claimed ? 'decision' : 'clear', fields: expiredFields, rename: expiredFields.includes('name') }
  const shownGoogle = googleFields.filter((f) => DISPLAYED_FIELDS.includes(f))
  const publishBlock = !nameConfirmed
    ? 'Confirm the business’s name with the business first (“Confirm with the business”).'
    : shownGoogle.length
      ? `Still from Google: ${shownGoogle.map((f) => FIELD_LABEL[f].replace(/ \(.*\)$/, '').toLowerCase()).join(', ')}. Confirm or replace them with what the business says first.`
      : null
  return { state, googleFields, expiredFields, daysLeft: left, isPublic, plan, publishBlock }
}

/** "Confirm within 12 days", "Last day to confirm", "Expired — will be cleared". */
export function deadlineText(left: number | null): string {
  if (left === null) return 'No Google data stored'
  if (left < 0) return 'Expired — will be cleared'
  if (left === 0) return 'Last day to confirm'
  return `Confirm within ${left} ${left === 1 ? 'day' : 'days'}`
}
