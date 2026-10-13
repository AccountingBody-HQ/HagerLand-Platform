import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { buildMetadata } from '@/lib/seo'
import { getProductCategories } from '@/lib/data/reference'
import { DirectoryPage } from '@/components/company/DirectoryPage'
import { brand } from '@/lib/brand'
import type { RawParams } from '@/lib/directory-params'

export const revalidate = 300
export const metadata = buildMetadata({
  title: 'Construction material suppliers in Ethiopia',
  description: 'Find suppliers, merchants and manufacturers of construction materials across Ethiopia. Filter by what they supply and where they deliver.',
  path: '/suppliers',
})

export default async function SuppliersPage({ searchParams }: { searchParams: RawParams }) {
  const categories = await getProductCategories()
  const flat = categories.map((c) => ({ slug: c.slug, name: c.name, id: c.id }))
  return (
    <DirectoryPage
      path="/suppliers"
      crumb="Suppliers"
      title="Construction material suppliers"
      intro="Suppliers, merchants and manufacturers of building materials, finishes and equipment."
      kinds={['supplier', 'manufacturer']}
      searchParams={searchParams}
      categories={flat}
      categoryId={(slug) => flat.find((c) => c.slug === slug)?.id}
      sorts={[
        { value: 'verified', label: 'Verified first' },
        { value: 'newest', label: 'Newest' },
      ]}
      joinHref="/list-with-us#suppliers"
      joinLabel="Become a supplier"
      noun={['supplier', 'suppliers']}
      top={
        <aside aria-label={`From ${brand.name}`} className="mt-6 flex flex-col justify-between gap-4 rounded-lg border border-gold/30 bg-gold-soft/50 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="hl-eyebrow text-gold-dark">From HagerLand</p>
            <p className="mt-1 font-semibold text-ink">{brand.divisions.supply}: send your materials list and get one clear quote.</p>
          </div>
          <Link href="/supplies" className="inline-flex min-h-11 items-center gap-1 font-semibold text-green-darker hover:underline">
            Browse supplies <ArrowRight className="size-4" aria-hidden />
          </Link>
        </aside>
      }
    />
  )
}
