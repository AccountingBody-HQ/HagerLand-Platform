// Jobs Phase 2: applying by phone and the worker register (no account, no email). Pure: shared by forms, actions and
// tests. Wording is AB's approved text (docs/HAGERLAND_JOBS_BLUEPRINT.md, Phase 2); messages are keyed by that text.
import { z } from 'zod'
import { phoneSchema, textSchema } from '@/lib/validation/common'
import { TRADE_VALUES } from '@/lib/jobs'

export const CONTACT_METHODS = [
  { value: 'call', label: 'Phone call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'sms', label: 'SMS' },
] as const
export type ContactMethod = (typeof CONTACT_METHODS)[number]['value']

export const LANGUAGES = [
  { value: 'am', label: 'Amharic' },
  { value: 'om', label: 'Afaan Oromo' },
  { value: 'ti', label: 'Tigrinya' },
  { value: 'en', label: 'English' },
] as const
export type JobLanguage = (typeof LANGUAGES)[number]['value']

export const REGISTER_AVAILABILITY = [
  { value: 'now', label: 'Now' },
  { value: 'within_month', label: 'Within a month' },
] as const

/** Approved messages (W-A14 to W-A16) and the existing site messages the forms reuse. */
export const PHONE_MESSAGES = {
  duplicate: "We couldn't send this application. If you've already applied for this job with this phone number, you don't need to apply again.",
  closed: 'This job is no longer open.',
  tooMany: 'You have sent several applications recently. Please try again later.',
  check: 'Please check the highlighted fields.',
  security: 'Please complete the security check and try again.',
  unavailable: 'Something went wrong. Please refresh the page.',
} as const

const ticked = z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.literal(true))
const choice = <T extends readonly { value: string }[]>(list: T) => z.enum(list.map((x) => x.value) as [T[number]['value'], ...T[number]['value'][]])

export const phoneApplicationSchema = z.object({
  job_id: z.uuid(),
  name: textSchema(120, { min: 2, label: 'Name' }),
  phone: phoneSchema,
  trade: z.enum(TRADE_VALUES),
  area: textSchema(200, { min: 2 }),
  preferred_contact: choice(CONTACT_METHODS),
  language: choice(LANGUAGES),
  adult: ticked,
  consent: ticked,
})
export type PhoneApplicationInput = z.infer<typeof phoneApplicationSchema>

export const workerRegisterSchema = z.object({
  name: textSchema(120, { min: 2, label: 'Name' }),
  phone: phoneSchema,
  trades: z.preprocess((v) => (Array.isArray(v) ? v : v === undefined || v === null || v === '' ? [] : [v]), z.array(z.enum(TRADE_VALUES)).min(1).max(TRADE_VALUES.length)),
  area: textSchema(200, { min: 2 }),
  availability: choice(REGISTER_AVAILABILITY),
  preferred_contact: choice(CONTACT_METHODS),
  language: choice(LANGUAGES),
  adult: ticked,
  consent: ticked,
})
export type WorkerRegisterInput = z.infer<typeof workerRegisterSchema>

/** Field errors as highlights: the forms show the general message above and outline these fields (no new wording). */
export function highlightedFields(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '')
    // The phone and name rules already have the site's own messages; everything else is only outlined.
    if (key && !(key in out)) out[key] = key === 'phone' || key === 'name' ? issue.message : ''
  }
  return out
}

export interface ContactLink {
  method: ContactMethod
  label: 'Call' | 'WhatsApp' | 'Telegram' | 'SMS'
  href: string
}

/**
 * The employer's four contact buttons for a phone application, the applicant's chosen method first (W-A20).
 * Telegram opens the chat by phone number (t.me/+<number>), which works when the person allows it.
 */
export function contactLinks(e164: string, preferred: string | null | undefined): ContactLink[] {
  const digits = e164.replace(/\D/g, '')
  const links: ContactLink[] = [
    { method: 'call', label: 'Call', href: `tel:+${digits}` },
    { method: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/${digits}` },
    { method: 'telegram', label: 'Telegram', href: `https://t.me/+${digits}` },
    { method: 'sms', label: 'SMS', href: `sms:+${digits}` },
  ]
  const first = links.findIndex((l) => l.method === preferred)
  return first <= 0 ? links : [links[first], ...links.slice(0, first), ...links.slice(first + 1)]
}
