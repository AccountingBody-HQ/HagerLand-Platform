// QC-1a: which switches show or hide text on /privacy or /terms, and the date each legal page shows. Pure (unit-tested).
// The date shown is the latest of: the date the text was written (lib/content/legal.ts), AB's own override in admin →
// Settings (legal_last_updated, normally empty), and the last day a switch changed that page's text
// (legal_switch_changed, set by the switch actions, never public).

export type LegalPage = 'terms' | 'privacy' | 'cookies'
export const LEGAL_SWITCH_KEY = 'legal_switch_changed'

/** Every setting whose value shows or hides text on a legal page (QC-1a Q3), and the page(s) it changes. */
export const LEGAL_PAGES_FOR_SETTING: Readonly<Record<string, readonly LegalPage[]>> = {
  supply_partner_registration: ['privacy'],
  supply_catalogue_ordering: ['terms', 'privacy'],
  jobs_private_client_posts: ['terms'],
  jobs_recruitment_desk: ['terms'],
  jobs_amharic: ['terms', 'privacy'],
  amharic_enabled: ['terms', 'privacy'],
}

const DAY = /^\d{4}-\d{2}-\d{2}$/
const day = (v: unknown): string | null => (typeof v === 'string' && DAY.test(v) ? v : null)

/** The latest of the dates given (YYYY-MM-DD); anything that is not a date is ignored. */
export function latestLegalDate(written: string, override: unknown, switchChanged: unknown): string {
  return [written, day(override), day(switchChanged)].filter((d): d is string => Boolean(d)).reduce((a, b) => (b > a ? b : a))
}

/** The pages a changed setting moves (none when the value did not really change, or the setting shows no text). */
export function legalPagesChanged(settingKey: string, before: unknown, after: unknown): readonly LegalPage[] {
  if (JSON.stringify(before ?? null) === JSON.stringify(after ?? null)) return []
  return LEGAL_PAGES_FOR_SETTING[settingKey] ?? []
}

/** The stored dates with today's date set on the pages a switch changed. */
export function withLegalSwitchDate(current: unknown, pages: readonly LegalPage[], today: string): Record<string, string> {
  const base = current && typeof current === 'object' && !Array.isArray(current) ? (current as Record<string, unknown>) : {}
  const out: Record<string, string> = Object.fromEntries(Object.entries(base).filter((e): e is [string, string] => Boolean(day(e[1]))))
  for (const p of pages) out[p] = today
  return out
}
