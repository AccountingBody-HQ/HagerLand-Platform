// Jobs Phase 2: who may see candidate profiles (decision 2), and when personal details are deleted (12 months, Addis
// Ababa dates). Pure: the database view and the daily job follow the same rules; these functions are what the tests
// and the admin pages use to explain them.

/** Decision 2: a verified business, or one with a job HagerLand approved at some time and has not removed. */
export function canSeeCandidates(org: { status: string; verification_level: string }, jobs: { published_at: string | null; status: string }[]): boolean {
  if (org.status !== 'published') return false
  return org.verification_level === 'verified' || jobs.some((j) => j.published_at !== null && j.status !== 'removed')
}

/** The Addis Ababa calendar date (YYYY-MM-DD) of a moment. */
export function addisDay(moment: Date | string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Addis_Ababa', year: 'numeric', month: '2-digit', day: '2-digit' }).format(typeof moment === 'string' ? new Date(moment) : moment)
}

/** The same date 12 months earlier; a day that does not exist (29 Feb) becomes the last day of that month. */
export function twelveMonthsBefore(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  const last = new Date(Date.UTC(y - 1, m, 0)).getUTCDate()
  return `${y - 1}-${String(m).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`
}

/**
 * The deletion rule (Q7): a record is deleted on the first Addis Ababa day on or after the same date 12 months later.
 * It is due when its Addis date is on or before `twelveMonthsBefore(today)`. Returns the moment (UTC ISO) before
 * which records are due: the start of the next Addis day (Addis is UTC+3 all year, no daylight saving).
 */
export function deletionCutoff(now: Date): string {
  const due = twelveMonthsBefore(addisDay(now))
  const next = new Date(`${due}T00:00:00+03:00`)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.toISOString()
}

export function isDueForDeletion(createdAt: string, now: Date): boolean {
  return new Date(createdAt).getTime() < new Date(deletionCutoff(now)).getTime()
}

/** What an application looks like after its personal details are deleted (row, reference, job, status, channel, trade and dates stay). */
export const REMOVED_NAME = 'Removed'
export function clearedApplication(deletedAt: string) {
  return { name: REMOVED_NAME, email: null, phone: null, cover_note: null, employer_notes: null, area_text: null, preferred_contact: null, language: null, cv_path: null, personal_data_deleted_at: deletedAt }
}
export function clearedRegisterEntry(deletedAt: string) {
  return { name: null, phone: null, area_text: null, admin_notes: null, preferred_contact: null, language: null, personal_data_deleted_at: deletedAt }
}

/** Queued emails can name applicants: after 12 months only an empty shell is kept, and the outbox never retries it. */
export const CLEARED_EMAIL = { to_addresses: ['removed@removed.invalid'], subject: '(removed after 12 months)', html: '', text_body: '', reply_to: null, headers: {}, status: 'gave_up' as const, last_error: 'Personal details deleted after 12 months' }

/**
 * Scam and fairness warnings for HagerLand's job review (warnings only: a person decides). Words in English and
 * common Amharic forms; matching is case-insensitive on whole words where it matters.
 */
const WARNINGS: { pattern: RegExp; text: string }[] = [
  { pattern: /\b(registration|application|processing|training|uniform|medical)\s+fee\b|\bpay\s+(a\s+)?(fee|deposit)\b|\bdeposit\b|ክፍያ|ተቀማጭ/i, text: 'Asks candidates for money (fee or deposit). Candidates must never be charged.' },
  { pattern: /\bpassports?\b|ፓስፖርት/i, text: 'Mentions passports. Employers must not keep candidates’ passports or ask for them to apply.' },
  { pattern: /\b(abroad|overseas|dubai|saudi|qatar|kuwait|lebanon|middle east|gulf)\b|ውጭ\s*አገር/i, text: 'May be work abroad. International placements are not offered until a lawyer confirms the rules.' },
  { pattern: /\b(male|female|men|women|man|woman)\s+only\b|\bonly\s+(male|female|men|women)\b|ወንድ\s*ብቻ|ሴት\s*ብቻ/i, text: 'Asks for one sex only. Check this is a lawful job requirement.' },
  { pattern: /\b(age|aged)\s*(between|under|below|over|above|\d)|\bunder\s+\d{2}\b|\bbelow\s+\d{2}\b|\byears?\s+old\b|እድሜ/i, text: 'Sets an age limit. Check it is lawful (no one under 18; other limits need a reason).' },
  { pattern: /\b(single|unmarried|married)\b|\b(religion|christian|muslim|orthodox|protestant)\b|\b(ethnic|ethnicity|tribe)\b|ብሔር|ሃይማኖት/i, text: 'Mentions marital status, religion or ethnic group. These are not lawful requirements for most jobs.' },
  { pattern: /\b(send|attach)\s+(a\s+)?(photo|picture)\b|\bphoto\s+required\b/i, text: 'Asks for a photo. Check this is needed for the job.' },
]

export function advertWarnings(...texts: (string | null | undefined)[]): string[] {
  const all = texts.filter(Boolean).join('\n')
  return WARNINGS.filter((w) => w.pattern.test(all)).map((w) => w.text)
}
