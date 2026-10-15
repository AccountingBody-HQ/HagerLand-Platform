import type { BusinessDetails } from '@/lib/data/business'

/** Who operates the site. Shown only once AB has entered the legal entity in admin → Settings. */
export function LegalEntity({ legal }: { legal: BusinessDetails['legal'] }) {
  if (!legal.name) return null
  return (
    <p>
      This website is operated by <strong>{legal.name}</strong>
      {legal.registrationNumber && <>, registration number {legal.registrationNumber}</>}
      {legal.address && <>, of {legal.address}</>}.
    </p>
  )
}
