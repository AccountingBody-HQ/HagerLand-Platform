import type { AmScope, Locale } from './config'
import { AM_MESSAGES } from './messages/am'
import { AM_REVIEWED } from './messages/am-reviewed'

export type Translate = (english: string) => string

/**
 * Messages are keyed by their English text (like gettext): English needs no catalogue, and any text
 * without an Amharic entry falls back to English instead of breaking. The site-wide Amharic version uses the full
 * catalogue (as before). Pages served by Amharic for Jobs use only native-reviewed entries (`reviewed`, by default
 * AM_REVIEWED).
 */
export function translator(locale: Locale, scope: AmScope = 'site', reviewed: Record<string, string> = AM_REVIEWED): Translate {
  if (locale !== 'am') return (s) => s
  if (scope === 'jobs') return (s) => reviewed[s] ?? s
  return (s) => AM_MESSAGES[s] ?? s
}

/**
 * Jobs text that the site-wide Amharic version already showed in Amharic before Jobs Phase 5 (Jobs forms used the site
 * catalogue for these two words). Kept so the site-wide version stays exactly as it was on Jobs pages.
 */
const JOBS_SITE_AMHARIC_BEFORE_PHASE_5 = new Set(['Language', 'English'])

/**
 * The translator for Jobs pages, forms and actions (Jobs Phase 5). Served by Amharic for Jobs: only native-reviewed
 * entries. Site-wide Amharic version: as before Jobs Phase 5 (English, apart from the two words above).
 */
export function jobsTranslator(locale: Locale, scope: AmScope, reviewed: Record<string, string> = AM_REVIEWED): Translate {
  if (locale !== 'am') return (s) => s
  if (scope === 'jobs') return (s) => reviewed[s] ?? s
  return (s) => (JOBS_SITE_AMHARIC_BEFORE_PHASE_5.has(s) ? AM_MESSAGES[s] ?? s : s)
}

/** "{name} applied" + { name: 'Abebe' } → "Abebe applied" (placeholders survive translation). */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m))
}

/** A server action's messages in the visitor's language (English unchanged): error, message and field errors. */
export function translateResult<R>(result: R, t: Translate): R {
  if (!result || typeof result !== 'object') return result
  const r = result as Record<string, unknown>
  const out: Record<string, unknown> = { ...r }
  if (typeof r.error === 'string') out.error = t(r.error)
  if (typeof r.message === 'string') out.message = t(r.message)
  if (r.fieldErrors && typeof r.fieldErrors === 'object') out.fieldErrors = Object.fromEntries(Object.entries(r.fieldErrors as Record<string, string>).map(([k, v]) => [k, typeof v === 'string' && v ? t(v) : v]))
  if (r.data && typeof r.data === 'object' && typeof (r.data as Record<string, unknown>).message === 'string') out.data = { ...(r.data as Record<string, unknown>), message: t((r.data as Record<string, string>).message) }
  return out as R
}
