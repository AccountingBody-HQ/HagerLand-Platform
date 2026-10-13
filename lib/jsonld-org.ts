import 'server-only'
import type { PublicOrganisation } from '@/lib/data/organisations'
import { canonicalUrl } from '@/lib/site'
import { publicMediaUrl } from '@/lib/media'
import { postalAddress } from '@/lib/seo'

const TYPE_BY_KIND: Record<string, string> = {
  agency: 'RealEstateAgent',
  developer: 'HomeAndConstructionBusiness',
  contractor: 'GeneralContractor',
  professional_firm: 'HomeAndConstructionBusiness',
  sole_trader: 'HomeAndConstructionBusiness',
  supplier: 'Store',
  manufacturer: 'Store',
  lender: 'FinancialService',
  insurer: 'InsuranceAgency',
  broker: 'FinancialService',
  hagerland: 'HomeAndConstructionBusiness',
}

export function organisationJsonLd(o: PublicOrganisation, city: string | null, region: string | null): Record<string, unknown> {
  const logo = publicMediaUrl(o.logo_path)
  const sameAs = Object.values((o.social as Record<string, string> | null) ?? {}).filter((u) => typeof u === 'string' && u.startsWith('http'))
  return {
    '@context': 'https://schema.org',
    '@type': TYPE_BY_KIND[o.kind ?? ''] ?? 'LocalBusiness',
    name: o.name,
    url: canonicalUrl(`/company/${o.slug}`),
    ...(o.description ? { description: o.description.slice(0, 500) } : {}),
    ...(logo ? { logo, image: logo } : {}),
    ...(o.website ? { sameAs: [o.website, ...sameAs] } : sameAs.length ? { sameAs } : {}),
    address: postalAddress(city, region, null, o.country_code && o.country_code !== 'ZZ' ? o.country_code : 'ET'),
    ...(o.year_established ? { foundingDate: String(o.year_established) } : {}),
  }
}
