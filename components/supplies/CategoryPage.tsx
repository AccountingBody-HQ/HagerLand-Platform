import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PackageSearch } from 'lucide-react'
import { getBrands, getProductCategories, type Category, type CategoryNode } from '@/lib/data/reference'
import { searchProducts } from '@/lib/data/products'
import { STOCK_LABEL, UNITS } from '@/lib/units'
import { Container, EmptyState } from '@/components/ui/Layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { ChipLink } from '@/components/ui/Chip'
import { Select } from '@/components/ui/Field'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { ProductCard } from './ProductCard'
import { QuoteListLink } from './QuoteListLink'

type Raw = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined
const PAGE_SIZE = 24

export async function resolveCategory(categorySlug: string, subSlug?: string): Promise<{ root: CategoryNode; sub: Category | null }> {
  const tree = await getProductCategories()
  const root = tree.find((c) => c.slug === categorySlug)
  if (!root) notFound()
  const sub = subSlug ? root.children.find((c) => c.slug === subSlug) ?? null : null
  if (subSlug && !sub) notFound()
  return { root, sub }
}

export async function CategoryPage({ categorySlug, subSlug, searchParams }: { categorySlug: string; subSlug?: string; searchParams: Raw }) {
  const { root, sub } = await resolveCategory(categorySlug, subSlug)
  const current = sub ?? root
  const brands = await getBrands()
  const brandSlug = one(searchParams.brand)
  const brandId = brands.find((b) => b.slug === brandSlug)?.id
  const stock = one(searchParams.stock)
  const unit = one(searchParams.unit)
  const sort = (['popular', 'price_asc', 'price_desc', 'newest'] as const).find((s) => s === one(searchParams.sort)) ?? 'popular'
  const page = Math.max(1, Number(one(searchParams.page)) || 1)
  const result = await searchProducts({
    categoryId: current.id,
    brandIds: brandId ? [brandId] : undefined,
    stock: stock && STOCK_LABEL[stock] ? [stock as 'in_stock'] : undefined,
    units: unit ? [unit] : undefined,
    sort,
    page,
    pageSize: PAGE_SIZE,
  })
  const base = `/supplies/${root.slug}${sub ? `/${sub.slug}` : ''}`
  const href = (p: number) => {
    const s = new URLSearchParams()
    if (brandSlug) s.set('brand', brandSlug)
    if (stock) s.set('stock', stock)
    if (unit) s.set('unit', unit)
    if (sort !== 'popular') s.set('sort', sort)
    if (p > 1) s.set('page', String(p))
    const out = s.toString()
    return `${base}${out ? `?${out}` : ''}`
  }

  return (
    <Container className="py-6 lg:py-10">
      <Breadcrumbs items={[{ label: 'Supplies', href: '/supplies' }, { label: root.name, href: sub ? `/supplies/${root.slug}` : undefined }, ...(sub ? [{ label: sub.name }] : [])]} />
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="hl-h1">{current.name}</h1>
          <p className="mt-2 max-w-3xl text-muted">{current.seo_intro ?? `${current.name} from HagerLand Supply. Add items to your quote list, or send your full materials list for one clear price with delivery in Addis Ababa.`}</p>
        </div>
        <QuoteListLink />
      </div>
      <nav aria-label="Subcategories" className="mt-5 flex flex-wrap gap-2">
        <ChipLink href={`/supplies/${root.slug}`} active={!sub}>
          All {root.name.toLowerCase()}
        </ChipLink>
        {root.children.map((c) => (
          <ChipLink key={c.id} href={`/supplies/${root.slug}/${c.slug}`} active={sub?.id === c.id}>
            {c.name}
          </ChipLink>
        ))}
      </nav>

      <form action={base} method="get" className="mt-6 grid grid-cols-2 gap-2 rounded-lg border border-border bg-white p-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <Select name="brand" aria-label="Brand" defaultValue={brandSlug ?? ''}>
          <option value="">Any brand</option>
          {brands.map((b) => (
            <option key={b.id} value={b.slug}>
              {b.name}
            </option>
          ))}
        </Select>
        <Select name="stock" aria-label="Availability" defaultValue={stock ?? ''}>
          <option value="">Any availability</option>
          {Object.entries(STOCK_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
        <Select name="unit" aria-label="Sold by" defaultValue={unit ?? ''}>
          <option value="">Any unit</option>
          {UNITS.map((u) => (
            <option key={u.value} value={u.value}>
              Per {u.label}
            </option>
          ))}
        </Select>
        <Select name="sort" aria-label="Sort" defaultValue={sort}>
          <option value="popular">Popular</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="newest">Newest</option>
        </Select>
        <Button type="submit" className="col-span-2 md:col-span-1">
          Apply
        </Button>
      </form>

      <p className="mb-4 mt-6 font-semibold">
        {result.total} {result.total === 1 ? 'product' : 'products'}
      </p>
      {result.items.length === 0 ? (
        <EmptyState
          icon={<PackageSearch />}
          title={`We haven't listed ${current.name.toLowerCase()} online yet`}
          description="We can still source it. Add it to your quote list as a custom item, or send your full materials list."
          actions={
            <>
              <ButtonLink href="/supplies/quote">Add a custom item</ButtonLink>
              <ButtonLink href="/supplies/materials-list" variant="secondary">
                Send your list
              </ButtonLink>
            </>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {result.items.map((p, i) => (
            <li key={p.id} className={i === 12 ? 'contents' : undefined}>
              {i === 12 && (
                <div className="col-span-full rounded-lg border border-dashed border-border-strong p-5 text-center">
                  Can&apos;t find it?{' '}
                  <Link href="/supplies/quote" className="font-semibold text-green underline">
                    Add it to your quote as a custom item
                  </Link>
                </div>
              )}
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      )}
      <Pagination className="mt-10" page={page} totalPages={Math.ceil(result.total / PAGE_SIZE)} hrefFor={href} />
    </Container>
  )
}
