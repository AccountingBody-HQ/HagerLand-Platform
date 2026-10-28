// Jobs Phase 5: every Jobs text (key = the English text) and where it appears. Used by the native-speaker review sheet
// (scripts/i18n-export-review.mjs), the "shown in English" notice (W2) and the coverage test. The literal t() text is
// collected from the Jobs files by scripts/i18n-jobs-keys.mjs (lib/i18n/jobs-static-keys.json); text built from lists
// is added here. Staffing category names and questions come from the database and are listed by the export script.
import STATIC_KEYS from './jobs-static-keys.json'
import { JOBS_EMAIL_KEYS } from './jobs-email-keys'
import { APPLICATION_STATUSES, AVAILABILITY, EMPLOYMENT_TYPES, JOBS_NOT_LIVE, SALARY_PERIODS, TRADES } from '@/lib/jobs'
import { JOB_CATEGORIES } from '@/lib/content/verticals'
import { CONTACT_METHODS, LANGUAGES, PHONE_MESSAGES, REGISTER_AVAILABILITY, contactLinks } from '@/lib/jobs-phone'
import { REPORT_MESSAGES, REPORT_REASONS } from '@/lib/job-reports'
import { LISTING_STATUS_LABELS } from '@/lib/labels'
import { CLOSED_REASON_LABEL, REQUEST_STATUS_LABEL, URGENCY } from '@/lib/service-requests/labels'
import { requestFormCopy, STAFFING_SLUG } from '@/lib/service-requests/form-copy'
import { EMPLOYER_ABROAD_TEXT } from '@/lib/service-requests/employer-abroad'
import { CALLBACK_TEXT, CALLBACK_TIMES } from '@/lib/callbacks'
import { SHARE_TEXT } from '@/lib/jobs-share'

function listKeys(): [string, string][] {
  const staffing = requestFormCopy(STAFFING_SLUG)
  const c = staffing.customer
  const out: [string, string][] = [
    ...EMPLOYMENT_TYPES.map((x): [string, string] => [x.label, 'lib/jobs.ts (EMPLOYMENT_TYPES)']),
    ...TRADES.map((x): [string, string] => [x.label, 'lib/jobs.ts (TRADES)']),
    ...SALARY_PERIODS.flatMap((x): [string, string][] => [
      [x.label, 'lib/jobs.ts (SALARY_PERIODS)'],
      [x.label.replace('per ', ''), 'lib/jobs.ts (SALARY_PERIODS, job form)'],
    ]),
    ...APPLICATION_STATUSES.map((x): [string, string] => [x.label, 'lib/jobs.ts (APPLICATION_STATUSES)']),
    ...AVAILABILITY.map((x): [string, string] => [x.label, 'lib/jobs.ts (AVAILABILITY)']),
    [JOBS_NOT_LIVE, 'lib/jobs.ts (JOBS_NOT_LIVE)'],
    ...JOB_CATEGORIES.map((x): [string, string] => [x.label, 'lib/content/verticals.ts (JOB_CATEGORIES)']),
    ...CONTACT_METHODS.map((x): [string, string] => [x.label, 'lib/jobs-phone.ts (CONTACT_METHODS)']),
    ...LANGUAGES.map((x): [string, string] => [x.label, 'lib/jobs-phone.ts (LANGUAGES)']),
    ...REGISTER_AVAILABILITY.map((x): [string, string] => [x.label, 'lib/jobs-phone.ts (REGISTER_AVAILABILITY)']),
    ...Object.values(PHONE_MESSAGES).map((x): [string, string] => [x, 'lib/jobs-phone.ts (PHONE_MESSAGES)']),
    ...contactLinks('+251900000000', null).map((x): [string, string] => [x.label, 'lib/jobs-phone.ts (contact buttons)']),
    ...REPORT_REASONS.map((x): [string, string] => [x.label, 'lib/job-reports.ts (REPORT_REASONS)']),
    ...Object.values(REPORT_MESSAGES).map((x): [string, string] => [x, 'lib/job-reports.ts (REPORT_MESSAGES)']),
    ...Object.values(LISTING_STATUS_LABELS).map((x): [string, string] => [x.label, 'lib/labels.ts (LISTING_STATUS_LABELS)']),
    ...URGENCY.flatMap((x): [string, string][] => [
      [x.label, 'lib/service-requests/labels.ts (URGENCY)'],
      [x.description, 'lib/service-requests/labels.ts (URGENCY)'],
    ]),
    ...Object.values(CLOSED_REASON_LABEL).map((x): [string, string] => [x, 'lib/service-requests/labels.ts (CLOSED_REASON_LABEL)']),
    ...Object.values(REQUEST_STATUS_LABEL).map((x): [string, string] => [x, 'lib/service-requests/labels.ts (REQUEST_STATUS_LABEL)']),
    ...[
      staffing.heading(''),
      staffing.tabTitle(''),
      staffing.metaDescription(''),
      staffing.titleHint(''),
      staffing.detailsLabel,
      staffing.detailsHint,
      staffing.locationLabel,
      staffing.locationHint,
      staffing.footer,
      ...(staffing.pay ? [staffing.pay.label, staffing.pay.hint] : []),
      ...staffing.steps.flatMap((s) => [s.title, s.text]),
      ...(staffing.nextStep ? [staffing.nextStep] : []),
      ...(c ? [c.sentSteps.second, c.sentSteps.thirdSignedIn, c.sentSteps.thirdGuest, c.section.heading, c.section.emptyOpen, c.section.emptyClosed, c.section.text, ...Object.values(c.statusLabels).filter((v): v is string => Boolean(v))] : []),
    ].map((x): [string, string] => [x, 'lib/service-requests/form-copy.ts (staffing)']),
    ...Object.values(EMPLOYER_ABROAD_TEXT).map((x): [string, string] => [x, 'lib/service-requests/employer-abroad.ts']),
    ...Object.values(CALLBACK_TEXT).map((x): [string, string] => [x, 'lib/callbacks.ts (call-back box and form)']),
    ...CALLBACK_TIMES.map((x): [string, string] => [x.label, 'lib/callbacks.ts (best time to call)']),
    ...Object.values(SHARE_TEXT).map((x): [string, string] => [x, 'lib/jobs-share.ts (share message)']),
    ...JOBS_EMAIL_KEYS.flatMap((e) => e.keys.map((k): [string, string] => [k, `email (sent in English): ${e.email}`])),
  ]
  return out
}

/** Every Jobs key with the places it appears. */
export function jobsKeys(): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const [k, where] of Object.entries(STATIC_KEYS as Record<string, string[]>)) map.set(k, [...where])
  for (const [k, where] of listKeys()) {
    if (!k) continue
    const list = map.get(k) ?? []
    if (!list.includes(where)) list.push(where)
    map.set(k, list)
  }
  return map
}

let cached: string[] | null = null
function allKeys(): string[] {
  cached ??= Array.from(jobsKeys().keys())
  return cached
}

/** The Jobs keys (and any extra page text, such as menu labels) without a native-reviewed entry. */
export function missingReviewed(reviewed: Record<string, string>, extra: string[] = []): string[] {
  return Array.from(new Set([...allKeys(), ...extra])).filter((k) => !reviewed[k])
}

/** Text fields of the menus and footer that are translated (label, title, name, …), for the W2 check. */
export function collectLabels(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => collectLabels(v, out))
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === 'string' && ['label', 'title', 'name', 'description', 'tagline', 'action', 'text'].includes(k) && v) out.push(v)
      else if (typeof v === 'object') collectLabels(v, out)
    }
  return out
}
