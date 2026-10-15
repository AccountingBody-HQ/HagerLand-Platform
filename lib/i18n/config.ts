// Locales (spec 25.2m). English is the default at "/"; Amharic lives under "/am" and is OFF until AB approves it.

export const LOCALES = ['en', 'am'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALE_HEADER = 'x-hl-locale'
export const AM_PREFIX = '/am'

/** Paths that never get a language prefix (admin, APIs, files). */
const UNPREFIXED = /^\/(roodber8|api|og|_next|icon|robots|sitemap|auth\/callback)(\/|\.|$)/

export function isAmharicPath(pathname: string): boolean {
  return pathname === AM_PREFIX || pathname.startsWith(`${AM_PREFIX}/`)
}

/** "/am/property" → "/property"; other paths unchanged. */
export function stripLocale(pathname: string): string {
  return isAmharicPath(pathname) ? pathname.slice(AM_PREFIX.length) || '/' : pathname
}

/** The same page in the given language: internal links keep the visitor's language. */
export function localizeHref(href: string, locale: Locale): string {
  if (locale === 'en' || !href.startsWith('/') || href.startsWith('//') || isAmharicPath(href) || UNPREFIXED.test(href)) return href
  return href === '/' ? AM_PREFIX : `${AM_PREFIX}${href}`
}

export function isPrefixable(pathname: string): boolean {
  return !UNPREFIXED.test(pathname)
}
