import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { searchAll, recordSearchMiss } from '@/lib/data/search'
import { searchProperties } from '@/lib/data/properties'
import { searchProducts } from '@/lib/data/products'
import { searchOrganisations } from '@/lib/data/organisations'
import { searchDevelopments } from '@/lib/data/developments'
import { buildMetadata } from '@/lib/seo'
import { Container, EmptyState } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { PropertyCard } from '@/components/property/PropertyCard'
import { ProductCard } from '@/components/supplies/ProductCard'
import { CompanyCard } from '@/components/company/CompanyCard'
import { DevelopmentCard } from '@/components/development/DevelopmentCard'
import { SearchPageForm } from '@/components/search/SearchPageForm'
import { cn } from '@/lib/cn'
import { getVerticals } from '@/lib/data/verticals'
import { isLive } from '@/lib/verticals'

export const dynamic = 'force-dynamic'
export const metadata = buildMetadata({ title: 'Search', description: 'Search property, developments, construction supplies and professionals on HagerLand.', path: '/search', noindex: true })

const VERTICALS = [
  { id: 'all', label: 'Everything' },
  { id: 'property', label: 'Property' },
  { id: 'developments', label: 'Developments' },
  { id: 'supplies', label: 'Supplies' },
  { id: 'companies', label: 'Companies' },
] as const
type Vertical = (typeof VERTICALS)[number]['id']
const PAGE_SIZE = 24

