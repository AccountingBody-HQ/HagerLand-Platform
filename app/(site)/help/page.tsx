import { buildMetadata, faqJsonLd } from '@/lib/seo'
import { HELP_FAQ } from '@/lib/content/help'
import { Container } from '@/components/ui/Layout'
import { Accordion } from '@/components/ui/Accordion'
import { ButtonLink } from '@/components/ui/Button'
import { ChipLink } from '@/components/ui/Chip'
import { PageHero } from '@/components/content/PageHero'
import { JsonLd } from '@/components/seo/JsonLd'
import { getVerticals } from '@/lib/data/verticals'

export const metadata = buildMetadata({
  title: 'Help and FAQs',
  description: 'Answers about buying and renting safely, getting quotes for work, listing a property, your account, supplies, verification and reporting problems.',
  path: '/help',
})

export const revalidate = 600

export default async function HelpPage() {
  const verticals = await getVerticals()
  const groups = HELP_FAQ.filter((g) => !g.liveVertical || verticals.find((v) => v.key === g.liveVertical)?.status === 'live')
  return (
    <>
      <PageHero crumb="Help" title="Help and FAQs" intro="Quick answers to common questions. Can't find what you need? Contact us.">
        <nav aria-label="Topics" className="mt-6 flex flex-wrap gap-2">
          {groups.map((g) => (
            <ChipLink key={g.id} href={`#${g.id}`}>
              {g.title}
            </ChipLink>
          ))}
        </nav>
      </PageHero>
      <Container className="max-w-3xl space-y-12 py-12 sm:py-16">
        {groups.map((g) => (
          <section key={g.id} id={g.id} aria-labelledby={`${g.id}-h`} className="scroll-mt-24">
            <h2 id={`${g.id}-h`} className="hl-h2 mb-4">
              {g.title}
            </h2>
            <Accordion items={g.items.map((f, i) => ({ id: `${g.id}-${i}`, title: f.question, content: f.answer }))} />
          </section>
        ))}
        <div className="rounded-xl bg-stone-50 p-6 text-center">
          <h2 className="hl-h3">Still need help?</h2>
          <ButtonLink href="/contact" className="mt-4">
            Contact us
          </ButtonLink>
        </div>
      </Container>
      <JsonLd data={faqJsonLd(groups.flatMap((g) => g.items))} />
    </>
  )
}
