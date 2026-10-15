import type { Database } from '@/lib/database.types'

type Enums = Database['public']['Enums']
export type PropertyType = Enums['property_type']
export type ListingPurpose = Enums['listing_purpose']
export type FinishingStatus = Enums['finishing_status']
export type Furnishing = Enums['furnishing']
export type Tenure = Enums['tenure']
export type CompletionStatus = Enums['completion_status']
export type ListingStatus = Enums['listing_status']

export const PROPERTY_TYPES: { value: PropertyType; label: string; plural: string }[] = [
  { value: 'apartment', label: 'Apartment', plural: 'Apartments' },
  { value: 'condominium', label: 'Condominium', plural: 'Condominiums' },
  { value: 'house', label: 'House', plural: 'Houses' },
  { value: 'villa', label: 'Villa', plural: 'Villas' },
  { value: 'townhouse', label: 'Townhouse', plural: 'Townhouses' },
  { value: 'g_plus_building', label: 'G+ building', plural: 'G+ buildings' },
  { value: 'room', label: 'Room', plural: 'Rooms' },
  { value: 'studio', label: 'Studio', plural: 'Studios' },
  { value: 'land', label: 'Land / plot', plural: 'Land and plots' },
  { value: 'commercial_building', label: 'Commercial building', plural: 'Commercial buildings' },
  { value: 'office', label: 'Office', plural: 'Offices' },
  { value: 'shop', label: 'Shop', plural: 'Shops' },
  { value: 'warehouse', label: 'Warehouse', plural: 'Warehouses' },
  { value: 'hotel', label: 'Hotel', plural: 'Hotels' },
  { value: 'mixed_use', label: 'Mixed-use building', plural: 'Mixed-use buildings' },
  { value: 'other', label: 'Other', plural: 'Other properties' },
]

export const COMMERCIAL_TYPES: PropertyType[] = ['commercial_building', 'office', 'shop', 'warehouse', 'hotel', 'mixed_use']
export const RESIDENTIAL_TYPES: PropertyType[] = ['apartment', 'condominium', 'house', 'villa', 'townhouse', 'room', 'studio']

export function propertyTypeLabel(t: string | null | undefined): string {
  return PROPERTY_TYPES.find((p) => p.value === t)?.label ?? 'Property'
}

export function propertyTypePlural(t: string | null | undefined): string {
  return PROPERTY_TYPES.find((p) => p.value === t)?.plural ?? 'Properties'
}

export const FINISHING: { value: FinishingStatus; label: string }[] = [
  { value: 'shell', label: 'Shell' },
  { value: 'semi_finished', label: 'Semi-finished' },
  { value: 'fully_finished', label: 'Fully finished' },
  { value: 'not_applicable', label: 'Not applicable' },
]

export const FURNISHING: { value: Furnishing; label: string }[] = [
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'semi_furnished', label: 'Semi-furnished' },
  { value: 'furnished', label: 'Furnished' },
]

export const TENURE: { value: Tenure; label: string }[] = [
  { value: 'leasehold', label: 'Leasehold (urban land lease)' },
  { value: 'freehold_private', label: 'Private holding' },
  { value: 'condominium_title', label: 'Condominium title' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'unknown', label: 'Not sure' },
]

export const COMPLETION: { value: CompletionStatus; label: string }[] = [
  { value: 'ready', label: 'Ready to move in' },
  { value: 'under_construction', label: 'Under construction' },
  { value: 'off_plan', label: 'Off-plan' },
]

export const FEATURES: { value: string; label: string }[] = [
  { value: 'lift', label: 'Lift' },
  { value: 'generator', label: 'Backup generator' },
  { value: 'water_tank', label: 'Water tank' },
  { value: 'borehole', label: 'Borehole' },
  { value: 'security', label: '24-hour security' },
  { value: 'cctv', label: 'CCTV' },
  { value: 'garden', label: 'Garden' },
  { value: 'balcony', label: 'Balcony' },
  { value: 'servants_quarters', label: "Servants' quarters" },
  { value: 'gym', label: 'Gym' },
  { value: 'pool', label: 'Swimming pool' },
  { value: 'solar', label: 'Solar power' },
  { value: 'internet_ready', label: 'Internet ready' },
  { value: 'wheelchair_access', label: 'Wheelchair access' },
  { value: 'pets_allowed', label: 'Pets allowed' },
  { value: 'parking', label: 'Parking' },
  { value: 'furnished_kitchen', label: 'Fitted kitchen' },
  { value: 'storage', label: 'Storage room' },
  // Investment opportunities (PLATFORM_VISION §2): already let, or sold as an income property.
  { value: 'investment', label: 'Investment property (income or already let)' },
]

export function featureLabel(v: string): string {
  return FEATURES.find((f) => f.value === v)?.label ?? v.replace(/_/g, ' ')
}

export function labelOf<T extends string>(list: { value: T; label: string }[], v: string | null | undefined): string {
  return list.find((x) => x.value === v)?.label ?? ''
}

export const LISTING_STATUS_LABELS: Record<ListingStatus, { label: string; tone: 'neutral' | 'green' | 'gold' | 'info' | 'warning' | 'danger' | 'ink' }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  pending_review: { label: 'In review', tone: 'info' },
  published: { label: 'Live', tone: 'green' },
  paused: { label: 'Paused', tone: 'warning' },
  expired: { label: 'Expired', tone: 'warning' },
  rejected: { label: 'Changes needed', tone: 'danger' },
  archived: { label: 'Archived', tone: 'neutral' },
  removed: { label: 'Removed', tone: 'danger' },
}

export const LISTER_TYPES = [
  { value: 'owner', label: 'Private owner' },
  { value: 'agent', label: 'Estate agent' },
  { value: 'developer', label: 'Developer' },
]

export const ADDED_WITHIN = [
  { value: '1', label: 'Last 24 hours' },
  { value: '3', label: 'Last 3 days' },
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
]

export function purposeSegment(p: ListingPurpose): 'for-sale' | 'to-rent' {
  return p === 'sale' ? 'for-sale' : 'to-rent'
}

export function purposeLabel(p: ListingPurpose): string {
  return p === 'sale' ? 'For sale' : 'To rent'
}

/** "3-bed apartment", "Land / plot", "Studio" */
export function propertyHeadline(type: string, beds: number | null | undefined): string {
  const label = propertyTypeLabel(type)
  if (beds && beds > 0 && !['land', 'warehouse', 'office', 'shop'].includes(type)) return `${beds}-bed ${label.toLowerCase()}`
  return label
}
