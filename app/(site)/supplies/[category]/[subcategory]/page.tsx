import type { Metadata } from 'next'
import { CategoryPage, resolveCategory } from '@/components/supplies/CategoryPage'
import { buildMetadata, truncateDescription } from '@/lib/seo'

export const revalidate = 300
type Raw = Record<string, string | string[] | undefined>

export async function generateMetadata({ params, searchParams }: { params: { category: string; subcategory: string }; searchParams: Raw }): Promise<Metadata> {
  const { root, sub } = await resolveCategory(params.category, params.subcategory)
  const name = sub?.name ?? root.name
  return buildMetadata({ title: sub?.seo_title ?? `${name} — ${root.name}`, description: truncateDescription(sub?.seo_intro ?? `${name} from HagerLand Supply. Add to your quote list for a clear price with delivery anywhere we deliver.`), path: `/supplies/${root.slug}/${sub?.slug}`, noindex: Object.keys(searchParams).length > 0 })
}

export default function Page({ params, searchParams }: { params: { category: string; subcategory: string }; searchParams: Raw }) {
  return <CategoryPage categorySlug={params.category} subSlug={params.subcategory} searchParams={searchParams} />
}
