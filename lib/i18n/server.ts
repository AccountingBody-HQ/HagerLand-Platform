import 'server-only'
import { headers } from 'next/headers'
import { LOCALE_HEADER, type Locale } from './config'

/** The request's language, set by the middleware for "/am" addresses (only while Amharic is switched on). */
export async function getLocale(): Promise<Locale> {
  return (await headers()).get(LOCALE_HEADER) === 'am' ? 'am' : 'en'
}
