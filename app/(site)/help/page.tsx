import { buildMetadata, faqJsonLd } from '@/lib/seo'
import { HELP_FAQ } from '@/lib/content/help'
import { Container } from '@/components/ui/Layout'
import { Accordion } from '@/components/ui/Accordion'
import { ButtonLink } from '@/components/ui/Button'
import { ChipLink } from '@/components/ui/Chip'
import { PageHero } from '@/components/content/PageHero'
import { JsonLd } from '@/components/seo/JsonLd'

export const metadata = buildMetadata({
  title: 'Help and FAQs',
  description: 'Answers about buying and renting safely, listing a property, your account, supplies and quotes, verification and reporting problems on HagerLand.',
  path: '/help',
})

export default function HelpPage() {
  return (
    <>
      <PageHero crumb="Help" title="Help and FAQs" intro="Quick answers to common questions. Can't find what you need? Contact us.">
        <nav aria-label="Topics" className="mt-6 flex flex-wrap gap-2">
          {HELP_FAQ.map((g) => (
            <ChipLink key={g.id} href={`#${g.id}`}>
              {g.title}
            </ChipLink>
          ))}
        </nav>
      </PageHero>
      <Container className="max-w-3xl space-y-12 py-12 sm:py-16">
        {HELP_FAQ.map((g) => (
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
      <JsonLd data={faqJsonLd(HELP_FAQ.flatMap((g) => g.items))} />
    </>
  )
}
