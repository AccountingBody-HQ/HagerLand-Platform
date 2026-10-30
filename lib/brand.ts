// Fixed brand text. Business details that AB fills in later (contact details, social links,
// legal entity, claims, delivery area) live in site_settings: see lib/data/business.ts.

export const brand = {
  name: 'HagerLand',
  /** Positioning (spec 24.1). The support line is AB's choice of 2026-10 (polish round 1). */
  masterLine: 'One platform for property, construction and everything around it.',
  supportLine: 'Buy, rent, build and manage property in Ethiopia, with partners we check, wherever you live.',
  audienceLine: 'For Ethiopians in Ethiopia and around the world.',
  /** Homepage hero eyebrow (AB, polish round 1, R-3). The audience line stays on About and Diaspora. */
  heroEyebrow: "Ethiopia's property and construction platform",
  /** Short form of the master line for page titles (≤ 60 characters with the name). */
  titleLine: 'Property, construction and everything around it',
  descriptor: "Ethiopia's construction and property platform",
  /** QC-2 (AB, LR-1): the company customers deal with, shown in email footers, the privacy policy and structured data. */
  legalName: 'HagerLand LTD',
  legalAddress: 'Addis Ababa, Ethiopia',
  divisions: {
    supply: 'HagerLand Supply',
    developments: 'HagerLand Developments',
    propertyCare: 'HagerLand Property Care',
  },
} as const

export const SOCIAL_KEYS = ['facebook', 'instagram', 'linkedin', 'tiktok', 'youtube', 'x', 'telegram'] as const
export type SocialKey = (typeof SOCIAL_KEYS)[number]
