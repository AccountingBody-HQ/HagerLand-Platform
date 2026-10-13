import { Building2 } from 'lucide-react'
import { searchDevelopments } from '@/lib/data/developments'
import { getLocationByPath } from '@/lib/data/reference'
import { buildMetadata } from '@/lib/seo'
import { COMPLETION } from '@/lib/labels'
import { brand } from '@/lib/brand'
import { Container, EmptyState } from '@/components/ui/Layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Combobox } from '@/components/ui/Combobox'
import { Select } from '@/components/ui/Field'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { DevelopmentCard } from '@/components/development/DevelopmentCard'

export const revalidate = 300
const PAGE_SIZE = 24

export const metadata = buildMetadata({
  title: 'New developments in Ethiopia',
  description: 'Browse new-build and off-plan developments, condominium sites and buildings across Ethiopia. See unit types, prices, payment plans and progress.',
  path: '/developments',
})

type Raw = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined

export default async function DevelopmentsPage({ searchParams }: { searchParams: Raw }) {
  const loc = one(searchParams.loc)
  const completion = one(searchParams.completion)
  const kind = one(searchParams.kind)
  const priceMax = Number(one(searchParams.price_max)) || undefined
  const page = Math.max(1, Number(one(searchParams.page)) || 1)
  const location = loc ? await getLocationByPath(loc) : null
  const completionFilter = COMPLETION.find((c) => c.value === completion)?.value
  const kindFilter = (['development', 'condominium_site', 'building', 'compound', 'mixed_use_project'] as const).find((k) => k === kind)
  const filtered = Boolean(loc || completionFilter || kindFilter || priceMax)
  const [own, result] = await Promise.all([
    filtered || page > 1 ? Promise.resolve({ total: 0, items: [] }) : searchDevelopments({ isHagerland: true, pageSize: 3 }),
    searchDevelopments({ locationId: location?.id, completion: completionFilter ? [completionFilter] : undefined, kinds: kindFilter ? [kindFilter] : undefined, priceMax, page, pageSize: PAGE_SIZE }),
  ])
  const qs = (p: number) => {
    const s = new URLSearchParams()
    if (loc) s.set('loc', loc)
    if (completionFilter) s.set('completion', completionFilter)
    if (kindFilter) s.set('kind', kindFilter)
    if (priceMax) s.set('price_max', String(priceMax))
    if (p > 1) s.set('page', String(p))
    const out = s.toString()
    return `/developments${out ? `?${out}` : ''}`
  }

  return (
    <Container className="py-6 lg:py-10">
      <Breadcrumbs items={[{ label: 'Developments' }]} />
      <h1 className="hl-h1 mt-4">New developments</h1>
      <p className="mt-2 max-w-3xl text-muted">New-build and off-plan projects, condominium sites and buildings across Ethiopia. Before you buy off-plan, check the developer&apos;s licence and the project&apos;s permits.</p>

      <form action="/developments" method="get" className="mt-6 grid gap-3 rounded-lg border border-border bg-white p-4 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
        <div>
          <label htmlFor="dv-f-loc" className="sr-only">
            Location
          </label>
          <Combobox id="dv-f-loc" name="loc" endpoint="/api/locations?value=path" placeholder="Any location" defaultValue={location ? { value: location.path, label: location.display_name } : null} />
        </div>
        <Select name="completion" aria-label="Status" defaultValue={completionFilter ?? ''}>
          <option value="">Any status</option>
          {COMPLETION.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
        <Select name="kind" aria-label="Type" defaultValue={kindFilter ?? ''}>
          <option value="">Any type</option>
          <option value="development">Developments</option>
          <option value="condominium_site">Condominium sites</option>
          <option value="building">Buildings</option>
          <option value="compound">Compounds</option>
          <option value="mixed_use_project">Mixed-use</option>
        </Select>
        <Select name="price_max" aria-label="Maximum starting price" defaultValue={priceMax ? String(priceMax) : ''}>
          <option value="">Any price</option>
          {[2_000_000, 4_000_000, 6_000_000, 10_000_000, 20_000_000].map((p) => (
            <option key={p} value={p}>
              From under ETB {p / 1_000_000}M
            </option>
          ))}
        </Select>
        <Button type="submit">Search</Button>
      </form>

      {own.items.length > 0 && (
        <section aria-labelledby="own-heading" className="mt-8 rounded-xl border border-gold/30 bg-gold-soft/40 p-5">
          <h2 id="own-heading" className="hl-eyebrow text-gold-dark">
            From {brand.name}: {brand.divisions.developments}
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {own.items.map((d) => (
              <li key={d.id}>
                <DevelopmentCard development={d} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mb-4 mt-8 font-semibold">
        {result.total} {result.total === 1 ? 'development' : 'developments'}
      </p>
      {result.items.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title="No developments match yet"
          description="We're adding developments and buildings across Ethiopia. Developers can add theirs for free."
          actions={
            <>
              <ButtonLink href="/developments">Clear filters</ButtonLink>
              <ButtonLink href="/list-with-us#developers" variant="secondary">
                Add your development
              </ButtonLink>
            </>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((d) => (
            <li key={d.id}>
              <DevelopmentCard development={d} />
            </li>
          ))}
        </ul>
      )}
      <Pagination className="mt-10" page={page} totalPages={Math.ceil(result.total / PAGE_SIZE)} hrefFor={qs} />
    </Container>
  )
}
