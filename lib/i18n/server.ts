import 'server-only'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { headers } from 'next/headers'
import { AM_SCOPE_HEADER, JOBS_AM_HEADER, LOCALE_HEADER, localizeHref, type AmScope, type Locale } from './config'
import { jobsTranslator, translator, type Translate } from './translate'
import { AM_REVIEWED } from './messages/am-reviewed'

/** The request's language, set by the middleware for "/am" addresses (only while Amharic is switched on). */
export async function getLocale(): Promise<Locale> {
  return (await headers()).get(LOCALE_HEADER) === 'am' ? 'am' : 'en'
}

/** "jobs" when the page is served by Amharic for Jobs (only reviewed text), else "site". */
export async function getAmScope(): Promise<AmScope> {
  return (await headers()).get(AM_SCOPE_HEADER) === 'jobs' ? 'jobs' : 'site'
}

/** Whether this page has an Amharic version through Amharic for Jobs (shows the language switch). */
export async function jobsAmharicHere(): Promise<boolean> {
  return (await headers()).get(JOBS_AM_HEADER) === '1'
}

let testFixture: Record<string, string> | null | undefined
/**
 * Native-reviewed Amharic. In the local test environment only (HL_TEST_ENV=1), a test fixture of fake "reviewed"
 * entries (e2e/fixtures/am-reviewed-test.json) is added so the mechanism can be tested without real Amharic.
 */
export function reviewedMessages(): Record<string, string> {
  if (process.env.HL_TEST_ENV !== '1') return AM_REVIEWED
  if (testFixture === undefined) {
    const file = join(process.cwd(), 'e2e', 'fixtures', 'am-reviewed-test.json')
    testFixture = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>) : null
  }
  return testFixture ? { ...AM_REVIEWED, ...testFixture } : AM_REVIEWED
}

/** Language, scope, translation and link helpers for server components and server actions. */
export async function getI18n(): Promise<{ locale: Locale; scope: AmScope; t: Translate; href: (h: string) => string }> {
  const [locale, scope] = await Promise.all([getLocale(), getAmScope()])
  return { locale, scope, t: translator(locale, scope, reviewedMessages()), href: (h: string) => localizeHref(h, locale, scope) }
}

/**
 * For the body of Jobs pages, forms and their server actions (Jobs Phase 5). Only pages served by Amharic for Jobs are
 * in Amharic, and then ONLY with native-reviewed text (other text falls back to English); links to other sections stay
 * English. On the site-wide Amharic version these pages stay exactly as before (English text apart from two words that
 * were already translated, English dates and links), so `locale` is "en" there.
 */
export async function getJobsI18n(): Promise<{ locale: Locale; scope: AmScope; t: Translate; href: (h: string) => string }> {
  const [requested, scope] = await Promise.all([getLocale(), getAmScope()])
  const locale: Locale = scope === 'jobs' ? requested : 'en'
  return { locale, scope, t: jobsTranslator(requested, scope, reviewedMessages()), href: (h: string) => localizeHref(h, locale, 'jobs') }
}
