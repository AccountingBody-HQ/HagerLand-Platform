// Guide studio (admin): the choices offered when building a prompt, and the pages a guide may link to.

export const STUDIO_MODES = [
  { value: 'topic', label: 'Topic' },
  { value: 'idea', label: 'Idea' },
  { value: 'url', label: 'Reference URL' },
] as const
export type StudioMode = (typeof STUDIO_MODES)[number]['value']

export const STUDIO_READERS = [
  { value: 'diaspora', label: 'Diaspora buyer or owner' },
  { value: 'local', label: 'Local buyer or renter' },
  { value: 'landlord', label: 'Landlord' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'self-builder', label: 'Self-builder or developer' },
  { value: 'contractor', label: 'Contractor or tradesperson' },
  { value: 'supplier', label: 'Supplier or shop' },
] as const
export type StudioReader = (typeof STUDIO_READERS)[number]['value']

export const STUDIO_GUIDE_TYPES = [
  { value: 'how-to', label: 'Step-by-step how-to' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'explainer', label: 'Explainer' },
  { value: 'cost', label: 'Cost and budgeting guide' },
  { value: 'questions', label: 'Questions to ask' },
  { value: 'glossary', label: 'Glossary' },
] as const
export type StudioGuideType = (typeof STUDIO_GUIDE_TYPES)[number]['value']

export const STUDIO_LENGTHS = [
  { value: 'short', label: 'Short (700–1,000 words)', min: 700, max: 1000 },
  { value: 'standard', label: 'Standard (1,200–1,800 words)', min: 1200, max: 1800 },
  { value: 'in-depth', label: 'In-depth (2,000–2,800 words)', min: 2000, max: 2800 },
] as const
export type StudioLength = (typeof STUDIO_LENGTHS)[number]['value']

/**
 * The only HagerLand pages a guide may point to: public, indexable pages that exist today (checked against the live
 * static sitemap, 21 Oct 2026). Coming-soon areas (finance, insurance, our developments) are left out on purpose.
 */
export const APPROVED_GUIDE_LINKS = [
  { href: '/buy', label: 'Buying property' },
  { href: '/rent', label: 'Renting property' },
  { href: '/property/for-sale', label: 'Property for sale' },
  { href: '/property/to-rent', label: 'Property to rent' },
  { href: '/build', label: 'Building and renovating' },
  { href: '/maintain', label: 'Repairs and maintenance' },
  { href: '/manage', label: 'Property management' },
  { href: '/agency', label: 'HagerLand Agency (selling, letting, sourcing)' },
  { href: '/supplies', label: 'Building materials and supplies' },
  { href: '/supplies/materials-list', label: 'Send a materials list for quotes' },
  { href: '/professionals', label: 'Find professionals and contractors' },
  { href: '/request-service', label: 'Request a service or quote' },
  { href: '/jobs', label: 'Construction and property jobs' },
  { href: '/diaspora', label: 'Help for Ethiopians abroad' },
  { href: '/diaspora/property-care', label: 'Property care for owners abroad' },
  { href: '/advice', label: 'Knowledge and advice' },
  { href: '/help', label: 'Help and FAQs' },
] as const

const APPROVED_PATHS = new Set<string>(APPROVED_GUIDE_LINKS.map((l) => l.href))

/** An approved internal path, written as "/path" or as a full www.hagerland.com address. Returns the path, or null. */
export function approvedInternalPath(href: string): string | null {
  const path = href.trim().replace(/^https?:\/\/(www\.)?hagerland\.com/i, '').replace(/\/+$/, '') || '/'
  return APPROVED_PATHS.has(path) ? path : null
}
