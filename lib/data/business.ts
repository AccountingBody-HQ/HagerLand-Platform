import 'server-only'
import { cache } from 'react'
import { SOCIAL_KEYS, type SocialKey } from '@/lib/brand'
import { getSiteSettings } from './reference'

export interface BusinessDetails {
  contact: { phone: string; whatsapp: string; telegram: string; email: string; supplyEmail: string; address: string; hours: string }
  social: { key: SocialKey; url: string }[]
  legal: { name: string; registrationNumber: string; address: string; governingLaw: string }
  /** "HagerLand PLC · Reg. 12345 · Addis Ababa", or empty until AB fills it in. */
  legalLine: string
  freeListingConfirmed: boolean
  developmentsClaims: { title: string; text: string }[]
  deliveryArea: string
  quoteResponseTarget: string
  announcement: { text: string; href: string } | null
  verifiedBusinessCountMin: number
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

/**
 * Business details AB sets in admin → Settings (stored in site_settings).
 * Anything not yet set comes back empty, and every page hides empty values (spec Section 23).
 */
export const getBusinessDetails = cache(async (): Promise<BusinessDetails> => {
  const s = await getSiteSettings()
  const c = obj(s.contact_details)
  const social = obj(s.social_links)
  const legal = obj(s.legal_entity)
  const ann = obj(s.announcement_bar)
  const claims = Array.isArray(s.developments_claims) ? s.developments_claims : []
  const legalName = str(legal.name)
  return {
    contact: { phone: str(c.phone), whatsapp: str(c.whatsapp), telegram: str(c.telegram), email: str(c.email), supplyEmail: str(c.supply_email), address: str(c.address), hours: str(c.hours) },
    social: SOCIAL_KEYS.map((key) => ({ key, url: str(social[key]) })).filter((x) => /^https:\/\//.test(x.url)),
    legal: { name: legalName, registrationNumber: str(legal.registration_number), address: str(legal.address), governingLaw: str(legal.governing_law) },
    legalLine: legalName ? [legalName, str(legal.registration_number) && `Reg. ${str(legal.registration_number)}`, str(legal.address)].filter(Boolean).join(' · ') : '',
    freeListingConfirmed: s.free_listing_confirmed === true,
    developmentsClaims: claims
      .map((x) => obj(x))
      .map((x) => ({ title: str(x.title), text: str(x.text) }))
      .filter((x) => x.title && x.text),
    deliveryArea: str(s.delivery_area),
    quoteResponseTarget: str(s.quote_response_target),
    announcement: ann.enabled === true && str(ann.text) ? { text: str(ann.text), href: str(ann.href) } : null,
    verifiedBusinessCountMin: typeof s.verified_business_count_min === 'number' ? s.verified_business_count_min : 25,
  }
})
