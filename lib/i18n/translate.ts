import type { Locale } from './config'
import { AM_MESSAGES } from './messages/am'

export type Translate = (english: string) => string

/**
 * Messages are keyed by their English text (like gettext): English needs no catalogue, and any text
 * without an Amharic entry falls back to English instead of breaking.
 */
export function translator(locale: Locale): Translate {
  if (locale !== 'am') return (s) => s
  return (s) => AM_MESSAGES[s] ?? s
}
