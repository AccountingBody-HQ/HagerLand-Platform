import { z } from 'zod'
import { checkbox, optionalEmailSchema, optionalPhoneSchema, optionalText, optionalUrl, optionalUuid, phoneSchema, telegramSchema, textSchema, intFromForm } from './common'

export const USER_ORG_KINDS = ['agency', 'developer', 'supplier', 'manufacturer', 'contractor', 'professional_firm', 'sole_trader'] as const

export const ORG_KIND_LABELS: Record<string, string> = {
  agency: 'Estate agency',
  developer: 'Developer',
  supplier: 'Supplier',
  manufacturer: 'Manufacturer',
  contractor: 'Contractor',
  professional_firm: 'Professional firm',
  sole_trader: 'Tradesperson',
  lender: 'Lender',
  insurer: 'Insurer',
  broker: 'Broker',
  hagerland: 'HagerLand',
}

const idList = z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.uuid()).max(60))

export const organisationSchema = z.object({
  name: textSchema(160, { min: 2, label: 'Business name' }),
  kind: z.enum(USER_ORG_KINDS, { error: 'Choose your type of business' }),
  tagline: optionalText(160, 'Tagline'),
  description: optionalText(5000, 'Description'),
  location_id: z.uuid({ error: 'Choose where you are based' }),
  areas_served: idList,
  serves_diaspora: checkbox,
  service_ids: idList,
  product_category_ids: idList,
  phone: phoneSchema,
  whatsapp: optionalPhoneSchema,
  telegram: telegramSchema,
  email: optionalEmailSchema,
  website: optionalUrl,
  address_line: optionalText(200, 'Address'),
  year_established: intFromForm({ min: 1900, max: 2100 }),
  team_size: z.preprocess((v) => (v === '' ? undefined : v), z.enum(['1', '2-5', '6-20', '21-50', '51-200', '200+']).optional()),
  licence_category: optionalText(80, 'Licence category'),
  licence_grade: optionalText(20, 'Licence grade'),
  confirm_new: z.preprocess((v) => v === '1', z.boolean()),
  existing_id: optionalUuid,
})

export type OrganisationInput = z.infer<typeof organisationSchema>

/** Reads multi-value fields (checkbox groups) as arrays before validation. */
export function organisationFormValues(formData: FormData): Record<string, unknown> {
  const values: Record<string, unknown> = Object.fromEntries(formData)
  for (const key of ['areas_served', 'service_ids', 'product_category_ids']) values[key] = formData.getAll(key)
  return values
}
