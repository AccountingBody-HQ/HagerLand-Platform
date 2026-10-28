// Locales (spec 25.2m). English is the default at "/"; Amharic lives under "/am" and is OFF until AB approves it.

export const LOCALES = ['en', 'am'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALE_HEADER = 'x-hl-locale'
export const AM_PREFIX = '/am'
/** "jobs" when an Amharic page is served by the Amharic-for-Jobs switch (only reviewed text), else "site". */
export const AM_SCOPE_HEADER = 'x-hl-am-scope'
/** "1" when this page has an Amharic version through Amharic for Jobs (the language switch is shown). */
export const JOBS_AM_HEADER = 'x-hl-jobs-am'
export type AmScope = 'site' | 'jobs'

/** Paths that never get a language prefix (admin, APIs, files). */
const UNPREFIXED = /^\/(roodber8|api|og|_next|icon|robots|sitemap|auth\/callback)(\/|\.|$)/

export function isAmharicPath(pathname: string): boolean {
  return pathname === AM_PREFIX || pathname.startsWith(`${AM_PREFIX}/`)
}

/** "/am/property" → "/property"; other paths unchanged. */
export function stripLocale(pathname: string): string {
  return isAmharicPath(pathname) ? pathname.slice(AM_PREFIX.length) || '/' : pathname
}

/**
 * Pages that Amharic for Jobs (Jobs Phase 5) serves in Amharic: the Jobs pages, the staffing request journey and the
 * Jobs account pages. Request pages are shared by every service: they show Amharic only for staffing requests.
 */
const JOBS_AM_PREFIXES = ['/jobs', '/request-service/staffing', '/account/jobs', '/account/candidate', '/account/applications', '/account/service-requests/', '/requests/']

/** Is this page (without "/am") part of Amharic for Jobs? The thank-you page counts only for staffing (?for=staffing). */
export function isJobsAmPath(href: string): boolean {
  const [path, query = ''] = href.split('?')
  if (path === '/request-service/sent') return new URLSearchParams(query).get('for') === 'staffing'
  return JOBS_AM_PREFIXES.some((p) => (p.endsWith('/') ? path.startsWith(p) : path === p || path.startsWith(`${p}/`)))
}

/**
 * The same page in the given language: internal links keep the visitor's language. On pages served by Amharic for
 * Jobs, links to other sections stay English (those pages are not reviewed yet).
 */
export function localizeHref(href: string, locale: Locale, scope: AmScope = 'site'): string {
  if (locale === 'en' || !href.startsWith('/') || href.startsWith('//') || isAmharicPath(href) || UNPREFIXED.test(href)) return href
  if (scope === 'jobs' && !isJobsAmPath(href)) return href
  return href === '/' ? AM_PREFIX : `${AM_PREFIX}${href}`
}

export function isPrefixable(pathname: string): boolean {
  return !UNPREFIXED.test(pathname)
}
