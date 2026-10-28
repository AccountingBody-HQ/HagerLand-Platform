// Jobs Phase 5: call-back requests from people hiring (AB's approved wording W8–W15). Behind the owner's switch
// jobs_callbacks (starts off). HagerLand's recruitment team calls; nothing is ever emailed or texted. Pure: shared by
// the form, the action, the staff queue, the daily job and tests.
import { z } from 'zod'
import { phoneSchema, textSchema } from '@/lib/validation/common'
import { LANGUAGES, PHONE_MESSAGES } from '@/lib/jobs-phone'
import { ABROAD_COUNTRIES, EMPLOYER_ABROAD_TEXT } from '@/lib/service-requests/employer-abroad'

export const CALLBACK_PATH = '/jobs/call-back'

/** AB's approved wording. Reused existing texts: the security, "something went wrong" and highlighted-fields messages. */
export const CALLBACK_TEXT = {
  boxHeading: 'Prefer to talk? Ask us to call you',
  boxText: "Leave your number and HagerLand's recruitment team will call you about the staff you need. There is no charge to ask.",
  name: 'Your name',
  phone: 'Phone',
  need: 'What do you need?',
  needHint: 'For example: 10 masons in Bole from next month.',
  area: 'Area',
  language: 'Language for the call',
  time: 'Best time to call (Addis Ababa time)',
  abroad: 'I am based outside Ethiopia',
  country: EMPLOYER_ABROAD_TEXT.countryQuestion,
  consent: 'HagerLand may call me on this number about my request.',
  submit: 'Ask for a call',
  thanks: "Thank you. HagerLand's recruitment team will call you. If you miss the call, you can ask again later.",
  tooMany: 'You have sent several requests recently. Please try again later.',
  security: PHONE_MESSAGES.security,
  unavailable: PHONE_MESSAGES.unavailable,
  check: PHONE_MESSAGES.check,
} as const

/** W15: what staff say when they call (admin only). */
export const CALLBACK_SCRIPT =
  "Hello, this is HagerLand. Did you ask us to call you about hiring staff? [If no: 'Sorry for the call. We will delete your number.'] We can find and introduce suitable people. Our fee is agreed with you in writing before we start, and candidates never pay anything."

/** Same order and labels as W10 (the existing Jobs language list). */
export const CALLBACK_LANGUAGES = LANGUAGES
export const CALLBACK_TIMES = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'any', label: 'Any time' },
] as const

/** Per connection (coded internet address): 3 an hour and 10 a day. Per phone: one open request, at most 2 a week. */
export const CALLBACK_LIMITS = { hour: 3, day: 10, perPhoneWeek: 2 } as const
/** "No answer" closes the request after 3 tries. */
export const CALLBACK_MAX_TRIES = 3
/** "Wrong number / did not ask": the coded number is blocked for 30 days. */
export const CALLBACK_BLOCK_DAYS = 30
/** Personal details are cleared 12 months after the later of the request and the last handling. */
export const CALLBACK_KEEP_MONTHS = 12

export const CALLBACK_OUTCOMES = [
  { value: 'staffing_request', label: 'Called — turned into a staffing request' },
  { value: 'no_action', label: 'Called — no further action' },
  { value: 'no_answer', label: 'No answer' },
  { value: 'wrong_number', label: 'Wrong number / did not ask' },
  { value: 'spam', label: 'Spam' },
] as const
export type CallbackOutcome = (typeof CALLBACK_OUTCOMES)[number]['value']

const ticked = z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.literal(true))
const choice = <T extends readonly { value: string }[]>(list: T) => z.enum(list.map((x) => x.value) as [T[number]['value'], ...T[number]['value'][]])

export const callbackSchema = z
  .object({
    name: textSchema(120, { min: 2, label: 'Name' }),
    phone: phoneSchema,
    need: textSchema(500, { min: 2 }),
    area: textSchema(200, { min: 2 }),
    language: choice(CALLBACK_LANGUAGES),
    time_of_day: choice(CALLBACK_TIMES),
    based_abroad: z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.boolean()),
    country_code: z.preprocess((v) => (typeof v === 'string' && v.trim() !== '' ? v : undefined), z.string().optional()),
    consent: ticked,
  })
  .superRefine((v, ctx) => {
    if (v.based_abroad && !ABROAD_COUNTRIES.some((c) => c.code === v.country_code)) ctx.addIssue({ code: 'custom', path: ['country_code'], message: '' })
  })
  .transform((v) => ({ ...v, country_code: v.based_abroad ? (v.country_code ?? null) : null }))
export type CallbackInput = z.infer<typeof callbackSchema>

/** The fields to outline; name and phone keep the site's own messages (as the phone forms do). */
export function callbackFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '')
    if (key && !(key in out)) out[key] = key === 'phone' || key === 'name' ? issue.message : ''
  }
  return out
}

/** When a request's personal details are due to be cleared: 12 months after the later of the request and the last handling. */
export function callbackClearDue(createdAt: string, handledAt: string | null): Date {
  const from = new Date(Math.max(new Date(createdAt).getTime(), handledAt ? new Date(handledAt).getTime() : 0))
  const due = new Date(from)
  due.setUTCMonth(due.getUTCMonth() + CALLBACK_KEEP_MONTHS)
  return due
}

/** What an outcome does to the request (the "no answer" count closes it on the third try). */
export function applyOutcome(outcome: CallbackOutcome, tries: number): { status: 'open' | 'closed'; outcome: CallbackOutcome | null; tries: number; clearNow: boolean; block: boolean } {
  if (outcome === 'no_answer') {
    const next = Math.min(tries + 1, 10)
    return next >= CALLBACK_MAX_TRIES ? { status: 'closed', outcome: 'no_answer', tries: next, clearNow: false, block: false } : { status: 'open', outcome: null, tries: next, clearNow: false, block: false }
  }
  return { status: 'closed', outcome, tries, clearNow: outcome === 'wrong_number', block: outcome === 'wrong_number' }
}

export function blockedUntil(now: Date = new Date()): string {
  return new Date(now.getTime() + CALLBACK_BLOCK_DAYS * 86_400_000).toISOString()
}

export function labelForTime(v: string | null): string {
  return CALLBACK_TIMES.find((x) => x.value === v)?.label ?? ''
}

/** The personal details cleared from a call-back request (12 months, or at once for "wrong number / did not ask"). */
export function clearedCallback(deletedAt: string) {
  return { name: null, phone: null, need: null, area_text: null, language: null, time_of_day: null, country_code: null, consent_at: null, ip_hash: null, staff_note: null, personal_data_deleted_at: deletedAt }
}
