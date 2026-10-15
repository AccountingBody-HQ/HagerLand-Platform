// Fixed brand text. Business details that AB fills in later (contact details, social links,
// legal entity, claims, delivery area) live in site_settings: see lib/data/business.ts.

export const brand = {
  name: 'HagerLand',
  /** Positioning (spec 24.1). Replaces the earlier tagline and hero lines (spec 3.3). */
  masterLine: 'One platform for property, construction and everything around it.',
  supportLine: 'Find it. Buy it. Finance it. Build it. Supply it. Insure it. Maintain it. Sell it. Rent it.',
  audienceLine: 'For Ethiopians in Ethiopia and around the world.',
  /** Short form of the master line for page titles (≤ 60 characters with the name). */
  titleLine: 'Property, construction and everything around it',
  descriptor: "Ethiopia's construction and property platform",
  divisions: {
    supply: 'HagerLand Supply',
    developments: 'HagerLand Developments',
    propertyCare: 'HagerLand Property Care',
  },
} as const

export const SOCIAL_KEYS = ['facebook', 'instagram', 'linkedin', 'tiktok', 'youtube', 'x', 'telegram'] as const
export type SocialKey = (typeof SOCIAL_KEYS)[number]
