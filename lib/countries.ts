/**
 * Countries HagerLand serves (spec 24.4): Ethiopia (core market) and the main diaspora markets.
 * Codes are ISO 3166-1 alpha-2; "ZZ" means another country. Currencies are the ones records may use.
 */

export const CURRENCIES = ['ETB', 'GBP', 'USD', 'EUR', 'CAD', 'AED', 'SEK', 'NOK', 'SAR', 'ILS', 'ZAR', 'KES'] as const
export type Currency = (typeof CURRENCIES)[number]

export interface Country {
  code: string
  name: string
  currency: Currency
  /** Default IANA time zone, used to suggest a time zone on forms. */
  timeZone: string
}

export const COUNTRIES: Country[] = [
  { code: 'ET', name: 'Ethiopia', currency: 'ETB', timeZone: 'Africa/Addis_Ababa' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', timeZone: 'Europe/London' },
  { code: 'US', name: 'United States', currency: 'USD', timeZone: 'America/New_York' },
  { code: 'CA', name: 'Canada', currency: 'CAD', timeZone: 'America/Toronto' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', timeZone: 'Asia/Dubai' },
  { code: 'SE', name: 'Sweden', currency: 'SEK', timeZone: 'Europe/Stockholm' },
  { code: 'DE', name: 'Germany', currency: 'EUR', timeZone: 'Europe/Berlin' },
  { code: 'NO', name: 'Norway', currency: 'NOK', timeZone: 'Europe/Oslo' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', timeZone: 'Europe/Amsterdam' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', timeZone: 'Asia/Riyadh' },
  { code: 'IL', name: 'Israel', currency: 'ILS', timeZone: 'Asia/Jerusalem' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', timeZone: 'Africa/Johannesburg' },
  { code: 'KE', name: 'Kenya', currency: 'KES', timeZone: 'Africa/Nairobi' },
]

export const OTHER_COUNTRY: Country = { code: 'ZZ', name: 'Another country', currency: 'USD', timeZone: 'UTC' }

export const COUNTRY_CODES: [string, ...string[]] = [OTHER_COUNTRY.code, ...COUNTRIES.map((c) => c.code)]

export function countryByCode(code: string | null | undefined): Country | null {
  if (!code) return null
  return COUNTRIES.find((c) => c.code === code) ?? (code === OTHER_COUNTRY.code ? OTHER_COUNTRY : null)
}

export function countryName(code: string | null | undefined): string {
  return countryByCode(code)?.name ?? (code ?? '')
}

export function isCurrency(v: unknown): v is Currency {
  return typeof v === 'string' && (CURRENCIES as readonly string[]).includes(v)
}
