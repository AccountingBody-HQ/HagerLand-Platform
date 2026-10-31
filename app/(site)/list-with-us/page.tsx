import { Check } from 'lucide-react'
import { buildMetadata, faqJsonLd } from '@/lib/seo'
import { getBusinessDetails } from '@/lib/data/business'
import { getVerticals } from '@/lib/data/verticals'
import { readSupplySwitchesCached } from '@/lib/supply/partner-switches'
import { REGISTER_PATH } from '@/lib/supply/partner-rules'
import { AUDIENCES, LIST_WITH_US_FAQ } from '@/lib/content/list-with-us'
import { Container, Section } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { ChipLink } from '@/components/ui/Chip'
import { Accordion } from '@/components/ui/Accordion'
import { PageHero } from '@/components/content/PageHero'
import { JsonLd } from '@/components/seo/JsonLd'

export const revalidate = 600

export const metadata = buildMetadata({
  title: 'List with HagerLand',
  description: 'List a property, your business or your products, post jobs or become a partner. Reach people buying, building and renting in Ethiopia and abroad.',
  path: '/list-with-us',
})

/** Which vertical each audience depends on: hidden verticals hide their audience; coming-soon ones point to registering interest. */
const AUDIENCE_VERTICAL: Record<string, { key: 'jobs' | 'finance'; soon: { label: string; href: string } }> = {
  employers: { key: 'jobs', soon: { label: 'Register interest as an employer', href: '/jobs#register' } },
  partners: { key: 'finance', soon: { label: 'Become a partner', href: '/finance#partner' } },
}

export default async function ListWithUsPage() {
  const [business, verticals, supplySwitches] = await Promise.all([getBusinessDetails(), getVerticals(), readSupplySwitchesCached()])
  // QC-3: the same two switches as the homepage "Sell through HagerLand" row.
  const sellThrough = supplySwitches.homeBusinessRow && supplySwitches.registration
  const audiences = AUDIENCES.flatMap((a) => {
    const dep = AUDIENCE_VERTICAL[a.id]
    if (!dep) return [a]
    const v = verticals.find((x) => x.key === dep.key)
    if (!v) return []
    return [v.status === 'live' ? a : { ...a, cta: dep.soon, how: `${a.how} This service opens soon.` }]
  })
  return (
    <>
      <PageHero
        crumb="List with us"
        title="List with HagerLand"
        intro={
          <>
            Reach people buying, building and renting across Ethiopia.{business.freeListingConfirmed ? ' Listing is free while we launch.' : ''}
          </>
        }
      >
        <nav aria-label="Who is this for" className="mt-6 flex flex-wrap gap-2">
          {audiences.map((a) => (
            <ChipLink key={a.id} href={`#${a.id}`}>
              {a.title}
            </ChipLink>
          ))}
        </nav>
      </PageHero>
      <Container className="space-y-6 py-12 sm:py-16">
        {audiences.map((a) => (
          <section key={a.id} id={a.id} aria-labelledby={`${a.id}-h`} className="grid scroll-mt-24 gap-6 rounded-xl border border-border bg-white p-6 sm:p-8 lg:grid-cols-[1fr_1.2fr_auto] lg:items-start">
            <div>
              <h2 id={`${a.id}-h`} className="hl-h2">
                {a.title}
              </h2>
              <p className="mt-2 text-muted">{a.who}</p>
            </div>
            <div>
              <h3 className="text-small font-semibold uppercase tracking-wide text-muted">What you get</h3>
              <ul className="mt-2 space-y-1.5">
                {a.get.map((g) => (
                  <li key={g} className="flex gap-2">
                    <Check className="mt-0.5 size-5 shrink-0 text-green" aria-hidden /> {g}
                  </li>
                ))}
              </ul>
              <h3 className="mt-4 text-small font-semibold uppercase tracking-wide text-muted">How to start</h3>
              <p className="mt-1">{a.how}</p>
            </div>
            <ButtonLink href={a.cta.href} className="lg:min-w-52">
              {a.cta.label}
            </ButtonLink>
          </section>
        ))}
      </Container>
      <Section tone="stone">
        <h2 className="hl-h2 mb-6">Questions</h2>
        <div className="max-w-3xl">
          <Accordion items={LIST_WITH_US_FAQ.map((f, i) => ({ id: `lwu-${i}`, title: f.question, content: f.answer }))} />
        </div>
      </Section>
      {sellThrough && (
        <Section compact labelledBy="sell-through-h">
          <div className="flex flex-col gap-6 rounded-xl border border-border bg-white p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 id="sell-through-h" className="hl-h2">
                Supply building materials?
              </h2>
              <p className="mt-2 text-muted">Reach builders, homeowners and contractors across Ethiopia through HagerLand Supply.</p>
            </div>
            <ButtonLink href={REGISTER_PATH} className="lg:min-w-52">
              Sell through HagerLand
            </ButtonLink>
          </div>
        </Section>
      )}
      <JsonLd data={faqJsonLd(LIST_WITH_US_FAQ)} />
    </>
  )
}
