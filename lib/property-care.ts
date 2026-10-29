/** HagerLand Property Care (spec 24.6): wording shared by the public page, emails and admin. Client-safe. */

export const CARE_SERVICES = [
  { value: 'management', label: 'Full property management', text: 'One accountable team looking after your property while you are away.' },
  { value: 'maintenance', label: 'Maintenance and repairs', text: 'Problems fixed by tradespeople we work with, with costs agreed with you first.' },
  { value: 'security', label: 'Security and monitoring', text: 'Regular checks that the property is secure, occupied as agreed and not at risk.' },
  { value: 'inspections', label: 'Inspections with photo reports', text: 'Scheduled visits with dated photos and written notes you can see from abroad.' },
  { value: 'tenants', label: 'Finding and managing tenants', text: 'Marketing, viewings, checking tenants and handling their requests.' },
  { value: 'rent_collection', label: 'Rent collection', text: 'Rent collected and accounted for, with a statement for every period.' },
  { value: 'maintenance_coordination', label: 'Maintenance coordination', text: 'Quotes gathered, work supervised and checked before anyone is paid.' },
  { value: 'representation', label: 'Representation in property matters', text: 'Someone to act for you on day-to-day matters about the property, within the authority you give.' },
  { value: 'managed_sale', label: 'Managed sale', text: 'If you decide to sell, we coordinate the sale on your behalf.' },
] as const
export type CareService = (typeof CARE_SERVICES)[number]['value']
export const CARE_SERVICE_VALUES = CARE_SERVICES.map((s) => s.value) as [CareService, ...CareService[]]
export const CARE_SERVICE_LABEL: Record<string, string> = Object.fromEntries(CARE_SERVICES.map((s) => [s.value, s.label]))

export const CARE_PROPERTY_TYPES = [
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment or condominium' },
  { value: 'villa', label: 'Villa' },
  { value: 'g_plus_building', label: 'G+ building' },
  { value: 'land', label: 'Land or plot' },
  { value: 'commercial', label: 'Commercial property' },
  { value: 'other', label: 'Other' },
] as const

export const CARE_OCCUPANCY = [
  { value: 'family', label: 'Family or relatives live there' },
  { value: 'tenanted', label: 'Rented to tenants' },
  { value: 'vacant', label: 'Empty' },
  { value: 'under_construction', label: 'Still being built' },
  { value: 'other', label: 'Other' },
] as const

export const CARE_STATUSES = ['new', 'contacted', 'consultation_booked', 'proposal_sent', 'won', 'lost'] as const
export const CARE_STATUS_LABEL: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  consultation_booked: 'Consultation booked',
  proposal_sent: 'Proposal sent',
  won: 'Client',
  lost: 'Not going ahead',
}

export const MANAGED_STATUSES = ['onboarding', 'active', 'paused', 'ended'] as const
export const INSPECTION_CONDITIONS = [
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'needs_attention', label: 'Needs attention' },
  { value: 'urgent', label: 'Urgent' },
] as const
