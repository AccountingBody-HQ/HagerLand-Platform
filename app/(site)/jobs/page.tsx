import { notFound } from 'next/navigation'
import { Search } from 'lucide-react'
import { buildMetadata } from '@/lib/seo'
import { getVertical } from '@/lib/data/verticals'
import { searchJobs } from '@/lib/data/jobs'
import { getLocationByPath } from '@/lib/data/reference'
import { EMPLOYMENT_TYPES, JOB_CATEGORIES, categoryLabel } from '@/lib/jobs'
import { pluralise } from '@/lib/format'
import { verticalLandingMetadata } from '@/components/verticals/ComingSoonPage'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container, Section } from '@/components/ui/Layout'
import { ButtonLink, Button } from '@/components/ui/Button'
import { Combobox } from '@/components/ui/Combobox'
import { Input, Select } from '@/components/ui/Field'
import { Pagination } from '@/components/ui/Pagination'
import { JobCard } from '@/components/jobs/JobCard'

export const revalidate = 300

type Params = { q?: string; category?: string; type?: string; loc?: string; page?: string }

function clean(sp: Params) {
  return {
    q: sp.q?.trim().slice(0, 100) || undefined,
    category: JOB_CATEGORIES.some((c) => c.value === sp.category) ? sp.category : undefined,
    type: EMPLOYMENT_TYPES.some((t) => t.value === sp.type) ? sp.type : undefined,
    loc: sp.loc && /^[a-z0-9/-]{1,200}$/.test(sp.loc) ? sp.loc : undefined,
    page: Math.min(500, Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1)),
  }
}

export async function generateMetadata(props: { searchParams: Promise<Params> }) {
  const searchParams = await props.searchParams
  const f = clean(searchParams)
  const filtered = Boolean(f.q || f.category || f.type || f.loc || f.page > 1)
  return verticalLandingMetadata('jobs', () =>
    buildMetadata({
      title: f.category ? `${categoryLabel(f.category)} jobs` : 'Jobs in construction, engineering and property',
      description: 'Vacancies from construction, engineering, architecture, property and trades employers in Ethiopia and abroad. Apply with your CV on HagerLand.',
      path: '/jobs',
      noindex: filtered,
    }),
  )
}

/** Live job board (spec 24.9). While the vertical is coming soon, the layout shows the coming-soon landing instead. */
export default async function JobsPage(props: { searchParams: Promise<Params> }) {
  const searchParams = await props.searchParams
  const v = await getVertical('jobs')
  if (!v || v.status !== 'live') notFound()
  const f = clean(searchParams)
  const [{ items, total }, loc] = await Promise.all([searchJobs({ q: f.q, category: f.category, type: f.type, location: f.loc, page: f.page }), f.loc ? getLocationByPath(f.loc) : Promise.resolve(null)])
  const totalPages = Math.ceil(total / 20)
  const hrefFor = (page: number) => {
    const qs = new URLSearchParams(Object.entries({ q: f.q, category: f.category, type: f.type, loc: f.loc, page: page > 1 ? String(page) : undefined }).filter((e): e is [string, string] => Boolean(e[1])))
    const s = qs.toString()
    return s ? `/jobs?${s}` : '/jobs'
  }
  const filtered = Boolean(f.q || f.category || f.type || f.loc)
  return (
    <>
      <section className="hl-blueprint bg-ink text-white">
        <Container className="py-12 sm:py-16">
          <Breadcrumbs inverse items={[{ label: v.name }]} />
          <h1 className="hl-h1 mt-8 max-w-3xl text-white">Jobs in construction, engineering and property</h1>
          <p className="mt-4 max-w-2xl text-[1.0625rem] text-white/80">Vacancies from employers in Ethiopia and abroad. Apply with your CV, or create a profile and choose whether employers can find you.</p>
          <div className="mt-8 grid gap-3 sm:max-w-xl sm:grid-cols-2">
            <ButtonLink href="/account/jobs/new" variant="gold" size="lg" className="w-full">
              Post a job
            </ButtonLink>
            <ButtonLink href="/account/candidate" variant="outline-inverse" size="lg" className="w-full">
              Create a candidate profile
            </ButtonLink>
          </div>
        </Container>
      </section>
      <Section>
        <div className="lg:grid lg:grid-cols-[300px_1fr] lg:gap-10">
          <aside>
            <form action="/jobs" method="get" className="space-y-5 rounded-lg border border-border bg-white p-5">
              <div>
                <label htmlFor="j-q" className="mb-2 block text-small font-semibold">
                  Keywords
                </label>
                <Input id="j-q" name="q" type="search" defaultValue={f.q} placeholder="e.g. site engineer" />
              </div>
              <div>
                <label htmlFor="j-loc" className="mb-2 block text-small font-semibold">
                  Location
                </label>
                <Combobox id="j-loc" name="loc" endpoint="/api/locations?value=path&scope=all" placeholder="Anywhere" defaultValue={f.loc ? { value: f.loc, label: loc?.display_name ?? f.loc } : null} />
              </div>
              <div>
                <label htmlFor="j-cat" className="mb-2 block text-small font-semibold">
                  Category
                </label>
                <Select id="j-cat" name="category" defaultValue={f.category ?? ''}>
                  <option value="">All categories</option>
                  {JOB_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label htmlFor="j-type" className="mb-2 block text-small font-semibold">
                  Type of job
                </label>
                <Select id="j-type" name="type" defaultValue={f.type ?? ''}>
                  <option value="">Any type</option>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" className="w-full">
                <Search /> Search jobs
              </Button>
            </form>
            <div className="mt-5 rounded-lg border border-gold/30 bg-gold-soft/40 p-5">
              <h2 className="font-semibold text-ink">Need help hiring?</h2>
              <p className="mt-1 text-small text-muted">Tell us which roles you need to fill and we will help you find people.</p>
              <ButtonLink href="/request-service/staffing" variant="secondary" size="sm" className="mt-3 w-full">
                Submit a staffing requirement
              </ButtonLink>
            </div>
          </aside>
          <div className="mt-8 min-w-0 lg:mt-0">
            <p className="mb-4 text-muted" role="status">
              {total > 0 ? `${pluralise(total, 'job')}${filtered ? ' match your search' : ' open now'}` : ''}
            </p>
            {items.length > 0 ? (
              <ul className="space-y-3">
                {items.map((j) => (
                  <li key={j.id}>
                    <JobCard job={j} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-lg border border-dashed border-border-strong bg-white p-8 text-center">
                <h2 className="hl-h3">{filtered ? 'No jobs match your search' : 'No jobs are open right now'}</h2>
                <p className="mx-auto mt-2 max-w-md text-muted">{filtered ? 'Try fewer filters or a different place.' : 'New vacancies appear here as soon as we have approved them. Create a candidate profile so employers can find you.'}</p>
                {filtered && (
                  <ButtonLink href="/jobs" variant="secondary" className="mt-4">
                    Clear search
                  </ButtonLink>
                )}
              </div>
            )}
            <Pagination page={f.page} totalPages={totalPages} hrefFor={hrefFor} className="mt-8" />
          </div>
        </div>
      </Section>
    </>
  )
}
