// S6-1 private partner registration, portal and product drafts (migration 0048): the pure rules shared by the public
// form, the partner portal, admin and the tests. Partners supply HagerLand privately; customers see HagerLand Supply.
// Public and partner wording is AB's approved text (S6-1 brief, section 3); errors reuse the site's existing texts.
import { z } from 'zod'
import { UNITS } from '@/lib/units'
import { checkbox, decimalFromForm, intFromForm, nameSchema, optionalEmailSchema, optionalText, optionalUuid, phoneSchema, textSchema } from '@/lib/validation/common'

/** Owner switches (all start off). Before HagerLand Ltd (Ethiopia), bank and VAT exist, only registration and the
 * homepage row may ever be switched on; ordering and trade pricing are used from later jobs (S6-2, S6-4). */
export const SUPPLY_SWITCH_KEYS = {
  registration: 'supply_partner_registration',
  catalogueOrdering: 'supply_catalogue_ordering',
  tradePricing: 'supply_trade_pricing',
  homeBusinessRow: 'home_business_row',
} as const
export type SupplySwitch = keyof typeof SUPPLY_SWITCH_KEYS
/** Switches nothing uses yet: the owner page shows them off and refuses to switch them on (L10). */
export const NOT_YET_USED: readonly SupplySwitch[] = ['catalogueOrdering', 'tradePricing']

/** The public path family. */
export const REGISTER_PATH = '/sell-through-hagerland/register'

/** Per visitor (coded internet address): 5 an hour and 20 a day (S6-1 D3). */
export const REGISTRATION_LIMITS = { hour: 5, day: 20 } as const

/** The consent wording version recorded with each public registration. */
export const CONSENT_VERSION = 's6-1-2026-10'
export const CONSENT_TEXT = 'I agree that HagerLand may contact me about supplying products. I can ask to stop at any time.'

/** "What do you do?" on the public form; staff may also record a retail shop. */
export const FORM_ROLES = [
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'importer', label: 'Importer' },
  { value: 'supplier', label: 'Supplier or shop' },
] as const
export const PARTNER_ROLES = ['manufacturer', 'importer', 'supplier', 'retail_shop'] as const
export type PartnerRole = (typeof PARTNER_ROLES)[number]
export const ROLE_LABEL: Record<PartnerRole, string> = { manufacturer: 'Manufacturer', importer: 'Importer', supplier: 'Supplier', retail_shop: 'Retail shop' }

/** A role chosen on a homepage card, pre-selected on the form (?role=…). */
export function preselectedRole(value: string | undefined): PartnerRole | null {
  return value === 'manufacturer' || value === 'importer' || value === 'supplier' ? value : null
}

const GENERIC = 'Please check the highlighted fields.'
const roleList = z.preprocess(
  (v) => (Array.isArray(v) ? v : typeof v === 'string' && v ? [v] : []),
  z.array(z.enum(PARTNER_ROLES)).min(1, 'Choose the type of organisation').max(4),
)
const idList = z.preprocess((v) => (Array.isArray(v) ? v : typeof v === 'string' && v ? [v] : []), z.array(z.uuid()).max(30))

const registrationFields = {
  business_name: z.string().trim().min(2, 'Enter the organisation name').max(160),
  other_names: optionalText(300, 'Other names'),
  roles: roleList,
  category_ids: idList,
  city_id: z.uuid({ error: 'Choose the location' }),
  subcity_id: optionalUuid,
  woreda_id: optionalUuid,
  contact_name: nameSchema,
  phone: phoneSchema,
  email: optionalEmailSchema,
  tin: optionalText(40, 'TIN'),
  message: optionalText(2000, 'Message'),
}

/** The public form: consent is required, and only the three public roles. */
export const registrationSchema = z.object({
  ...registrationFields,
  roles: roleList.refine((r) => !r.includes('retail_shop'), 'Choose the type of organisation'),
  consent: checkbox.refine((v) => v, GENERIC),
})
export type RegistrationInput = z.infer<typeof registrationSchema>

/** Staff "Add registration" for a business met in the field (no consent tick: the business told staff directly). */
export const staffRegistrationSchema = z.object({ ...registrationFields, city_id: optionalUuid })
export type StaffRegistrationInput = z.infer<typeof staffRegistrationSchema>

/** Form fields as submitted (multi-value fields collected as arrays). */
export function registrationFormValues(formData: FormData): Record<string, unknown> {
  const values: Record<string, unknown> = Object.fromEntries(formData)
  values.roles = formData.getAll('roles').map(String)
  values.category_ids = formData.getAll('category_ids').map(String).filter(Boolean)
  return values
}

// ---------------------------------------------------------------------------------------------------------------
// Registration statuses (admin)
// ---------------------------------------------------------------------------------------------------------------
export const REGISTRATION_STATUSES = ['submitted', 'in_review', 'approved', 'changes_requested', 'declined', 'suspended'] as const
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number]
export const REGISTRATION_STATUS_LABEL: Record<RegistrationStatus, string> = {
  submitted: 'New',
  in_review: 'In review',
  approved: 'Approved',
  changes_requested: 'Changes requested',
  declined: 'Declined',
  suspended: 'Suspended',
}
/** Waiting for a decision: counted in the menu and the digest. */
export const REGISTRATION_WAITING: RegistrationStatus[] = ['submitted', 'in_review']

