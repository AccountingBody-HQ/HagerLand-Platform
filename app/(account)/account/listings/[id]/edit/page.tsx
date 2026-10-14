import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getOwnDevelopments } from '@/lib/data/owner-dev'
import { loadOwnerListing } from '@/lib/data/owner-listings'
import { WIZARD_STEPS, type WizardStep } from '@/lib/validation/property'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { ListingWizard } from '@/components/account/ListingWizard'
import { PriceLine } from '@/components/property/PriceLine'
import { KeyFacts } from '@/components/property/KeyFacts'
import { MediaImage } from '@/components/media/MediaImage'
import { Badge } from '@/components/ui/Badge'
import { FormAlert } from '@/components/forms/FormParts'
import { FINISHING, LISTING_STATUS_LABELS, labelOf, propertyTypeLabel } from '@/lib/labels'
import { formatArea } from '@/lib/format'
import { getLocationById } from '@/lib/data/reference'
import { getMapConfig } from '@/lib/map-config'

export const metadata = { title: 'Edit listing' }

export default async function EditListingPage({ params, searchParams }: { params: { id: string }; searchParams: { step?: string } }) {
  await requireUser(`/account/listings/${params.id}/edit`)
  const listing = await loadOwnerListing(params.id)
  if (!listing) notFound()
  const { row, merged, media, values } = listing
  const step = (WIZARD_STEPS.some((s) => s.id === searchParams.step) ? searchParams.step : 'basics') as WizardStep
  const isLive = row.status === 'published' || row.status === 'paused'
  const status = LISTING_STATUS_LABELS[row.status]
  const cover = media.find((m) => m.kind === 'image' && m.is_cover) ?? media.find((m) => m.kind === 'image')
  const loc = await getLocationById(merged.location_id)

  const review = (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid sm:grid-cols-[260px_1fr]">
        <div className="relative aspect-[4/3] bg-stone-100 sm:aspect-auto">{cover && <MediaImage path={cover.storage_path} alt="Cover photo" fill sizes="260px" className="object-cover" />}</div>
        <div className="space-y-2 p-5">
          <PriceLine price={merged.price_etb} period={merged.price_period} onRequest={merged.price_on_request} negotiable={merged.price_negotiable} />
          <p className="font-semibold">{merged.title}</p>
          <p className="text-small text-muted">{loc?.display_name}</p>
          <p className="text-small text-muted">{media.filter((m) => m.kind === 'image').length} photos</p>
        </div>
      </div>
      <div className="border-t border-border p-5">
        <KeyFacts
          facts={[
            { label: 'Type', value: propertyTypeLabel(merged.property_type) },
            { label: 'Purpose', value: merged.purpose === 'rent' ? 'To rent' : 'For sale' },
            { label: 'Bedrooms', value: merged.bedrooms },
            { label: 'Bathrooms', value: merged.bathrooms },
            { label: 'Floor area', value: merged.area_m2 ? formatArea(merged.area_m2) : null },
            { label: 'Finishing', value: labelOf(FINISHING, merged.finishing_status) },
            { label: 'Phone', value: merged.contact_phone ? 'Added' : 'Missing' },
          ]}
        />
      </div>
    </div>
  )

  return (
    <div>
      <AccountPageHeader title={row.title} description={<Badge tone={status.tone}>{status.label}</Badge>} />
      {row.status === 'rejected' && row.rejection_reason && (
        <FormAlert className="mb-6">
          <strong>Changes needed:</strong> {row.rejection_reason}
        </FormAlert>
      )}
      {row.pending_changes && isLive && <FormAlert tone="info" className="mb-6">You have changes waiting for review.</FormAlert>}
      <ListingWizard map={getMapConfig()} developments={await getOwnDevelopments()} id={row.id} step={step} values={values} media={media} isLive={isLive} reviewSlot={review} />
    </div>
  )
}
