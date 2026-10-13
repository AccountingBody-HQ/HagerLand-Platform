// Fixed brand text. Business details that AB fills in later (contact details, social links,
// legal entity, claims, delivery area) live in site_settings: see lib/data/business.ts.

export const brand = {
  name: 'HagerLand',
  tagline: 'Build. Buy. Live.',
  descriptor: "Ethiopia's construction and property platform",
  heroHeadline: 'From the first brick to the front door.',
  heroSupport:
    'Find homes and land, source construction materials, and hire trusted professionals across Ethiopia — all in one place.',
  divisions: {
    supply: 'HagerLand Supply',
    developments: 'HagerLand Developments',
  },
} as const

export const SOCIAL_KEYS = ['facebook', 'instagram', 'linkedin', 'tiktok', 'youtube', 'x', 'telegram'] as const
export type SocialKey = (typeof SOCIAL_KEYS)[number]
