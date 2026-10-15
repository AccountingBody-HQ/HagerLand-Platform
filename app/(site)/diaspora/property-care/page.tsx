import { getBusinessDetails } from '@/lib/data/business'
import { LicenceNote } from '@/components/content/LicenceNote'
import { CalendarCheck, Camera, Eye, FileText, Handshake, ShieldCheck, UserCheck } from 'lucide-react'
import { buildMetadata, faqJsonLd } from '@/lib/seo'
import { brand } from '@/lib/brand'
import { getSiteSettings } from '@/lib/data/reference'
import { CARE_SERVICES } from '@/lib/property-care'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container, Section, SectionHeader } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { Accordion } from '@/components/ui/Accordion'
import { JsonLd } from '@/components/seo/JsonLd'
import { PropertyCareForm } from '@/components/diaspora/PropertyCareForm'

export const revalidate = 600

export const metadata = buildMetadata({
  title: `${brand.divisions.propertyCare} for owners abroad`,
  description: 'Professional management of your property in Ethiopia while you live abroad: maintenance, security, inspections with photo reports, tenants and rent collection.',
  path: '/diaspora/property-care',
})

const STEPS = [
  { icon: Handshake, title: 'Consultation', text: 'We talk about your property, how it is used now and what worries you.' },
  { icon: FileText, title: 'Written proposal', text: 'A clear proposal: what we will do, how often, what it costs and how we report to you.' },
  { icon: Camera, title: 'First visit', text: 'We inspect the property and send you a dated photo report as the starting point.' },
  { icon: CalendarCheck, title: 'Ongoing care', text: 'Regular visits, repairs handled with your approval, and statements for every period.' },
]

const PROMISES = [
  { icon: ShieldCheck, title: 'Peace of mind', text: 'Your property is looked after by a team whose job it is, not as a favour.' },
  { icon: Eye, title: 'Transparency', text: 'Dated photos, written notes and statements, so you can see what happened and what it cost.' },
  { icon: UserCheck, title: 'Accountability', text: 'One named point of contact, and nothing spent without the authority you agreed.' },
]

const FAQ = [
  { question: 'Do I need to come to Ethiopia to start?', answer: 'No. We can arrange everything with you by phone, WhatsApp or email. For some matters, such as representing you, you may need to give written authority; we explain what is needed in your proposal.' },
  { question: 'How will I know what is happening at my property?', answer: 'After every inspection we send you a report with dated photos and notes. Repairs are agreed with you first, and you receive a statement for each period.' },
  { question: 'My relatives live in the property. Can you still help?', answer: 'Yes. We can carry out inspections and maintenance while your family lives there, agreed with you and with them.' },
  { question: 'Can you find tenants and collect rent?', answer: 'Yes. We can find and check tenants, collect rent and account for it. The details, including what happens if rent is late, are set out in your proposal.' },
  { question: 'Can you help if I decide to sell?', answer: 'Yes. We can coordinate a managed sale on your behalf, from valuation and marketing to viewings.' },
]

/** HagerLand Property Care (spec 24.6, PLATFORM_VISION §9). */
export default async function PropertyCarePage() {
  const [settings, business] = await Promise.all([getSiteSettings(), getBusinessDetails()])
  const pricing = typeof settings.property_care_pricing === 'string' ? settings.property_care_pricing.trim() : ''
  return (
    <>
      <section className="hl-blueprint bg-ink text-white">
        <Container className="py-12 sm:py-20">
          <Breadcrumbs inverse items={[{ label: 'Diaspora Services', href: '/diaspora' }, { label: brand.divisions.propertyCare }]} />
          <p className="hl-eyebrow mt-8 text-gold">{brand.divisions.propertyCare}</p>
          <h1 className="hl-display mt-3 max-w-3xl text-white">Your property in Ethiopia, properly looked after.</h1>
          <p className="mt-5 max-w-2xl text-[1.0625rem] text-white/80">
            Property management for owners who live abroad. We manage, maintain, secure and monitor your property, deal with tenants and repairs, and report back clearly, so you no longer have to rely on friends and relatives.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row [&>*]:sm:min-w-56">
            <ButtonLink href="#consultation" variant="gold" size="lg">
              Request a consultation
            </ButtonLink>
            <ButtonLink href="#services" variant="outline-inverse" size="lg">
              What we do
            </ButtonLink>
          </div>
        </Container>
      </section>

      <Section>
        <ul className="grid gap-6 sm:grid-cols-3">
          {PROMISES.map((p) => (
            <li key={p.title} className="flex gap-4">
              <p.icon className="size-7 shrink-0 text-gold-dark" aria-hidden />
              <div>
                <h2 className="font-semibold text-ink">{p.title}</h2>
                <p className="mt-1 text-muted">{p.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="stone" id="services">
        <SectionHeader title="What we can do for you" description="Choose the services you need. We put them together in one proposal." />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARE_SERVICES.map((s) => (
            <li key={s.value} className="rounded-lg border border-border bg-white p-5">
              <h3 className="font-semibold text-ink">{s.label}</h3>
              <p className="mt-1 text-small text-muted">{s.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <SectionHeader title="How it works" />
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-lg border border-border bg-white p-5">
              <span className="font-display text-h3 font-extrabold text-gold-dark">{i + 1}</span>
              <p className="mt-1 flex items-center gap-2 font-semibold text-ink">
                <s.icon className="size-4 text-green" aria-hidden /> {s.title}
              </p>
              <p className="mt-1 text-small text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
        {pricing && (
          <div className="mt-8 rounded-lg border border-gold/40 bg-gold-soft/50 p-5">
            <h2 className="hl-h3">Prices</h2>
            <p className="mt-2 whitespace-pre-line">{pricing}</p>
          </div>
        )}
        <LicenceNote kind="property_management" licence={business.licences.property_management} className="mt-6" />
      </Section>

      <Section tone="stone" id="consultation">
        <div className="grid gap-10 lg:grid-cols-[1fr_600px]">
          <div>
            <h2 className="hl-h2">Request a consultation</h2>
            <p className="mt-3 text-muted">Tell us about you and your property. We will contact you at a time that suits you, then send a written proposal. There is no obligation.</p>
            <div className="mt-8">
              <h3 className="hl-h3 mb-3">Questions owners ask</h3>
              <Accordion items={FAQ.map((f, i) => ({ id: `care-faq-${i}`, title: f.question, content: f.answer }))} />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-white p-5 sm:p-6">
            <PropertyCareForm />
          </div>
        </div>
      </Section>
      <JsonLd data={faqJsonLd(FAQ)} />
    </>
  )
}
