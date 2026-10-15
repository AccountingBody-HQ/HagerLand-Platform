import Link from 'next/link'
import { Check } from 'lucide-react'
import { buildMetadata } from '@/lib/seo'
import { getAgencyAvailability } from '@/lib/data/pillars'
import { getBusinessDetails } from '@/lib/data/business'
import { listGuides } from '@/lib/data/guides'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container, Section } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { LicenceNote } from '@/components/content/LicenceNote'
import { SafetyTips } from '@/components/property/SafetyTips'

export const revalidate = 300

export const metadata = buildMetadata({
  title: 'Renting through HagerLand: how it works',
  description: 'How renting a property marketed by HagerLand works: viewings in person or by video, applying to rent, checks, the tenancy and repairs if we manage the property.',
  path: '/agency/tenants',
})

const STEPS = [
  { title: 'Find a place', text: 'Search property to rent. Listings we market say “Marketed by HagerLand”.' },
  { title: 'View it', text: 'Book a viewing in person or by video call. We confirm a time with you.' },
  { title: 'Apply', text: 'Tell us about yourself, your move-in date and who will live there. Documents are optional and kept private.' },
  { title: 'Checks and decision', text: 'We check your application with the landlord and tell you their decision.' },
  { title: 'Tenancy', text: 'You agree the rent, any months in advance and the deposit in a written tenancy agreement before you pay anything.' },
  { title: 'Living there', text: 'If HagerLand manages the property, report repairs from your account and we arrange them.' },
]

/** How renting with HagerLand works (spec 26.6). Describes our own process only; general advice lives in Guides. */
export default async function TenantsPage() {
  const [agency, business, guides] = await Promise.all([getAgencyAvailability(), getBusinessDetails(), listGuides({ topic: 'renting', limit: 3 })])
  return (
    <>
      <section className="border-b border-border bg-stone-50">
        <Container className="py-10 sm:py-14">
          <Breadcrumbs items={[{ label: 'Rent & Let', href: '/rent' }, { label: 'Renting: a guide for tenants' }]} />
          <h1 className="hl-h1 mt-8 max-w-3xl">Renting through HagerLand</h1>
          <p className="mt-4 max-w-2xl text-[1.0625rem] text-muted">What happens when you rent a property that HagerLand markets, step by step. For properties listed by owners or other agents, contact them through the listing.</p>
        </Container>
      </section>
      <Section>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-lg border border-border bg-white p-5">
              <span className="font-display text-h3 font-extrabold text-green">{i + 1}</span>
              <p className="mt-1 font-semibold">{s.title}</p>
              <p className="text-small text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="hl-h3">Before you pay anything</h2>
            <ul className="mt-3 space-y-2">
              {['View the property, in person or by video.', 'Ask who owns it and see the ownership documents, or ask us to confirm we act for the owner.', 'Read the written tenancy agreement, including the rent, advance months and deposit.'].map((t) => (
                <li key={t} className="flex gap-3">
                  <Check className="mt-1 size-5 shrink-0 text-green" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <SafetyTips />
            </div>
          </div>
          <div className="space-y-4">
            {guides.length > 0 && (
              <div>
                <h2 className="hl-h3">Guides for renters</h2>
                <ul className="mt-3 space-y-1">
                  {guides.map((g) => (
                    <li key={g.id}>
                      <Link href={`/guides/${g.slug}`} className="font-semibold text-green underline">
                        {g.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/property/to-rent" className="sm:flex-1">
                Search property to rent
              </ButtonLink>
              {agency.lettings && (
                <ButtonLink href="/agency/landlords" variant="secondary" className="sm:flex-1">
                  Are you a landlord?
                </ButtonLink>
              )}
            </div>
            <LicenceNote kind="estate_agency" licence={business.licences.estate_agency} />
          </div>
        </div>
      </Section>
    </>
  )
}
