import type { Metadata } from 'next'
import { CategoryPage, resolveCategory } from '@/components/supplies/CategoryPage'
import { buildMetadata, truncateDescription } from '@/lib/seo'

export const revalidate = 300
type Raw = Record<string, string | string[] | undefined>

export async function generateMetadata(
  props: { params: Promise<{ category: string }>; searchParams: Promise<Raw> }
): Promise<Metadata> {
  const searchParams = await props.searchParams
  const params = await props.params
  const { root } = await resolveCategory(params.category)
  const filtered = Object.keys(searchParams).length > 0
  return buildMetadata({ title: root.seo_title ?? `${root.name}: construction supplies`, description: truncateDescription(root.seo_intro ?? `Buy ${root.name.toLowerCase()} in Ethiopia from HagerLand Supply. Add items to a quote list and get one clear price with delivery in Addis Ababa.`), path: `/supplies/${root.slug}`, noindex: filtered })
}

export default async function Page(
  props: { params: Promise<{ category: string }>; searchParams: Promise<Raw> }
) {
  const searchParams = await props.searchParams
  const params = await props.params
  return <CategoryPage categorySlug={params.category} searchParams={searchParams} />
}
