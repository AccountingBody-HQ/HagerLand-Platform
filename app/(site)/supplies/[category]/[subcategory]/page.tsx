import type { Metadata } from 'next'
import { CategoryPage, resolveCategory } from '@/components/supplies/CategoryPage'
import { buildMetadata, truncateDescription } from '@/lib/seo'

export const revalidate = 300
type Raw = Record<string, string | string[] | undefined>

export async function generateMetadata(
  props: { params: Promise<{ category: string; subcategory: string }>; searchParams: Promise<Raw> }
): Promise<Metadata> {
  const searchParams = await props.searchParams
  const params = await props.params
  const { root, sub } = await resolveCategory(params.category, params.subcategory)
  const name = sub?.name ?? root.name
  return buildMetadata({ title: sub?.seo_title ?? `${name} — ${root.name}`, description: truncateDescription(sub?.seo_intro ?? `${name} from HagerLand Supply. Add to your quote list for a clear price with delivery in Addis Ababa.`), path: `/supplies/${root.slug}/${sub?.slug}`, noindex: Object.keys(searchParams).length > 0 })
}

export default async function Page(
  props: { params: Promise<{ category: string; subcategory: string }>; searchParams: Promise<Raw> }
) {
  const searchParams = await props.searchParams
  const params = await props.params
  return <CategoryPage categorySlug={params.category} subSlug={params.subcategory} searchParams={searchParams} />
}
