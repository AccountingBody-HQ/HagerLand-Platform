import Link from 'next/link'
import { CalendarClock, Check, Download, Layers } from 'lucide-react'
import type { PublicDevelopment } from '@/lib/data/developments'
import { parseUnitTypes } from '@/lib/data/developments'
import { getEntityMedia, searchProperties } from '@/lib/data/properties'
import { searchDevelopments } from '@/lib/data/developments'
import { COMPLETION_LABEL, DEVELOPMENT_KIND_LABEL } from '@/lib/development-labels'
import { FINISHING, TENURE, labelOf } from '@/lib/labels'
import { formatArea, formatDate, formatETB } from '@/lib/format'
import { youtubeEmbedUrl } from '@/lib/youtube'
import { developmentIntents } from '@/lib/intents'
import { brand } from '@/lib/brand'
import { Gallery } from '@/components/media/Gallery'
import { KeyFacts } from '@/components/property/KeyFacts'
import { MapBlock } from '@/components/property/MapBlock'
import { SafetyTips } from '@/components/property/SafetyTips'
import { PropertyCard } from '@/components/property/PropertyCard'
import { ContactPanel } from '@/components/enquiry/ContactPanel'
import { ExpandableText } from '@/components/ui/ExpandableText'
import { Badge } from '@/components/ui/Badge'
import { DevelopmentCard } from './DevelopmentCard'
import { VerificationBadge } from '@/components/company/VerificationBadge'
import { getOrganisationBySlug } from '@/lib/data/organisations'
import { getBusinessDetails } from '@/lib/data/business'
import { ApproxPrice } from '@/components/currency/ApproxPrice'
import { SaveButton } from '@/components/saved/SaveButton'
import { FinanceAsk } from '@/components/verticals/FinanceAsk'

