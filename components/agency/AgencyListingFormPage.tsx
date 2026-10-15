import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getPropertyByShortId } from '@/lib/data/properties'
import { getAgencyAvailability } from '@/lib/data/pillars'
import { shortIdFromSlug } from '@/lib/slug'
import { buildMetadata } from '@/lib/seo'
import { formatETB } from '@/lib/format'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container } from '@/components/ui/Layout'
import { ApplyForm, OfferForm, ViewingForm } from './AgencyForms'

export type AgencyFormKind = 'viewing' | 'offer' | 'apply'
const TITLE: Record<AgencyFormKind, string> = { viewing: 'Book a viewing', offer: 'Make an offer', apply: 'Apply to rent' }

async function load(slug: string, kind: AgencyFormKind) {
  const sid = shortIdFromSlug(slug)
  if (!sid) notFound()
  const p = await getPropertyByShortId(sid)
  if (!p || !p.id || !p.slug || p.lister_type !== 'hagerland' || p.is_hagerland) notFound()
  const agency = await getAgencyAvailability()
  if (p.purpose === 'sale' ? !agency.sales : !agency.lettings) notFound()
  if ((kind === 'offer' && p.purpose !== 'sale') || (kind === 'apply' && p.purpose !== 'rent')) notFound()
  if (slug !== p.slug) permanentRedirect(`/property/${p.slug}/${kind}`)
  return p
}

export async function agencyFormMetadata(slug: string, kind: AgencyFormKind): Promise<Metadata> {
  const p = await load(slug, kind)
  return buildMetadata({ title: `${TITLE[kind]}: ${p.title}`, description: `${TITLE[kind]} for ${p.title}, marketed by HagerLand.`, path: `/property/${p.slug}/${kind}`, noindex: true })
}

/** The viewing, offer and application forms for a listing HagerLand markets (spec 26.5). Not indexed. */
export async function AgencyListingFormPage({ slug, kind }: { slug: string; kind: AgencyFormKind }) {
  const p = await load(slug, kind)
  const price = p.price_etb && !p.price_on_request ? `${formatETB(p.price_etb)}${p.purpose === 'rent' ? ' /month' : ''}` : 'Price on request'
  return (
    <Container className="max-w-2xl py-10">
      <Breadcrumbs items={[{ label: 'Property', href: '/property' }, { label: p.title ?? 'Listing', href: `/property/${p.slug}` }, { label: TITLE[kind] }]} />
      <h1 className="hl-h1 mt-6">{TITLE[kind]}</h1>
      <p className="mt-2 text-muted">
        {p.title} · {p.location_name} · <span className="tabular-nums">{price}</span>
      </p>
      {kind === 'offer' && <p className="mt-4 rounded-md border border-border bg-stone-50 p-3 text-small">An offer here tells the owner what you would pay. It is an expression of interest only: it does not bind you or the owner, and nothing is agreed until a written sale agreement is signed.</p>}
      <div className="mt-6 rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">{kind === 'viewing' ? <ViewingForm propertyId={p.id!} /> : kind === 'offer' ? <OfferForm propertyId={p.id!} /> : <ApplyForm propertyId={p.id!} />}</div>
    </Container>
  )
}
