import 'server-only'
import type { PublicProperty } from '@/lib/data/properties'
import { canonicalUrl } from '@/lib/site'
import { publicMediaUrl } from '@/lib/media'
import { postalAddress } from '@/lib/seo'
import { propertyTypeLabel } from '@/lib/labels'

const RESIDENCE: Record<string, string> = { apartment: 'Apartment', condominium: 'Apartment', studio: 'Apartment', house: 'SingleFamilyResidence', villa: 'SingleFamilyResidence', townhouse: 'SingleFamilyResidence', room: 'Room' }

export function propertyJsonLd(p: PublicProperty, images: string[], city: string | null, region: string | null): Record<string, unknown> {
  const url = canonicalUrl(`/property/${p.slug}`)
  const residenceType = RESIDENCE[p.property_type ?? '']
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: p.title,
    url,
    datePosted: p.published_at,
    description: p.description?.slice(0, 500),
    image: images.slice(0, 6),
    ...(p.price_etb && !p.price_on_request
      ? {
          offers: {
            '@type': 'Offer',
            price: p.price_etb,
            priceCurrency: 'ETB',
            availability: 'https://schema.org/InStock',
            businessFunction: p.purpose === 'rent' ? 'http://purl.org/goodrelations/v1#LeaseOut' : 'http://purl.org/goodrelations/v1#Sell',
            ...(p.purpose === 'rent' ? { priceSpecification: { '@type': 'UnitPriceSpecification', price: p.price_etb, priceCurrency: 'ETB', unitCode: 'MON' } } : {}),
          },
        }
      : {}),
    about: {
      '@type': residenceType ?? 'Place',
      name: propertyTypeLabel(p.property_type),
      address: postalAddress(p.location_name, region ?? city, p.address_line),
      ...(p.bedrooms ? { numberOfRooms: p.bedrooms } : {}),
      ...(p.area_m2 ? { floorSize: { '@type': 'QuantitativeValue', value: p.area_m2, unitCode: 'MTK' } } : {}),
      ...(p.lat && p.lng ? { geo: { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng } } : {}),
    },
  }
}

export function imageUrls(paths: (string | null)[]): string[] {
  return paths.map((p) => publicMediaUrl(p)).filter((u): u is string => Boolean(u))
}
