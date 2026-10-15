import { Search } from 'lucide-react'
import { buildMetadata } from '@/lib/seo'
import { getLocations, getServiceCategories } from '@/lib/data/reference'
import { searchOrganisations } from '@/lib/data/organisations'
import { COUNTRIES, countryName } from '@/lib/countries'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container, EmptyState } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { CompanyCard } from '@/components/company/CompanyCard'
import { RequestCta } from '@/components/service-requests/RequestCta'
import { controlClasses } from '@/components/ui/Field'
import { cn } from '@/lib/cn'

export const dynamic = 'force-dynamic'

export const metadata = buildMetadata({
  title: 'Ethiopian-run services where you live',
  description: 'Find Ethiopian-owned and Ethiopian-serving trades and professionals in the UK, US, Canada, the Gulf, Europe and Africa, or request a service and get quotes.',
  path: '/diaspora/services-abroad',
})

const ABROAD = COUNTRIES.filter((c) => c.code !== 'ET')

/** Services abroad (spec 24.6b): businesses in the visitor's country and city, with request-a-service routing. */
export default async function ServicesAbroadPage(
  props: { searchParams: Promise<{ country?: string; city?: string; service?: string }> }
) {
  const searchParams = await props.searchParams
  const country = ABROAD.find((c) => c.code === searchParams.country) ?? null
  const [locations, tree] = await Promise.all([getLocations(), getServiceCategories()])
  const cities = country ? locations.filter((l) => l.country_code === country.code && l.level === 'city').sort((a, b) => a.name.localeCompare(b.name)) : []
  const city = cities.find((c) => c.path === searchParams.city) ?? null
  const services = tree.flatMap((g) => g.children.map((c) => ({ ...c, group: g.name })))
  const service = services.find((s) => s.slug === searchParams.service) ?? null
  const result = country ? await searchOrganisations({ countryCode: country.code, locationId: city?.id, serviceId: service?.id, pageSize: 24 }) : null
  const place = city ? `${city.name}, ${country?.name}` : country?.name
  const select = cn(controlClasses, 'h-11 appearance-none')
  return (
    <Container className="py-8 lg:py-12">
      <Breadcrumbs items={[{ label: 'Diaspora Services', href: '/diaspora' }, { label: 'Services where you live' }]} />
      <h1 className="hl-h1 mt-4">Ethiopian-run services where you live</h1>
      <p className="mt-2 max-w-3xl text-muted">Trades and professionals in your country that are Ethiopian-owned or work with the Ethiopian community. Can&apos;t find one? Request the service and we will look for you.</p>
      <form method="get" className="mt-6 grid gap-3 rounded-lg border border-border bg-white p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <label className="flex flex-col gap-1.5 text-small font-semibold text-ink">
          Country
          <select name="country" defaultValue={country?.code ?? ''} className={select}>
            <option value="">Choose a country</option>
            {ABROAD.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-small font-semibold text-ink">
          City
          <select name="city" defaultValue={city?.path ?? ''} className={select}>
            <option value="">{country ? 'Any city' : 'Choose a country first'}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.path}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-small font-semibold text-ink">
          Service
          <select name="service" defaultValue={service?.slug ?? ''} className={select}>
            <option value="">Any service</option>
            {services.map((s) => (
              <option key={s.id} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-green px-5 font-semibold text-white hover:bg-green-dark">
          <Search className="size-4" aria-hidden /> Search
        </button>
      </form>

      {!country ? (
        <p className="mt-8 text-muted">Choose your country to see businesses there.</p>
      ) : (
        <div className="mt-8 space-y-6">
          <p className="font-semibold" role="status">
            {result?.total ?? 0} {result?.total === 1 ? 'business' : 'businesses'}
            {service ? ` for ${service.name.toLowerCase()}` : ''} in {place}
          </p>
          {service && <RequestCta serviceSlug={service.slug} serviceName={service.name} abroad />}
          {result && result.items.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((o) => (
                <li key={o.id}>
                  <CompanyCard org={o} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title={`No businesses listed in ${place} yet`}
              description={`We are adding Ethiopian-run businesses in ${countryName(country.code)}. Request the service and we will try to find someone for you.`}
              actions={
                <>
                  <ButtonLink href={service ? `/request-service/${service.slug}?abroad=1` : '/request-service'}>Request a service</ButtonLink>
                  <ButtonLink href="/list-with-us#professionals" variant="secondary">
                    List your business
                  </ButtonLink>
                </>
              }
            />
          )}
        </div>
      )}
    </Container>
  )
}
