import type { ReactNode } from 'react'
import type { Database } from '@/lib/database.types'
import { getLocationByPath } from '@/lib/data/reference'
import { searchOrganisations } from '@/lib/data/organisations'
import { directoryQuery, parseDirectoryParams, type DirectoryFilters, type RawParams } from '@/lib/directory-params'
import { Container } from '@/components/ui/Layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { DirectoryFiltersForm } from './DirectoryFilters'
import { OrgResults } from './OrgResults'

const PAGE_SIZE = 24
type OrgKind = Database['public']['Enums']['org_kind']

/** Shared layout for /suppliers, /agents and /developers. */
export async function DirectoryPage({
  path,
  title,
  intro,
  kinds,
  searchParams,
  crumb,
  defaultSort = 'verified',
  sorts,
  categories,
  categoryId,
  joinHref,
  joinLabel,
  noun,
  top,
}: {
  path: string
  title: string
  intro: string
  kinds: OrgKind[]
  searchParams: RawParams
  crumb: string
  defaultSort?: DirectoryFilters['sort']
  sorts: { value: string; label: string }[]
  categories?: { slug: string; name: string; id: string }[]
  categoryId?: (slug: string | undefined) => string | undefined
  joinHref: string
  joinLabel: string
  noun: [string, string]
  top?: ReactNode
}) {
  const f = parseDirectoryParams(searchParams, defaultSort)
  const location = f.loc ? await getLocationByPath(f.loc) : null
  const result = await searchOrganisations({
    q: f.q,
    kinds,
    locationId: location?.id,
    verifiedOnly: f.verified,
    productCategoryId: categoryId?.(f.category),
    sort: f.sort,
    page: f.page,
    pageSize: PAGE_SIZE,
  })
  return (
    <Container className="py-6 lg:py-10">
      <Breadcrumbs items={[{ label: crumb }]} />
      <h1 className="hl-h1 mt-4">{title}</h1>
      <p className="mt-2 max-w-3xl text-muted">{intro}</p>
      {top}
      <div className="mt-8 lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
        <aside className="mb-6 lg:mb-0" aria-label="Filters">
          <DirectoryFiltersForm action={path} filters={f} locationLabel={location?.display_name} categories={categories} sorts={sorts} />
        </aside>
        <OrgResults
          items={result.items}
          total={result.total}
          page={f.page}
          pageSize={PAGE_SIZE}
          hrefFor={(page) => `${path}${directoryQuery(f, { page }, defaultSort)}`}
          countLabel={result.total === 1 ? noun[0] : noun[1]}
          emptyTitle={`No ${noun[1]} match yet`}
          emptyDescription="Try a wider area, or remove a filter."
          joinHref={joinHref}
          joinLabel={joinLabel}
        />
      </div>
    </Container>
  )
}
