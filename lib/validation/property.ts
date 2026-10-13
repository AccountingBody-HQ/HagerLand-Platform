import { z } from 'zod'
import { FEATURES, PROPERTY_TYPES } from '@/lib/labels'
import { checkbox, decimalFromForm, intFromForm, optionalEmailSchema, optionalPhoneSchema, optionalText, telegramSchema, textSchema, youtubeUrl, preferredContactSchema } from './common'

const blank = (v: unknown) => (v === '' || v === null ? undefined : v)
const featureValues = FEATURES.map((f) => f.value) as [string, ...string[]]
const typeValues = PROPERTY_TYPES.map((t) => t.value) as [(typeof PROPERTY_TYPES)[number]['value'], ...(typeof PROPERTY_TYPES)[number]['value'][]]

export const basicsSchema = z.object({
  purpose: z.enum(['sale', 'rent'], { error: 'Choose sale or rent' }),
  property_type: z.enum(typeValues, { error: 'Choose a property type' }),
  title: textSchema(120, { min: 10, label: 'Title' }),
  description: textSchema(6000, { min: 80, label: 'Description' }),
})

export const locationSchema = z.object({
  location_id: z.uuid({ error: 'Choose the location' }),
  address_line: optionalText(200, 'Address'),
  show_exact_location: checkbox,
  requested_area: optionalText(80, 'Area name'),
})

export const detailsSchema = z
  .object({
    price_on_request: checkbox,
    price_etb: intFromForm({ min: 1, max: 100_000_000_000 }),
    price_negotiable: checkbox,
    advance_months: intFromForm({ min: 0, max: 24 }),
    service_charge_etb: intFromForm({ min: 0, max: 100_000_000 }),
    bedrooms: intFromForm({ min: 0, max: 50 }),
    bathrooms: intFromForm({ min: 0, max: 50 }),
    area_m2: decimalFromForm({ min: 1, max: 10_000_000 }),
    plot_area_m2: decimalFromForm({ min: 1, max: 100_000_000 }),
    floors_label: z.preprocess(blank, z.string().trim().regex(/^(G|B)(\+\d{1,3})?$/i, 'Use the format G+2').optional()),
    floor_number: intFromForm({ min: 0, max: 200 }),
    year_built: intFromForm({ min: 1900, max: 2100 }),
    finishing_status: z.preprocess(blank, z.enum(['shell', 'semi_finished', 'fully_finished', 'not_applicable']).optional()),
    furnishing: z.preprocess(blank, z.enum(['unfurnished', 'semi_furnished', 'furnished']).optional()),
    tenure: z.preprocess(blank, z.enum(['leasehold', 'freehold_private', 'condominium_title', 'cooperative', 'unknown']).optional()),
    has_title_deed: z.preprocess((v) => (v === 'yes' ? true : v === 'no' ? false : undefined), z.boolean().optional()),
    completion_status: z.preprocess(blank, z.enum(['off_plan', 'under_construction', 'ready']).optional()),
    parking_spaces: intFromForm({ min: 0, max: 500 }),
    features: z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.enum(featureValues)).max(30)),
    video_url: youtubeUrl,
  })
  .refine((d) => d.price_on_request || d.price_etb !== undefined, { message: 'Enter a price, or tick "Price on request"', path: ['price_etb'] })

export const contactSchema = z.object({
  contact_phone: optionalPhoneSchema,
  contact_whatsapp: optionalPhoneSchema,
  contact_telegram: telegramSchema,
  contact_email: optionalEmailSchema,
  preferred_contact: preferredContactSchema,
})

export const declarationsSchema = z.object({
  declare_owner: z.literal('on', { error: 'Please confirm you are allowed to list this property' }),
  declare_accurate: z.literal('on', { error: 'Please confirm the information is accurate' }),
})

export type WizardStep = 'basics' | 'location' | 'details' | 'photos' | 'contact' | 'review'
export const WIZARD_STEPS: { id: WizardStep; label: string }[] = [
  { id: 'basics', label: 'Basics' },
  { id: 'location', label: 'Location' },
  { id: 'details', label: 'Details' },
  { id: 'photos', label: 'Photos' },
  { id: 'contact', label: 'Contact' },
  { id: 'review', label: 'Review' },
]

export const MIN_PHOTOS = 3

export function formToObject(formData: FormData, multi: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = Object.fromEntries(formData)
  for (const key of multi) out[key] = formData.getAll(key)
  return out
}