const REGISTRATION_MOVES: Record<RegistrationStatus, RegistrationStatus[]> = {
  submitted: ['in_review', 'approved', 'changes_requested', 'declined'],
  in_review: ['approved', 'changes_requested', 'declined'],
  changes_requested: ['in_review', 'approved', 'declined'],
  approved: ['suspended'],
  suspended: ['approved'],
  declined: ['in_review'],
}
export function canMoveRegistration(from: RegistrationStatus, to: RegistrationStatus): boolean {
  return REGISTRATION_MOVES[from]?.includes(to) ?? false
}
/** Operations may only start a review; every decision is the owner's. */
export function ownerOnlyRegistrationMove(to: RegistrationStatus): boolean {
  return to !== 'in_review'
}
/** The partner relationship has ended (keeping periods start counting for an approved partner). */
export const ENDED_RELATIONSHIP = ['inactive', 'declined', 'do_not_contact']

// ---------------------------------------------------------------------------------------------------------------
// Product drafts (partner portal and admin)
// ---------------------------------------------------------------------------------------------------------------
export const DRAFT_STATUSES = ['draft', 'submitted', 'changes_requested', 'approved', 'rejected', 'withdrawn'] as const
export type DraftStatus = (typeof DRAFT_STATUSES)[number]
/** The partner's words (approved text). */
export const DRAFT_STATUS_LABEL: Record<DraftStatus, string> = {
  draft: 'Draft',
  submitted: 'Sent for review',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  rejected: 'Not accepted',
  withdrawn: 'Withdrawn',
}
/** A partner may change a draft only before it is sent, or when HagerLand asked for changes. */
export const PARTNER_EDITABLE: DraftStatus[] = ['draft', 'changes_requested']
export const PARTNER_WITHDRAWABLE: DraftStatus[] = ['draft', 'submitted', 'changes_requested']
/** HagerLand reviews only drafts that were sent. */
export const REVIEWABLE: DraftStatus[] = ['submitted']

export const PORTAL_TEXT = {
  heading: 'Your products',
  intro: 'Add the products you would like HagerLand Supply to offer. Our team reviews each one before it appears on HagerLand, under the HagerLand Supply name.',
  note: 'Your price and product code are never shown to customers.',
  save: 'Save draft',
  send: 'Send for review',
  withdraw: 'Withdraw',
  areaTitle: 'Your HagerLand Supply partner area',
  openArea: 'Open my partner area',
} as const

/** "Label: value" lines, as a partner types them; a line without a colon is kept as the label. */
export function parseSpecLines(text: string | undefined): { label: string; value: string }[] {
  return (text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 40)
    .map((line) => {
      const at = line.indexOf(':')
      return at > 0 ? { label: line.slice(0, at).trim().slice(0, 80), value: line.slice(at + 1).trim().slice(0, 160) } : { label: line.slice(0, 80), value: '' }
    })
}
export function specLines(specs: unknown): string {
  if (!Array.isArray(specs)) return ''
  return specs
    .map((s) => (s && typeof s === 'object' ? (s as { label?: unknown; value?: unknown }) : null))
    .filter((s): s is { label?: unknown; value?: unknown } => s !== null)
    .map((s) => (s.value ? `${String(s.label ?? '')}: ${String(s.value)}` : String(s.label ?? '')))
    .join('\n')
}

/** Birr (with up to 2 decimals) to cents; undefined when empty. */
const priceCents = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : Number(String(v).replace(/[,\s]/g, ''))),
  z.number({ error: 'Enter a number' }).min(0).max(1_000_000_000).optional().transform((n) => (n === undefined ? undefined : Math.round(n * 100))),
)

export const draftSchema = z.object({
  id: z.uuid(),
  name: textSchema(160, { min: 2, label: 'Name' }),
  brand_name: optionalText(80, 'Brand'),
  category_id: optionalUuid,
  unit: z.enum(UNITS.map((u) => u.value) as [string, ...string[]]),
  pack_size: optionalText(60, 'Pack size'),
  description: optionalText(8000, 'Description'),
  specs: optionalText(6000, 'Specifications'),
  partner_sku: optionalText(60, 'Product code'),
  proposed_price: priceCents,
  stock_note: optionalText(500, 'Stock'),
  lead_time_days: intFromForm({ min: 0, max: 365 }),
  min_order_qty: decimalFromForm({ min: 0.01, max: 1_000_000 }),
  intent: z.enum(['save', 'send']),
})
export type DraftInput = z.infer<typeof draftSchema>

/** Photos belong to the draft's own private folder (lib/storage processIncomingDocument writes docs/<area>/<id>/…). */
export function partnerPhotoPrefix(draftId: string): string {
  return `docs/partner/${draftId}/`
}
export function ownPhotoPaths(draftId: string, paths: unknown): string[] {
  const list = Array.isArray(paths) ? paths : typeof paths === 'string' && paths ? [paths] : []
  const prefix = partnerPhotoPrefix(draftId)
  return Array.from(new Set(list.map(String).filter((p) => p.startsWith(prefix) && /^[a-z0-9/-]+\.(jpg|png|webp)$/.test(p)))).slice(0, 8)
}

/** Owner terms recorded with a product source (stored only in S6-1; prices are computed from S6-3). */
export const SETTLEMENT_TIMINGS = [
  { value: 'after_delivery', label: 'After delivery' },
  { value: 'upfront', label: 'Up front' },
  { value: 'credit', label: 'On credit' },
] as const
