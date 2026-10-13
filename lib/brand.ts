// Single place for brand names and public business details.
// Values left empty are unknown and are hidden in the UI until supplied (spec Section 23).

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
  legalEntityLine: '',
  /** "Why buy from HagerLand" points. Shown only once AB confirms each is true (spec 9.3, Section 23 #6). */
  developmentsClaims: [] as { title: string; text: string }[],
  contact: {
    phone: '',
    whatsapp: '',
    telegram: '',
    email: '',
    supplyEmail: '',
    address: '',
    hours: '',
  },
  social: {
    facebook: '',
    instagram: '',
    linkedin: '',
    tiktok: '',
    youtube: '',
    x: '',
    telegram: '',
  },
} as const

export type SocialKey = keyof typeof brand.social

export function configuredSocialLinks(): { key: SocialKey; url: string }[] {
  return (Object.keys(brand.social) as SocialKey[])
    .map((key) => ({ key, url: brand.social[key] as string }))
    .filter((s) => s.url.length > 0)
}
