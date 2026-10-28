// Jobs Phase 5: dates in the visitor's language. English pages are exactly as before (lib/format.ts). Amharic pages
// show the Ethiopian calendar date first and the Gregorian date in brackets, in Addis Ababa time. The Ethiopian date
// comes from the runtime's built-in calendar data (Intl, "am-ET-u-ca-ethiopic"); where a runtime lacks it, only the
// Gregorian date is shown. Stored dates never change.
import { formatDate, relativeTime } from '@/lib/format'
import { fill, type Translate } from './translate'
import type { Locale } from './config'

let ethiopic: Intl.DateTimeFormat | null | undefined

/** The Ethiopian-calendar formatter, or null when the runtime does not support it. */
export function ethiopicFormatter(): Intl.DateTimeFormat | null {
  if (ethiopic !== undefined) return ethiopic
  try {
    const f = new Intl.DateTimeFormat('am-ET-u-ca-ethiopic', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Addis_Ababa' })
    ethiopic = f.resolvedOptions().calendar === 'ethiopic' ? f : null
  } catch {
    ethiopic = null
  }
  return ethiopic
}

/** "26 Oct 2026" in English; on Amharic pages "<Ethiopian date> (26 Oct 2026)". */
export function formatDateFor(value: string | Date | null | undefined, locale: Locale): string {
  const gregorian = formatDate(value)
  if (locale !== 'am' || !gregorian || !value) return gregorian
  const f = ethiopicFormatter()
  if (!f) return gregorian
  return `${f.format(typeof value === 'string' ? new Date(value) : value)} (${gregorian})`
}

/** "today", "3 days ago", "on 26 Oct 2026" through t() (English output exactly as relativeTime). */
export function relativeTimeFor(value: string | Date | null | undefined, locale: Locale, t: Translate, now: Date = new Date()): string {
  if (locale !== 'am') return relativeTime(value, now)
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (days <= 0) return t('today')
  if (days === 1) return t('yesterday')
  if (days < 14) return fill(t('{n} days ago'), { n: days })
  if (days < 60) return fill(t('{n} weeks ago'), { n: Math.floor(days / 7) })
  return fill(t('on {date}'), { date: formatDateFor(d, locale) })
}
