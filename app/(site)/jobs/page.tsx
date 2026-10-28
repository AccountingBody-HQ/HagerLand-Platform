import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Search } from 'lucide-react'
import { buildMetadata } from '@/lib/seo'
import { getVertical } from '@/lib/data/verticals'
import { companyJobs, searchJobs } from '@/lib/data/jobs'
import { getOrganisationBySlug } from '@/lib/data/organisations'
import { getLocationByPath } from '@/lib/data/reference'
import { EMPLOYMENT_TYPES, OFFERED_JOB_CATEGORIES, TRADES, categoryLabel } from '@/lib/jobs'
import { readJobsSwitches } from '@/lib/jobs-switches'
import { CallbackBox } from '@/components/jobs/CallbackBox'
import { getJobsI18n } from '@/lib/i18n/server'
import { fill } from '@/lib/i18n/translate'
import { formatNumber } from '@/lib/format'
import { verticalLandingMetadata } from '@/components/verticals/ComingSoonPage'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container, Section } from '@/components/ui/Layout'
import { ButtonLink, Button } from '@/components/ui/Button'
import { Combobox } from '@/components/ui/Combobox'
import { Input, Select } from '@/components/ui/Field'
import { Pagination } from '@/components/ui/Pagination'
import { JobCard } from '@/components/jobs/JobCard'
import { getPillar } from '@/lib/data/pillars'
import { COMING_SOON } from '@/lib/content/verticals'
import { PillarExtras } from '@/components/pillars/PillarHub'
import { InterestForm } from '@/components/verticals/InterestForm'
import { WorkerRegisterForm } from '@/components/jobs/WorkerRegisterForm'

export const revalidate = 300

type Params = { q?: string; category?: string; type?: string; trade?: string; loc?: string; page?: string; company?: string }

function clean(sp: Params) {
  return {
    q: sp.q?.trim().slice(0, 100) || undefined,
    category: OFFERED_JOB_CATEGORIES.some((c) => c.value === sp.category) ? sp.category : undefined,
    type: EMPLOYMENT_TYPES.some((t) => t.value === sp.type) ? sp.type : undefined,
    trade: TRADES.some((t) => t.value === sp.trade) ? sp.trade : undefined,
    loc: sp.loc && /^[a-z0-9/-]{1,200}$/.test(sp.loc) ? sp.loc : undefined,
    company: sp.company && /^[a-z0-9-]{1,120}$/.test(sp.company) ? sp.company : undefined,
    page: Math.min(500, Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1)),
  }
}

export async function generateMetadata(props: { searchParams: Promise<Params> }) {
  const searchParams = await props.searchParams
  const f = clean(searchParams)
  const filtered = Boolean(f.q || f.category || f.type || f.trade || f.loc || f.page > 1)
  const { locale, t } = await getJobsI18n()
  return verticalLandingMetadata('jobs', () =>
    buildMetadata({
      title: f.category ? fill(t('{category} jobs'), { category: t(categoryLabel(f.category)) }) : t('Jobs in construction, engineering and property'),
      description: t('Vacancies from construction, engineering, architecture, property and trades employers in Ethiopia and abroad. Apply with your CV on HagerLand.'),
      path: '/jobs',
      // Jobs Phase 6: every ?company= address is noindex, whatever the company.
      noindex: filtered || searchParams.company !== undefined,
      locale,
    }),
  )
}

