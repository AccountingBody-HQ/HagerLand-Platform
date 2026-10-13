import type { Metadata } from 'next'
import { CategoryPage, resolveCategory } from '@/components/supplies/CategoryPage'
import { buildMetadata, truncateDescription } from '@/lib/seo'

export const revalidate = 300
type Raw = Record<string, string | string[] | undefined>

export async function generateMetadata({ params, searchParams }: { params: { category: string }; searchParams: Raw }): Promise<Metadata> {
  const { root } = await resolveCategory(params.category)
  const filtered = Object.keys(searchParams).length > 0
  return buildMetadata({ title: root.seo_title ?? `${root.name}: construction supplies`, description: truncateDescription(root.seo_intro ?? `Buy ${root.name.toLowerCase()} in Ethiopia from HagerLand Supply. Add items to a quote list and get one clear price with delivery.`), path: `/supplies/${root.slug}`, noindex: filtered })
}

export default function Page({ params, searchParams }: { params: { category: string }; searchParams: Raw }) {
  return <CategoryPage categorySlug={params.category} searchParams={searchParams} />
}
