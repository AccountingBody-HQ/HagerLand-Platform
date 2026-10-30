import 'server-only'
import { getSiteSettings } from '@/lib/data/reference'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { log } from '@/lib/log'
import { todayInAddis } from '@/lib/supply/shortlist'
import { LEGAL_SWITCH_KEY, latestLegalDate, legalPagesChanged, withLegalSwitchDate, type LegalPage } from '@/lib/content/legal-dates'

export type { LegalPage } from '@/lib/content/legal-dates'

/** Date each text was last changed in the code; AB can also set a date per page in admin → Settings (legal_last_updated). */
export const LEGAL_WRITTEN: Record<LegalPage, string> = { terms: '2026-10-29', privacy: '2026-10-30', cookies: '2026-10-14' }

/** Jobs Phase 5 (W19, W20): the "written in English" notes show while the Amharic version or Amharic for Jobs is on. */
export async function amharicVersionOn(): Promise<boolean> {
  const s = await getSiteSettings()
  return s.amharic_enabled === true || s.jobs_amharic === true
}

/** The server-only dates a switch last changed each page's text (QC-1a). Unreadable: none (the other dates still apply). */
async function switchChangedDates(): Promise<Record<string, unknown>> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) return {}
  const { data, error } = await getAdminSupabase().from('site_settings').select('value').eq('key', LEGAL_SWITCH_KEY).maybeSingle()
  if (error) log.error('legal', 'switch dates could not be read', error)
  return data?.value && typeof data.value === 'object' ? (data.value as Record<string, unknown>) : {}
}

/** "Last updated": the latest of the written date, AB's override (if set) and the last switch change for the page. */
export async function legalUpdated(page: LegalPage): Promise<string> {
  const [s, switched] = await Promise.all([getSiteSettings(), switchChangedDates()])
  const override = s.legal_last_updated && typeof s.legal_last_updated === 'object' ? (s.legal_last_updated as Record<string, unknown>)[page] : null
  return formatDate(latestLegalDate(LEGAL_WRITTEN[page], override, switched[page]))
}

/**
 * Called by a switch action BEFORE it saves the switch: when the change shows or hides text on /privacy or /terms, that
 * page's date becomes today (Addis Ababa). Returns what was set, for the action's audit entry; throws when the date
 * cannot be saved, so the switch is not changed without its date.
 */
export async function markLegalSwitchChange(settingKey: string, before: unknown, after: unknown): Promise<{ pages: readonly LegalPage[]; date: string } | null> {
  const pages = legalPagesChanged(settingKey, before, after)
  if (!pages.length) return null
  const db = getAdminSupabase()
  const { data, error } = await db.from('site_settings').select('value').eq('key', LEGAL_SWITCH_KEY).maybeSingle()
  if (error) throw new Error(error.message)
  const date = todayInAddis()
  const { error: writeError } = await db.from('site_settings').upsert({ key: LEGAL_SWITCH_KEY, value: withLegalSwitchDate(data?.value, pages, date), updated_at: new Date().toISOString() })
  if (writeError) throw new Error(writeError.message)
  return { pages, date }
}