/** Live job board (spec 24.9). While the vertical is coming soon, the layout shows the coming-soon landing instead. */
export default async function JobsPage(props: { searchParams: Promise<Params> }) {
  const searchParams = await props.searchParams
  const v = await getVertical('jobs')
  if (!v || v.status !== 'live') notFound()
  const f = clean(searchParams)
  // Jobs Phase 6 (AB's fix 2): ?company= filters only for a published business that is not HagerLand's own, and then
  // only its own jobs (never private-client jobs). Any other company shows the normal board.
  const org = f.company ? await getOrganisationBySlug(f.company) : null
  const company = org?.id && org.is_hagerland === false && org.kind !== 'hagerland' ? org : null
  const [{ items, total }, loc, pillar, switches, i18n] = await Promise.all([
    company ? companyJobs(company, { q: f.q, category: f.category, type: f.type, trade: f.trade, location: f.loc, page: f.page }) : searchJobs({ q: f.q, category: f.category, type: f.type, trade: f.trade, location: f.loc, page: f.page }),
    f.loc ? getLocationByPath(f.loc) : Promise.resolve(null),
    getPillar('jobs'),
    readJobsSwitches(),
    getJobsI18n(),
  ])
  const { t, href } = i18n
  const totalPages = Math.ceil(total / 20)
  const hrefFor = (page: number) => {
    const qs = new URLSearchParams(Object.entries({ q: f.q, category: f.category, type: f.type, trade: f.trade, loc: f.loc, company: company ? f.company : undefined, page: page > 1 ? String(page) : undefined }).filter((e): e is [string, string] => Boolean(e[1])))
    const s = qs.toString()
    return s ? `/jobs?${s}` : '/jobs'
  }
  const filtered = Boolean(f.q || f.category || f.type || f.trade || f.loc || company)
  return (
    <>
      <section className="hl-blueprint bg-ink text-white">
        <Container className="py-12 sm:py-16">
          <Breadcrumbs inverse items={[{ label: t(v.name) }]} />
          <h1 className="hl-h1 mt-8 max-w-3xl text-white">{t('Jobs in construction, engineering and property')}</h1>
          <p className="mt-4 max-w-2xl text-[1.0625rem] text-white/80">{t('Vacancies from employers in Ethiopia and abroad. Apply with your CV, or create a profile and choose whether employers can find you.')}</p>
          <div className="mt-8 grid gap-3 sm:max-w-xl sm:grid-cols-2">
            <ButtonLink href={href('/account/jobs/new')} variant="gold" size="lg" className="w-full">
              {t('Post a job')}
            </ButtonLink>
            <ButtonLink href={href('/account/candidate')} variant="outline-inverse" size="lg" className="w-full">
              {t('Create a candidate profile')}
            </ButtonLink>
          </div>
        </Container>
      </section>
      <Section compact labelledBy="by-trade">
        <h2 id="by-trade" className="hl-h3">
          {t('Find work by trade')}
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {TRADES.map((tr) => (
            <li key={tr.value}>
              <Link
                href={href(`/jobs?trade=${tr.value}`)}
                aria-current={f.trade === tr.value ? 'true' : undefined}
                className="inline-flex min-h-11 items-center rounded-full border border-border-strong bg-white px-4 text-small font-medium hover:border-green aria-[current=true]:border-ink aria-[current=true]:bg-ink aria-[current=true]:text-white"
              >
                {t(tr.label)}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <Section>
        <div className="lg:grid lg:grid-cols-[300px_1fr] lg:gap-10">
          <aside>
            <form action={href('/jobs')} method="get" className="space-y-5 rounded-lg border border-border bg-white p-5">
              <div>
                <label htmlFor="j-q" className="mb-2 block text-small font-semibold">
                  {t('Keywords')}
                </label>
                <Input id="j-q" name="q" type="search" defaultValue={f.q} placeholder={t('e.g. site engineer')} />
              </div>
              <div>
                <label htmlFor="j-loc" className="mb-2 block text-small font-semibold">
                  {t('Location')}
                </label>
                <Combobox id="j-loc" name="loc" endpoint="/api/locations?value=path&scope=all" placeholder={t('Anywhere')} defaultValue={f.loc ? { value: f.loc, label: loc?.display_name ?? f.loc } : null} />
              </div>
              <div>
                <label htmlFor="j-cat" className="mb-2 block text-small font-semibold">
                  {t('Category')}
                </label>
                <Select id="j-cat" name="category" defaultValue={f.category ?? ''}>
                  <option value="">{t('All categories')}</option>
                  {OFFERED_JOB_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {t(c.label)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label htmlFor="j-type" className="mb-2 block text-small font-semibold">
                  {t('Type of job')}
                </label>
                <Select id="j-type" name="type" defaultValue={f.type ?? ''}>
                  <option value="">{t('Any type')}</option>
                  {EMPLOYMENT_TYPES.map((et) => (
                    <option key={et.value} value={et.value}>
                      {t(et.label)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label htmlFor="j-trade" className="mb-2 block text-small font-semibold">
                  {t('Trade')}
                </label>
                <Select id="j-trade" name="trade" defaultValue={f.trade ?? ''}>
                  <option value="">{t('Any trade')}</option>
                  {TRADES.map((tr) => (
                    <option key={tr.value} value={tr.value}>
                      {t(tr.label)}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" className="w-full">
                <Search /> {t('Search jobs')}
              </Button>
            </form>
            <div className="mt-5 rounded-lg border border-gold/30 bg-gold-soft/40 p-5">
              <h2 className="font-semibold text-ink">{t('Need help hiring?')}</h2>
              <p className="mt-1 text-small text-muted">{t('Tell us which roles you need to fill and we will help you find people.')}</p>
              <ButtonLink href={href('/request-service/staffing')} variant="secondary" size="sm" className="mt-3 w-full">
                {t('Submit a staffing requirement')}
              </ButtonLink>
            </div>
            {switches.callbacks && (
              <div className="mt-4">
                <CallbackBox t={t} href={href} />
              </div>
            )}
          </aside>
          <div className="mt-8 min-w-0 lg:mt-0">
            {company && <h2 className="hl-h3 mb-2">{fill(t('Jobs at {company}'), { company: company.name ?? '' })}</h2>}
            <p className="mb-4 text-muted" role="status">
              {total > 0 ? fill(t(filtered ? '{count} match your search' : '{count} open now'), { count: total === 1 ? t('1 job') : fill(t('{n} jobs'), { n: formatNumber(total) }) }) : ''}
            </p>
            {items.length > 0 ? (
              <ul className="space-y-3">
                {items.map((j) => (
                  <li key={j.id}>
                    <JobCard job={j} t={t} locale={i18n.locale} href={href} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-lg border border-dashed border-border-strong bg-white p-8 text-center">
                <h2 className="hl-h3">{filtered ? t('No jobs match your search') : t('No jobs are open right now')}</h2>
                <p className="mx-auto mt-2 max-w-md text-muted">{filtered ? t('Try fewer filters or a different place.') : t('New vacancies appear here as soon as we have approved them. Create a candidate profile so employers can find you.')}</p>
                {filtered && (
                  <ButtonLink href={href('/jobs')} variant="secondary" className="mt-4">
                    {t('Clear search')}
                  </ButtonLink>
                )}
              </div>
            )}
            <Pagination page={f.page} totalPages={totalPages} hrefFor={hrefFor} className="mt-8" />
          </div>
        </div>
      </Section>
      {pillar?.direct && (
        <Section tone="tint" labelledBy="recruitment">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="hl-eyebrow text-green">{t('By HagerLand')}</p>
              <h2 id="recruitment" className="hl-h2 mt-1">
                {t('Recruitment and placement by HagerLand')}
              </h2>
              <p className="mt-3 max-w-3xl text-muted">{t('Tell us the roles you need to fill. HagerLand finds, checks and introduces suitable candidates in Ethiopia. Fees are agreed with you in writing before we start.')}</p>
            </div>
            <ButtonLink href={href('/request-service/staffing')} size="lg">
              {t('Submit a staffing requirement')}
            </ButtonLink>
          </div>
        </Section>
      )}
      {switches.workerRegister && (
        <Section id="worker-register" labelledBy="worker-register-h">
          <div className="grid gap-10 lg:grid-cols-[1fr_440px]">
            <div>
              <h2 id="worker-register-h" className="hl-h2">
                {t("Looking for work? Tell us you're available")}
              </h2>
              <p className="mt-3 text-muted">{t('Leave your phone number and trade. HagerLand may call you about suitable work. No account or email needed.')}</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-5 sm:p-6">
              <WorkerRegisterForm />
            </div>
          </div>
        </Section>
      )}
      {pillar?.interest && (
        <Section tone="stone" id="register" labelledBy="jobs-registers">
          <div className="grid gap-10 lg:grid-cols-[1fr_440px]">
            <div>
              <p className="hl-eyebrow text-green">{t('Hear first')}</p>
              <h2 id="jobs-registers" className="hl-h2 mt-1">
                {t('Candidate and employer registers')}
              </h2>
              <p className="mt-3 text-muted">{t('Not ready to apply or post a job? Join a register and we will contact you about suitable roles or candidates.')}</p>
            </div>
            <div className="rounded-xl border border-border bg-white p-5 sm:p-6">
              <InterestForm verticalKey="jobs" pillarKey="jobs" verticalName={v.name} audiences={COMING_SOON.jobs.audiences} categories={COMING_SOON.jobs.categories} categoryLabel={COMING_SOON.jobs.categoryLabel} idPrefix="jobs-reg" submitLabel={t('Join the register')} />
            </div>
          </div>
        </Section>
      )}
      <PillarExtras pillarKey="jobs" />
    </>
  )
}