export default async function SearchPage({ searchParams }: { searchParams: { q?: string; vertical?: string; page?: string } }) {
  const q = (searchParams.q ?? '').trim().slice(0, 100)
  const registry = await getVerticals()
  const tabs = VERTICALS.filter((v) => (v.id === 'property' || v.id === 'developments' ? isLive(registry, 'property') : v.id === 'supplies' ? isLive(registry, 'building-supplies') : true))
  const vertical: Vertical = (tabs.find((v) => v.id === searchParams.vertical)?.id ?? 'all') as Vertical
  const page = Math.max(1, Number(searchParams.page) || 1)
  const counts = await searchAll(q, vertical === 'all' ? 4 : 1)
  const total = counts.properties.total + counts.developments.total + counts.products.total + counts.organisations.total
  // Places, services and categories count as results too (e.g. "bole" matches the Bole location).
  const anything = total > 0 || counts.locations.length > 0 || counts.services.length > 0 || counts.product_categories.length > 0
  if (q.length >= 2 && !anything) await recordSearchMiss(q, vertical)

  const tabCount: Record<Vertical, number> = { all: total, property: counts.properties.total, developments: counts.developments.total, supplies: counts.products.total, companies: counts.organisations.total }
  const href = (v: Vertical, p = 1) => `/search?q=${encodeURIComponent(q)}${v !== 'all' ? `&vertical=${v}` : ''}${p > 1 ? `&page=${p}` : ''}`

  const [props, devs, prods, orgs] = await Promise.all([
    vertical === 'property' ? searchProperties({ filters: { q, sort: 'relevance', page }, pageSize: PAGE_SIZE }) : null,
    vertical === 'developments' ? searchDevelopments({ q, page, pageSize: PAGE_SIZE }) : null,
    vertical === 'supplies' ? searchProducts({ q, page, pageSize: PAGE_SIZE }) : null,
    vertical === 'companies' ? searchOrganisations({ q, page, pageSize: PAGE_SIZE, anyCountry: true }) : null,
  ])
  const active = props ?? devs ?? prods ?? orgs

  return (
    <Container className="py-8 lg:py-12">
      <h1 className="hl-h1">{q ? `Results for “${q}”` : 'Search HagerLand'}</h1>
      <div className="mt-5 max-w-2xl">
        <SearchPageForm q={q} vertical={vertical} />
      </div>
      {q.length >= 2 && (
        <nav aria-label="Result types" className="-mx-4 mt-6 overflow-x-auto border-b border-border px-4">
          <ul className="flex gap-1">
            {tabs.map((v) => (
              <li key={v.id}>
                <Link href={href(v.id)} aria-current={v.id === vertical ? 'page' : undefined} className={cn('inline-flex min-h-12 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-small font-semibold', v.id === vertical ? 'border-green text-ink' : 'border-transparent text-muted hover:text-ink')}>
                  {v.label} <span className="tabular-nums text-muted">({tabCount[v.id]})</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {q.length < 2 ? (
        <p className="mt-8 text-muted">Type at least two letters, for example “apartment Bole”, “cement” or “architect”.</p>
      ) : !anything ? (
        <EmptyState
          className="mt-8"
          icon={<SearchX />}
          title={`No results for “${q}”`}
          description="Check the spelling, try a shorter search, or browse a section."
          actions={
            <>
              <ButtonLink href="/property">Browse property</ButtonLink>
              <ButtonLink href="/contact?topic=search" variant="secondary">
                Tell us what you need
              </ButtonLink>
            </>
          }
        />
      ) : vertical === 'all' ? (
        <div className="mt-8 space-y-12">
          {counts.locations.length > 0 && (
            <section>
              <h2 className="hl-h3 mb-3">Places</h2>
              <ul className="flex flex-wrap gap-2">
                {counts.locations.map((l) => (
                  <li key={l.id} className="flex gap-2">
                    <Link href={`/property/for-sale/${l.path}`} className="inline-flex min-h-10 items-center rounded-full border border-border-strong px-4 text-small font-medium hover:border-ink">
                      Property for sale in {l.display_name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {(counts.services.length > 0 || counts.product_categories.length > 0) && (
            <section>
              <h2 className="hl-h3 mb-3">Services and categories</h2>
              <ul className="flex flex-wrap gap-2">
                {counts.services.map((sv) => (
                  <li key={`s-${sv.slug}`}>
                    <Link href={`/professionals/${sv.slug}`} className="inline-flex min-h-10 items-center rounded-full border border-border-strong px-4 text-small font-medium hover:border-ink">
                      {sv.name} <span className="ml-1 text-muted">· Professionals</span>
                    </Link>
                  </li>
                ))}
                {counts.product_categories.map((c) => (
                  <li key={`c-${c.slug}`}>
                    <Link href={c.parent_slug ? `/supplies/${c.parent_slug}/${c.slug}` : `/supplies/${c.slug}`} className="inline-flex min-h-10 items-center rounded-full border border-border-strong px-4 text-small font-medium hover:border-ink">
                      {c.name} <span className="ml-1 text-muted">· Supplies</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {counts.properties.items.length > 0 && (
            <ResultGroup title="Property" more={href('property')} total={counts.properties.total}>
              {counts.properties.items.map((p) => <PropertyCard key={p.id} property={p} />)}
            </ResultGroup>
          )}
          {counts.developments.items.length > 0 && (
            <ResultGroup title="Developments" more={href('developments')} total={counts.developments.total}>
              {counts.developments.items.map((d) => <DevelopmentCard key={d.id} development={d} />)}
            </ResultGroup>
          )}
          {counts.products.items.length > 0 && (
            <ResultGroup title="Supplies" more={href('supplies')} total={counts.products.total}>
              {counts.products.items.map((p) => <ProductCard key={p.id} product={p} />)}
            </ResultGroup>
          )}
          {counts.organisations.items.length > 0 && (
            <ResultGroup title="Companies and professionals" more={href('companies')} total={counts.organisations.total}>
              {counts.organisations.items.map((o) => <CompanyCard key={o.id} org={o} />)}
            </ResultGroup>
          )}
        </div>
      ) : (
        <div className="mt-8">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {props?.items.map((p) => <li key={p.id}><PropertyCard property={p} /></li>)}
            {devs?.items.map((d) => <li key={d.id}><DevelopmentCard development={d} /></li>)}
            {prods?.items.map((p) => <li key={p.id}><ProductCard product={p} /></li>)}
            {orgs?.items.map((o) => <li key={o.id}><CompanyCard org={o} /></li>)}
          </ul>
          {active && <Pagination className="mt-10" page={page} totalPages={Math.ceil(active.total / PAGE_SIZE)} hrefFor={(p) => href(vertical, p)} />}
        </div>
      )}
    </Container>
  )
}

function ResultGroup({ title, more, total, children }: { title: string; more: string; total: number; children: React.ReactNode[] }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="hl-h3">{title}</h2>
        {total > children.length && (
          <Link href={more} className="text-small font-semibold text-green hover:underline">
            See all {total}
          </Link>
        )}
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {children.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
    </section>
  )
}
