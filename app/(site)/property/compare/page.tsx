import Link from 'next/link'
import { Columns3 } from 'lucide-react'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { buildMetadata } from '@/lib/seo'
import { formatArea, formatETB } from '@/lib/format'
import { propertyTypeLabel } from '@/lib/labels'
import { MediaImage } from '@/components/media/MediaImage'
import { Container, EmptyState } from '@/components/ui/Layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { ButtonLink } from '@/components/ui/Button'
import { CompareRemove } from '@/components/compare/CompareRemove'

export const dynamic = 'force-dynamic'
export const metadata = buildMetadata({ title: 'Compare properties', description: 'Compare up to four properties side by side.', path: '/property/compare', noindex: true })

const yesNo = (v: boolean | null) => (v === null ? '—' : v ? 'Yes' : 'No')
const label = (v: string | null) => (v ? v.replace(/_/g, ' ') : '—')

/** Side-by-side comparison of up to four live listings (spec 24.7). */
export default async function ComparePage(props: { searchParams: Promise<{ ids?: string }> }) {
  const searchParams = await props.searchParams
  const ids = Array.from(new Set((searchParams.ids ?? '').split(',').filter((x) => /^[0-9a-f-]{36}$/.test(x)))).slice(0, 4)
  // Public view only: compares live listings and never exposes private fields.
  const { data } = ids.length ? await getAdminSupabase().from('properties_public').select('*').in('id', ids) : { data: [] }
  const rows = ids.map((id) => (data ?? []).find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => Boolean(p))
  const fields: [string, (p: (typeof rows)[number]) => string][] = [
    ['Price', (p) => (p.price_on_request || p.price_etb === null ? 'Price on request' : `${formatETB(p.price_etb)}${p.price_period === 'month' ? ' /month' : ''}`)],
    ['For', (p) => (p.purpose === 'rent' ? 'Rent' : 'Sale')],
    ['Type', (p) => propertyTypeLabel(p.property_type)],
    ['Location', (p) => p.location_display ?? '—'],
    ['Bedrooms', (p) => (p.bedrooms ?? '—').toString()],
    ['Bathrooms', (p) => (p.bathrooms ?? '—').toString()],
    ['Floor area', (p) => (p.area_m2 ? formatArea(p.area_m2) : '—')],
    ['Plot area', (p) => (p.plot_area_m2 ? formatArea(p.plot_area_m2) : '—')],
    ['Building', (p) => p.floors_label ?? '—'],
    ['Finishing', (p) => label(p.finishing_status)],
    ['Furnishing', (p) => label(p.furnishing)],
    ['Tenure', (p) => label(p.tenure)],
    ['Title deed', (p) => yesNo(p.has_title_deed)],
    ['Completion', (p) => label(p.completion_status)],
    ['Parking', (p) => (p.parking_spaces ?? '—').toString()],
    ['Negotiable', (p) => yesNo(p.price_negotiable)],
    ['Features', (p) => (p.features?.length ? p.features.map((f) => f.replace(/_/g, ' ')).join(', ') : '—')],
    ['Listed by', (p) => p.lister_name ?? '—'],
  ]
  return (
    <Container className="py-8 lg:py-12">
      <Breadcrumbs items={[{ label: 'Property', href: '/property' }, { label: 'Compare' }]} />
      <h1 className="hl-h1 mt-4">Compare properties</h1>
      {rows.length === 0 ? (
        <EmptyState className="mt-8" icon={<Columns3 />} title="Nothing to compare yet" description="Tap “Compare” on up to four property pages, then come back here." actions={<ButtonLink href="/property/for-sale">Browse property</ButtonLink>} />
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border border-border bg-white" role="region" aria-label="Comparison" tabIndex={0}>
          <table className="w-full min-w-[640px] text-left text-small">
            <thead>
              <tr className="align-top">
                <th scope="col" className="w-36 p-3 text-muted">
                  <span className="sr-only">Detail</span>
                </th>
                {rows.map((p) => (
                  <th key={p.id} scope="col" className="p-3 font-normal">
                    {p.cover_path && (
                      <div className="relative mb-2 aspect-[4/3] w-full overflow-hidden rounded-md">
                        <MediaImage path={p.cover_path} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
                      </div>
                    )}
                    <Link href={`/property/${p.slug}`} className="font-semibold text-ink hover:underline">
                      {p.title}
                    </Link>
                    <CompareRemove id={p.id ?? ''} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {fields.map(([name, get]) => (
                <tr key={name}>
                  <th scope="row" className="p-3 font-semibold text-muted">
                    {name}
                  </th>
                  {rows.map((p) => (
                    <td key={p.id} className="p-3">
                      {get(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {ids.length > rows.length && <p className="mt-4 text-small text-muted">Some properties are no longer available and are not shown.</p>}
    </Container>
  )
}
