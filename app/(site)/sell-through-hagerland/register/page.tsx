import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo'
import { getProductCategories } from '@/lib/data/reference'
import { readSupplySwitches } from '@/lib/supply/partner-switches'
import { REGISTER_PATH, preselectedRole } from '@/lib/supply/partner-rules'
import { Container } from '@/components/ui/Layout'
import { PartnerRegistrationForm } from '@/components/supply/PartnerRegistrationForm'

// The owner's switch is read on every request, so switching off closes the page at once (L6).
export const dynamic = 'force-dynamic'

const TITLE = 'Register your business with HagerLand Supply'
const INTRO = 'Tell us about your business. Your details stay private: we do not publish a business page, and customers see HagerLand Supply, not your business. We will contact you to talk about terms.'
const STEPS = [
  'Tell us about your business.',
  'We contact you to talk about terms.',
  'Once we agree terms, you add your products in your private partner area.',
  'We offer approved products to our customers under the HagerLand Supply name.',
]

export async function generateMetadata() {
  // While the switch is off the page does not exist: no title or description to give away.
  if (!(await readSupplySwitches()).registration) return {}
  return buildMetadata({ title: TITLE, description: INTRO, path: REGISTER_PATH })
}

/** S6-1: private registration for manufacturers, importers, suppliers and shops (AB's approved text, section 3). */
export default async function RegisterBusinessPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (!(await readSupplySwitches()).registration) notFound()
  const [searchParams, tree] = await Promise.all([props.searchParams, getProductCategories()])
  const categories = tree.map((c) => ({ id: c.id, name: c.name }))
  return (
    <Container className="max-w-3xl py-10 lg:py-16">
      <h1 className="hl-h1">{TITLE}</h1>
      <p className="mt-4 text-[1.0625rem] text-muted">{INTRO}</p>
      <section id="how-it-works" aria-labelledby="how-title" className="mt-10 scroll-mt-24">
        <h2 id="how-title" className="hl-h2">
          How it works
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-6">
          {STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>
      <div className="mt-10 rounded-lg border border-border bg-white p-5 sm:p-8">
        <PartnerRegistrationForm categories={categories} role={preselectedRole(searchParams.role)} />
      </div>
    </Container>
  )
}
