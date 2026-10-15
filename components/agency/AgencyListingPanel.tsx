import { CalendarCheck, HandCoins, FileText } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { LicenceNote } from '@/components/content/LicenceNote'
import type { Licence } from '@/lib/data/business'

/** On listings HagerLand markets: book a viewing, make an offer (sale) or apply to rent (let) (spec 26.5). */
export function AgencyListingPanel({ slug, purpose, licence }: { slug: string; purpose: 'sale' | 'rent'; licence?: Licence }) {
  return (
    <section aria-labelledby="agency-panel" className="mb-4 rounded-xl border border-green/25 bg-green-tint p-5">
      <p className="hl-eyebrow text-green-darker">Marketed by HagerLand</p>
      <h2 id="agency-panel" className="hl-h3 mt-1">
        Our agents look after this {purpose === 'sale' ? 'sale' : 'let'}
      </h2>
      <div className="mt-4 flex flex-col gap-2">
        <ButtonLink href={`/property/${slug}/viewing`} fullWidth>
          <CalendarCheck className="size-5" aria-hidden /> Book a viewing
        </ButtonLink>
        {purpose === 'sale' ? (
          <ButtonLink href={`/property/${slug}/offer`} variant="secondary" fullWidth>
            <HandCoins className="size-5" aria-hidden /> Make an offer
          </ButtonLink>
        ) : (
          <ButtonLink href={`/property/${slug}/apply`} variant="secondary" fullWidth>
            <FileText className="size-5" aria-hidden /> Apply to rent
          </ButtonLink>
        )}
      </div>
      <p className="mt-3 text-small text-muted">In person or by video call. {purpose === 'sale' ? 'Offers are expressions of interest and are not binding.' : 'Never pay rent or a deposit before you have signed a tenancy agreement.'}</p>
      <LicenceNote kind="estate_agency" licence={licence} className="mt-3" />
    </section>
  )
}
