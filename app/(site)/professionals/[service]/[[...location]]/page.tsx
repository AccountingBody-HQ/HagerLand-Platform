import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getLocationByPath, getLocationChain, getServiceCategories, getSettingNumber, type Category, type CategoryNode, type Location } from '@/lib/data/reference'
import { searchOrganisations } from '@/lib/data/organisations'
import { directoryQuery, hasDirectoryFilters, parseDirectoryParams, type RawParams } from '@/lib/directory-params'
import { buildMetadata, truncateDescription } from '@/lib/seo'
import { Container } from '@/components/ui/Layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { ChipLink } from '@/components/ui/Chip'
import { DirectoryFiltersForm } from '@/components/company/DirectoryFilters'
import { OrgResults } from '@/components/company/OrgResults'
import { RequestCta } from '@/components/service-requests/RequestCta'

export const revalidate = 300
const PAGE_SIZE = 24

interface Ctx {
  service: Category
  group: CategoryNode | null
  node: CategoryNode | null
  location: Location | null
  chain: Location[]
}

async function resolve(params: { service: string; location?: string[] }): Promise<Ctx> {
  const tree = await getServiceCategories()
  let found: Ctx | null = null
  for (const g of tree) {
    if (g.slug === params.service) found = { service: g, group: null, node: g, location: null, chain: [] }
    const c = g.children.find((x) => x.slug === params.service)
    if (c) found = { service: c, group: g, node: null, location: null, chain: [] }
  }
  if (!found) notFound()
  if (params.location?.length) {
    const loc = await getLocationByPath(params.location.join('/').toLowerCase())
    if (!loc) notFound()
    found.location = loc
    found.chain = await getLocationChain(loc.id)
  }
  return found
}

function place(ctx: Ctx): string {
  if (!ctx.location) return 'Ethiopia'
  const city = ctx.chain.slice(0, -1).reverse().find((l) => l.level === 'city' || l.level === 'region')
  return city && city.name !== ctx.location.name ? `${ctx.location.name}, ${city.name}` : ctx.location.name
}

export async function generateMetadata({ params, searchParams }: { params: { service: string; location?: string[] }; searchParams: RawParams }): Promise<Metadata> {
  const ctx = await resolve(params)
  const f = parseDirectoryParams(searchParams)
  const base = `/professionals/${ctx.service.slug}${ctx.location ? `/${ctx.location.path}` : ''}`
  const result = await searchOrganisations({ serviceId: ctx.service.id, locationId: ctx.location?.id, pageSize: 1 })
  const min = await getSettingNumber('min_results_for_index', 3)
  return buildMetadata({
    title: `${ctx.service.seo_title ?? ctx.service.name} in ${place(ctx)} — verified professionals${f.page > 1 ? ` – Page ${f.page}` : ''}`,
    description: truncateDescription(ctx.service.seo_intro ?? `Find ${ctx.service.name.toLowerCase()} in ${place(ctx)}. Compare portfolios, check verification and contact businesses directly on HagerLand.`),
    path: hasDirectoryFilters({ ...f, page: 1 }) ? base : `${base}${f.page > 1 ? `?page=${f.page}` : ''}`,
    noindex: Boolean(ctx.location) && result.total < min,
  })
}

export default async function ServicePage({ params, searchParams }: { params: { service: string; location?: string[] }; searchParams: RawParams }) {
  const ctx = await resolve(params)
  const f = parseDirectoryParams(searchParams)
  const base = `/professionals/${ctx.service.slug}${ctx.location ? `/${ctx.location.path}` : ''}`
  const isContracting = (ctx.group?.slug ?? ctx.service.slug) === 'building-contracting'
  const result = await searchOrganisations({
    serviceId: ctx.service.id,
    locationId: ctx.location?.id,
    verifiedOnly: f.verified,
    hasPortfolio: f.portfolio,
    licenceGrade: isContracting ? f.grade : undefined,
    q: f.q,
    sort: f.sort,
    page: f.page,
    pageSize: PAGE_SIZE,
  })
  const intro = ctx.location?.seo_intro_professionals || ctx.service.seo_intro
  const crumbs = [
    { label: 'Professionals', href: '/professionals' },
    ...(ctx.group ? [{ label: ctx.group.name, href: `/professionals/${ctx.group.slug}` }] : []),
    { label: ctx.service.name, href: ctx.location ? `/professionals/${ctx.service.slug}` : undefined },
    ...ctx.chain.map((l, i) => ({ label: l.name, href: i < ctx.chain.length - 1 ? `/professionals/${ctx.service.slug}/${l.path}` : undefined })),
  ]

  return (
    <Container className="py-6 lg:py-10">
      <Breadcrumbs items={crumbs} />
      <h1 className="hl-h1 mt-4">
        {ctx.service.name} in {place(ctx)}
      </h1>
      <p className="mt-2 max-w-3xl text-muted">
        {intro ??
          (result.total > 0
            ? `${result.total} ${result.total === 1 ? 'business offers' : 'businesses offer'} ${ctx.service.name.toLowerCase()} in ${place(ctx)} on HagerLand. Verified businesses have had their trade licence checked by our team.`
            : `We're adding ${ctx.service.name.toLowerCase()} in ${place(ctx)}. Tell us what you need and we'll help you find someone.`)}
      </p>
      {ctx.node && ctx.node.children.length > 0 && (
        <nav aria-label="Services" className="mt-5 flex flex-wrap gap-2">
          {ctx.node.children.map((c) => (
            <ChipLink key={c.slug} href={`/professionals/${c.slug}${ctx.location ? `/${ctx.location.path}` : ''}`}>
              {c.name}
            </ChipLink>
          ))}
        </nav>
      )}
      <div className="mt-6">
        <RequestCta serviceSlug={ctx.service.slug} serviceName={ctx.service.name} abroad={Boolean(ctx.location && ctx.location.country_code !== 'ET')} />
      </div>
      <div className="mt-8 lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
        <aside className="mb-6 lg:mb-0" aria-label="Filters">
          <DirectoryFiltersForm
            action={base}
            filters={f}
            showLocation={false}
            showPortfolio
            showGrade={isContracting}
            sorts={[
              { value: 'verified', label: 'Verified first' },
              { value: 'projects', label: 'Most projects' },
              { value: 'newest', label: 'Newest' },
            ]}
          />
        </aside>
        <OrgResults
          items={result.items}
          total={result.total}
          page={f.page}
          pageSize={PAGE_SIZE}
          hrefFor={(page) => `${base}${directoryQuery(f, { page })}`}
          countLabel={`${result.total === 1 ? 'business' : 'businesses'} found`}
          emptyTitle={`No ${ctx.service.name.toLowerCase()} listed here yet`}
          emptyDescription="We're growing city by city. Widen your search, or tell us what you need and we'll help."
          joinHref="/list-with-us#professionals"
          joinLabel="List your business"
        />
      </div>
    </Container>
  )
}
