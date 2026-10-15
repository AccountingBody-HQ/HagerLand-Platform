import { z } from 'zod'
import { SOCIAL_KEYS } from '@/lib/brand'
import { normalisePhone } from '@/lib/format'
import { placePhone } from '@/lib/admin/place-mapping'

const text = (max: number) => z.string().trim().max(max).default('')

/** Accepts Ethiopian mobiles and landlines (and international numbers with +), stored as E.164. Empty stays empty. */
export const settingsPhone = z
  .string()
  .trim()
  .max(30)
  .default('')
  .transform((v, ctx) => {
    if (!v) return ''
    const out = normalisePhone(v) ?? placePhone(undefined, v)
    if (!out) {
      ctx.addIssue({ code: 'custom', message: 'Enter a phone number such as 0911 234 567 or +251 11 123 4567.' })
      return z.NEVER
    }
    return out
  })

const httpsUrl = z
  .string()
  .trim()
  .max(300)
  .default('')
  .refine((v) => !v || /^https:\/\/[^\s]+$/.test(v), 'Use a full https:// link.')

const sitePath = z
  .string()
  .trim()
  .max(300)
  .default('')
  .refine((v) => !v || /^\/[^\s]*$/.test(v) || /^https:\/\/[^\s]+$/.test(v), 'Use a page path such as /supplies, or a full https:// link.')

const telegram = z
  .string()
  .trim()
  .max(64)
  .default('')
  .transform((v) => v.replace(/^@/, '').replace(/^https:\/\/t\.me\//, ''))
  .refine((v) => !v || /^[A-Za-z0-9_]{5,32}$/.test(v), 'Telegram usernames are 5–32 letters, numbers or _.')

const email = z
  .string()
  .trim()
  .max(200)
  .default('')
  .refine((v) => !v || z.email().safeParse(v).success, 'Enter a valid email address.')

export const SETTINGS_SECTIONS = ['contact', 'social', 'legal', 'business', 'announcement', 'thresholds', 'legal_dates', 'homepage', 'language', 'licences', 'gates', 'agency'] as const
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]

export const contactSchema = z.object({
  phone: settingsPhone,
  whatsapp: settingsPhone,
  telegram,
  email,
  supply_email: email,
  address: text(300),
  hours: text(200),
})

export const socialSchema = z.object(Object.fromEntries(SOCIAL_KEYS.map((k) => [k, httpsUrl])) as Record<(typeof SOCIAL_KEYS)[number], typeof httpsUrl>)

export const legalSchema = z.object({ name: text(200), registration_number: text(80), address: text(300), governing_law: text(200) })

export const businessSchema = z.object({
  free_listing_confirmed: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  delivery_area: text(300),
  quote_response_target: text(80),
  property_care_pricing: text(1000),
  claims: z
    .array(z.object({ title: text(80), text: text(400) }))
    .max(8)
    .default([])
    .transform((list) => list.filter((c) => c.title && c.text)),
})

export const announcementSchema = z.object({
  enabled: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  text: text(160),
  href: sitePath,
})

export const thresholdsSchema = z.object({
  listing_expiry_days: z.coerce.number().int().min(14).max(365),
  min_results_for_index: z.coerce.number().int().min(0).max(100),
  private_owner_max_active_listings: z.coerce.number().int().min(1).max(50),
  verified_business_count_min: z.coerce.number().int().min(0).max(100000),
})

const isoOrEmpty = z
  .string()
  .trim()
  .default('')
  .refine((v) => !v || z.iso.date().safeParse(v).success, 'Use a date.')

export const legalDatesSchema = z.object({ terms: isoOrEmpty, privacy: isoOrEmpty, cookies: isoOrEmpty })

/** Homepage picks: property references (8-character short ids) or ids, one per line. */
export const homepageSchema = z.object({ picks: z.string().max(2000).default('') })

export function parsePickRefs(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .map((s) => s.match(/(?:^|\/|-)([0-9a-z]{8})$/i)?.[1]?.toLowerCase() ?? (z.uuid().safeParse(s).success ? s.toLowerCase() : ''))
        .filter(Boolean),
    ),
  ).slice(0, 12)
}

/** Amharic locale switch (spec 25.2m): off until AB approves the native-speaker review. */
export const languageSchema = z.object({ amharic_enabled: z.preprocess((v) => v === 'on' || v === 'true', z.boolean()) })

/** Licence and approval references per regulated service (spec 26.1 and AB's update of 15 Oct 2026). */
export const LICENCE_KINDS = ['estate_agency', 'property_management', 'recruitment', 'finance', 'insurance'] as const
export type LicenceKind = (typeof LICENCE_KINDS)[number]
export const LICENCE_LABELS: Record<LicenceKind, string> = {
  estate_agency: 'Estate agency',
  property_management: 'Property management (including collecting and holding rent)',
  recruitment: 'Recruitment and placement',
  finance: 'Finance introductions',
  insurance: 'Insurance introductions',
}
const licenceFields = z.object({ number: text(80), authority: text(160), holder: text(200), date: isoOrEmpty })
export const licencesSchema = z.object(Object.fromEntries(LICENCE_KINDS.map((k) => [k, licenceFields])) as Record<LicenceKind, typeof licenceFields>)

/** Flat form fields ("estate_agency_number", …) → the nested settings value. */
export function licencesInput(input: Record<string, unknown>): Record<string, Record<string, unknown>> {
  return Object.fromEntries(LICENCE_KINDS.map((k) => [k, { number: input[`${k}_number`], authority: input[`${k}_authority`], holder: input[`${k}_holder`], date: input[`${k}_date`] }]))
}

/** Stage gates (spec 26.3): providers needed before Aggregate, and the pre-filled clearance note. */
export const gatesSchema = z.object({
  stage_gate_min_providers: z.coerce.number().int().min(0).max(100),
  regulatory_clearance_note: text(300),
})

/** Estate agency (spec 26.5): a published fee schedule (empty = "fees agreed in writing"). */
export const agencySchema = z.object({ agency_fee_schedule: text(2000), market_insight_min_sample: z.coerce.number().int().min(1).max(100).default(5) })