/** Shared body for third-party developments and HagerLand's own projects (premium variant). */
export async function DevelopmentDetail({ d, premium }: { d: PublicDevelopment; premium?: boolean }) {
  const id = d.id as string
  const [media, units, others] = await Promise.all([
    getEntityMedia('development', id),
    searchProperties({ developmentId: id, pageSize: 12 }),
    d.developer_org_id ? searchDevelopments({ developerOrgId: d.developer_org_id, excludeId: id, pageSize: 3 }) : Promise.resolve({ total: 0, items: [] }),
  ])
  const images = media.filter((m) => m.kind === 'image').map((m, i) => ({ path: m.storage_path ?? '', alt: m.alt ?? `${d.name}: photo ${i + 1}`, width: m.width, height: m.height }))
  const plans = media.filter((m) => m.kind === 'floorplan').map((m, i) => ({ path: m.storage_path ?? '', alt: m.alt ?? `${d.name}: plan ${i + 1}`, width: m.width, height: m.height }))
  const unitTypes = parseUnitTypes(d.unit_types)
  const developer = !d.is_hagerland && d.developer_slug ? await getOrganisationBySlug(d.developer_slug) : null
  const { contact } = await getBusinessDetails()
  const channels = d.is_hagerland
    ? { phone: Boolean(contact.phone), whatsapp: Boolean(contact.whatsapp), telegram: Boolean(contact.telegram) }
    : { phone: Boolean(developer?.has_phone), whatsapp: Boolean(developer?.has_whatsapp), telegram: Boolean(developer?.has_telegram) }
  const developerLabel = d.is_hagerland ? brand.divisions.developments : d.developer_name ?? 'the developer'
  const priceText = d.price_from_etb ? (d.price_to_etb && d.price_to_etb > d.price_from_etb ? `${formatETB(d.price_from_etb)} – ${formatETB(d.price_to_etb)}` : `From ${formatETB(d.price_from_etb)}`) : 'Price on request'

  return (
    <>
      <div className="mt-5">
        <Gallery images={images} floorplans={plans} videoEmbed={youtubeEmbedUrl(d.video_url)} aspect="aspect-[16/9]" />
      </div>
      <div className="mt-8 lg:grid lg:grid-cols-[1fr_380px] lg:gap-10">
        <div className="min-w-0 space-y-10">
          <header>
            <div className="flex flex-wrap gap-2">
              {d.is_hagerland && <Badge tone="gold">{brand.divisions.developments}</Badge>}
              {d.completion_status && <Badge tone="neutral">{COMPLETION_LABEL[d.completion_status]}</Badge>}
              <Badge tone="outline">{DEVELOPMENT_KIND_LABEL[d.kind ?? ''] ?? 'Development'}</Badge>
            </div>
            <h1 className={premium ? 'hl-display mt-3' : 'hl-h1 mt-3'}>{d.name}</h1>
            <p className="mt-2 text-muted">{d.location_display}</p>
            <p className="mt-4 font-display text-h2 font-bold tabular-nums">{priceText}</p>
            <SaveButton entityType="development" entityId={id} className="mt-3" />
            <div className="mt-4">
              <FinanceAsk categorySlug="mortgages" text="Mortgages and payment options through licensed partners." />
            </div>
            {d.price_from_etb ? <ApproxPrice etb={d.price_from_etb} className="block" /> : null}
            {!d.is_hagerland && d.developer_name && (
              <p className="mt-3 flex flex-wrap items-center gap-2 text-small">
                By{' '}
                <Link href={`/company/${d.developer_slug}`} className="font-semibold text-green hover:underline">
                  {d.developer_name}
                </Link>
                <VerificationBadge level={d.developer_verification} />
              </p>
            )}
            {d.summary && <p className="mt-4 text-[1.0625rem] text-ink">{d.summary}</p>}
          </header>

          <KeyFacts
            facts={[
              { label: 'Status', value: d.completion_status ? COMPLETION_LABEL[d.completion_status] : null },
              { label: 'Expected completion', value: d.expected_completion && d.completion_status !== 'ready' ? formatDate(d.expected_completion) : null },
              { label: 'Completed', value: d.completed_year },
              { label: 'Building height', value: d.floors_label },
              { label: 'Total units', value: d.total_units },
              { label: 'Finishing', value: labelOf(FINISHING, d.finishing_status) },
              { label: 'Tenure', value: labelOf(TENURE, d.tenure) },
            ]}
          />

          {unitTypes.length > 0 && (
            <section aria-labelledby="units-heading">
              <h2 id="units-heading" className="hl-h3 mb-4">
                Unit types
              </h2>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[520px] text-left text-small">
                  <thead className="bg-stone-50 text-muted">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Type</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Bedrooms</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Size</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Price from</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {unitTypes.map((u, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 font-semibold">{u.type}</td>
                        <td className="px-4 py-3">{u.beds ?? '—'}</td>
                        <td className="px-4 py-3 tabular-nums">{u.area_min ? `${formatArea(u.area_min)}${u.area_max && u.area_max !== u.area_min ? ` – ${formatArea(u.area_max)}` : ''}` : '—'}</td>
                        <td className="px-4 py-3 tabular-nums">{u.price_from_etb ? formatETB(u.price_from_etb) : 'On request'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {d.payment_plan && (
            <section aria-labelledby="pay-heading" className="rounded-lg bg-stone-50 p-5">
              <h2 id="pay-heading" className="hl-h3 mb-2">
                Payment plan
              </h2>
              <p className="whitespace-pre-line">{d.payment_plan}</p>
            </section>
          )}

          {d.description && (
            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className="hl-h3 mb-3">
                About this development
              </h2>
              <ExpandableText text={d.description} />
            </section>
          )}

          {d.amenities && d.amenities.length > 0 && (
            <section aria-labelledby="amen-heading">
              <h2 id="amen-heading" className="hl-h3 mb-4">
                Amenities
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {d.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-2.5">
                    <Check className="size-5 text-green" aria-hidden /> {a}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {d.brochure_path && (
            <a href={`/developments/${d.slug}/brochure`} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border-strong px-4 font-semibold hover:bg-stone-50" rel="nofollow">
              <Download className="size-5" aria-hidden /> Download brochure (PDF)
            </a>
          )}

          <section aria-labelledby="loc-heading">
            <h2 id="loc-heading" className="hl-h3 mb-3">
              Location
            </h2>
            <p>{d.address_line ? `${d.address_line}, ${d.location_display}` : d.location_display}</p>
            {d.lat && d.lng && (
              <div className="mt-4">
                <MapBlock lat={Number(d.lat)} lng={Number(d.lng)} exact label={d.name ?? ''} />
              </div>
            )}
          </section>

          {units.items.length > 0 && (
            <section aria-labelledby="listings-heading">
              <h2 id="listings-heading" className="hl-h3 mb-4">
                Available in this development ({units.total})
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {units.items.map((p) => (
                  <li key={p.id}>
                    <PropertyCard property={p} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!premium && (
            <section className="rounded-lg border border-dashed border-border-strong p-5">
              <h2 className="font-semibold">Own or rent in {d.name}?</h2>
              <p className="mt-1 text-small text-muted">List your unit for sale or rent. It will appear here and in search.</p>
              <Link href="/account/listings/new" className="mt-3 inline-flex min-h-11 items-center font-semibold text-green hover:underline">
                List your property
              </Link>
            </section>
          )}

          <SafetyTips variant={d.completion_status === 'ready' ? 'property' : 'offplan'} />

          {others.items.length > 0 && (
            <section aria-labelledby="track-heading">
              <h2 id="track-heading" className="hl-h3 mb-4">
                More from {d.developer_name}
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {others.items.map((o) => (
                  <li key={o.id}>
                    <DevelopmentCard development={o} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="mt-10 lg:mt-0">
          <div className="space-y-4 lg:sticky lg:top-24">
            {d.expected_completion && d.completion_status !== 'ready' && (
              <p className="flex items-center gap-2 rounded-lg bg-stone-50 p-4 text-small">
                <CalendarClock className="size-5 text-green" aria-hidden /> Expected completion {formatDate(d.expected_completion)}
              </p>
            )}
            <ContactPanel
              revealTarget={{ type: 'development', id }}
              enquiryTarget={{ type: d.is_hagerland ? 'hagerland_development' : 'development', id, recipientLabel: developerLabel }}
              intents={developmentIntents(d.name ?? 'this development')}
              lister={{ name: developerLabel, href: d.is_hagerland ? '/our-developments' : d.developer_slug ? `/company/${d.developer_slug}` : null, verified: d.is_hagerland || d.developer_verification === 'verified', subtitle: d.is_hagerland ? 'Built by HagerLand' : 'Developer' }}
              channels={channels}
              reportTarget={d.is_hagerland ? undefined : { type: 'development', id }}
              mobileBar
            />
            {d.floors_label && (
              <p className="flex items-center gap-2 text-small text-muted">
                <Layers className="size-4" aria-hidden /> {d.floors_label}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
