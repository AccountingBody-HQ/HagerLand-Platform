import 'server-only'
import { getSiteSettings } from '@/lib/data/reference'
import { formatDate } from '@/lib/format'

export type LegalPage = 'terms' | 'privacy' | 'cookies'

/** Date each text was last changed; AB can override per page in admin → Settings (legal_last_updated). */
export const LEGAL_WRITTEN: Record<LegalPage, string> = { terms: '2026-10-26', privacy: '2026-10-26', cookies: '2026-10-14' }

/** Jobs Phase 5 (W19, W20): the "written in English" notes show while the Amharic version or Amharic for Jobs is on. */
export async function amharicVersionOn(): Promise<boolean> {
  const s = await getSiteSettings()
  return s.amharic_enabled === true || s.jobs_amharic === true
}

export async function legalUpdated(page: LegalPage): Promise<string> {
  const s = await getSiteSettings()
  const v = s.legal_last_updated && typeof s.legal_last_updated === 'object' ? (s.legal_last_updated as Record<string, unknown>)[page] : null
  return formatDate(typeof v === 'string' && v ? v : LEGAL_WRITTEN[page])
}
