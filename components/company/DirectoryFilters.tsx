import Link from 'next/link'
import type { DirectoryFilters } from '@/lib/directory-params'
import { Combobox } from '@/components/ui/Combobox'
import { Input, Select } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'

/** Plain GET form so filters live in the URL (shareable, back-button safe, works without JavaScript). */
export function DirectoryFiltersForm({
  action,
  filters,
  locationLabel,
  showLocation = true,
  showPortfolio,
  showGrade,
  categories,
  sorts,
  searchLabel = 'Search by name',
}: {
  action: string
  filters: DirectoryFilters
  locationLabel?: string | null
  showLocation?: boolean
  showPortfolio?: boolean
  showGrade?: boolean
  categories?: { slug: string; name: string }[]
  sorts: { value: string; label: string }[]
  searchLabel?: string
}) {
  return (
    <form action={action} method="get" className="space-y-5 rounded-lg border border-border bg-white p-5">
      <div>
        <label htmlFor="d-q" className="mb-2 block text-small font-semibold">
          {searchLabel}
        </label>
        <Input id="d-q" name="q" type="search" defaultValue={filters.q} placeholder="Business name" />
      </div>
      {showLocation && (
        <div>
          <label htmlFor="d-loc" className="mb-2 block text-small font-semibold">
            Location
          </label>
          <Combobox id="d-loc" name="loc" endpoint="/api/locations?value=path&scope=all" placeholder="Anywhere" defaultValue={filters.loc ? { value: filters.loc, label: locationLabel ?? filters.loc } : null} />
        </div>
      )}
      {categories && (
        <div>
          <label htmlFor="d-cat" className="mb-2 block text-small font-semibold">
            Supplies
          </label>
          <Select id="d-cat" name="category" defaultValue={filters.category ?? ''}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      {showGrade && (
        <div>
          <label htmlFor="d-grade" className="mb-2 block text-small font-semibold">
            Licence grade
          </label>
          <Input id="d-grade" name="grade" defaultValue={filters.grade} placeholder="e.g. GC-3" />
        </div>
      )}
      <div className="space-y-1">
        <div className="flex min-h-10 items-center gap-2.5">
          <input id="d-verified" type="checkbox" name="verified" value="1" defaultChecked={filters.verified} className="size-5 accent-green" />
          <label htmlFor="d-verified">Verified businesses only</label>
        </div>
        {showPortfolio && (
          <div className="flex min-h-10 items-center gap-2.5">
            <input id="d-portfolio" type="checkbox" name="portfolio" value="1" defaultChecked={filters.portfolio} className="size-5 accent-green" />
            <label htmlFor="d-portfolio">Has a portfolio</label>
          </div>
        )}
      </div>
      <div>
        <label htmlFor="d-sort" className="mb-2 block text-small font-semibold">
          Sort by
        </label>
        <Select id="d-sort" name="sort" defaultValue={filters.sort}>
          {sorts.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex gap-2 [&>*]:flex-1">
        <Button type="submit">Apply</Button>
        <Link href={action} className="inline-flex h-11 items-center justify-center rounded-md border border-border-strong font-semibold hover:bg-stone-50">
          Clear
        </Link>
      </div>
    </form>
  )
}
