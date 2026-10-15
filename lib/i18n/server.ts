import 'server-only'
import { headers } from 'next/headers'
import { LOCALE_HEADER, type Locale } from './config'
import { translator, type Translate } from './translate'

/** The request's language, set by the middleware for "/am" addresses (only while Amharic is switched on). */
export function getLocale(): Locale {
  return headers().get(LOCALE_HEADER) === 'am' ? 'am' : 'en'
}

export function getT(): Translate {
  return translator(getLocale())
}
