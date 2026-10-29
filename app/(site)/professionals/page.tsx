import Link from 'next/link'
import { ArrowRight, FolderSearch, MessagesSquare, Search } from 'lucide-react'
import { getServiceCategories } from '@/lib/data/reference'
import { searchOrganisations } from '@/lib/data/organisations'
import { buildMetadata } from '@/lib/seo'
import { Container, Section, SectionHeader } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { DynamicIcon } from '@/components/ui/DynamicIcon'
import { CompanyCard } from '@/components/company/CompanyCard'
import { ProfessionalSearch } from '@/components/company/ProfessionalSearch'

export const revalidate = 300

export const metadata = buildMetadata({
  title: 'Hire construction professionals in Ethiopia',
  description: 'Find architects, engineers, contractors and tradespeople across Ethiopia. See their portfolios, check who is Verified, and contact them directly.',
  path: '/professionals',
})

const POPULAR = ['architects', 'general-contractors', 'electricians', 'plumbers', 'interior-designers', 'structural-engineers', 'solar-installers', 'welders']

export default async function ProfessionalsHub() {
  const [tree, featured] = await Promise.all([getServiceCategories(), searchOrganisations({ verifiedOnly: true, kinds: ['contractor', 'professional_firm', 'sole_trader'], pageSize: 6 })])
  const all = tree.flatMap((g) => g.children)
  const popular = POPULAR.map((s) => all.find((c) => c.slug === s)).filter((c): c is NonNullable<typeof c> => Boolean(c))

  return (
    <>
      <section className="hl-blueprint bg-ink text-white">
        <Container className="py-10 sm:py-14">
          <Breadcrumbs inverse items={[{ label: 'Professionals' }]} />
          <h1 className="hl-h1 mt-5 max-w-3xl text-white">Find and hire construction professionals.</h1>
          <p className="mt-3 max-w-2xl text-white/75">Architects, engineers, contractors and tradespeople across Ethiopia, with portfolios and a Verified badge for businesses we have checked.</p>
          <div className="mt-8 rounded-xl bg-white p-4 text-ink shadow-lg sm:p-5">
            <ProfessionalSearch services={tree.map((g) => ({ name: g.name, children: g.children.map((c) => ({ name: c.name, slug: c.slug })) }))} />
          </div>
        </Container>
      </section>

      {popular.length > 0 && (
        <Section compact>
          <SectionHeader title="Popular services" />
          <ul className="flex flex-wrap gap-2">
            {popular.map((s) => (
              <li key={s.slug}>
                <Link href={`/professionals/${s.slug}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-strong bg-white px-4 font-medium hover:border-ink">
                  <DynamicIcon name={s.icon} className="size-4 text-green" /> {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section tone="stone" compact>
        <SectionHeader title="All services" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tree.map((g) => (
            <div key={g.id} className="rounded-lg border border-border bg-white p-5">
              <Link href={`/professionals/${g.slug}`} className="flex items-center gap-3 font-display text-h3 font-bold text-ink hover:text-green">
                <DynamicIcon name={g.icon} className="size-6 text-green" /> {g.name}
              </Link>
              <ul className="mt-4 grid gap-1">
                {g.children.map((c) => (
                  <li key={c.id}>
                    <Link href={`/professionals/${c.slug}`} className="flex min-h-9 items-center text-muted hover:text-ink">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section compact>
        <SectionHeader title="How hiring works" />
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Search, title: 'Search', text: 'Choose a service and your area. Filter for verified businesses and those with portfolios.' },
            { icon: FolderSearch, title: 'Compare portfolios', text: 'Look at real projects, licence details and the areas each business covers.' },
            { icon: MessagesSquare, title: 'Enquire directly', text: 'Call, WhatsApp or send an enquiry. The business replies to you, not to us.' },
          ].map((s, i) => (
            <li key={s.title} className="rounded-lg border border-border bg-white p-6">
              <span className="flex size-10 items-center justify-center rounded-full bg-green-soft font-display font-bold text-green">{i + 1}</span>
              <h3 className="hl-h3 mt-4 flex items-center gap-2">
                <s.icon className="size-5 text-green" aria-hidden /> {s.title}
              </h3>
              <p className="mt-2 text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      {featured.items.length > 0 && (
        <Section tone="stone" compact>
          <SectionHeader title="Verified professionals" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.items.map((o) => (
              <li key={o.id}>
                <CompanyCard org={o} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section compact>
        <div className="flex flex-col items-start justify-between gap-6 rounded-xl bg-green-darker p-6 text-white sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="hl-h2 text-white">Are you a contractor or professional?</h2>
            <p className="mt-2 max-w-xl text-white/80">Create a free profile, show your work and get enquiries from people building across Ethiopia.</p>
          </div>
          <ButtonLink href="/list-with-us#professionals" variant="inverse" size="lg">
            Join as a professional <ArrowRight />
          </ButtonLink>
        </div>
      </Section>
    </>
  )
}
