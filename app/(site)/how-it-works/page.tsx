import Link from 'next/link'
import { BadgeCheck, Circle, CircleCheck } from 'lucide-react'
import { brand } from '@/lib/brand'
import { buildMetadata } from '@/lib/seo'
import { Section, SectionHeader } from '@/components/ui/Layout'
import { Tabs } from '@/components/ui/Tabs'
import { MODE_LABELS } from '@/lib/pillars'
import { ButtonLink } from '@/components/ui/Button'
import { PageHero } from '@/components/content/PageHero'

export const metadata = buildMetadata({
  title: 'How HagerLand works',
  description: 'How to find property, get quotes for work, list a property or grow a business on HagerLand, what verification means and the rules that keep it fair.',
  path: '/how-it-works',
})

function Steps({ steps, cta }: { steps: { title: string; text: string }[]; cta: { label: string; href: string } }) {
  return (
    <div>
      <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="rounded-lg border border-border bg-white p-5">
            <span className="flex size-9 items-center justify-center rounded-full bg-green-soft font-display font-bold text-green">{i + 1}</span>
            <h3 className="mt-3 font-semibold">{s.title}</h3>
            <p className="mt-1 text-small text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
      <ButtonLink href={cta.href} className="mt-6">
        {cta.label}
      </ButtonLink>
    </div>
  )
}

export default function HowItWorksPage() {
  return (
    <>
      <PageHero crumb="How it works" title="How HagerLand works" intro="Whether you are looking, getting quotes, listing or running a business, here is what to expect." />
      <Section>
        <Tabs
          items={[
            {
              id: 'looking',
              label: 'Looking',
              content: (
                <Steps
                  cta={{ label: 'Find property', href: '/property' }}
                  steps={[
                    { title: 'Search', text: 'Search homes, land, developments, supplies and professionals. Filter by area, price, size and more.' },
                    { title: 'Compare', text: 'Look at photos, key facts, documents status and the lister’s verification level.' },
                    { title: 'Contact directly', text: 'Call, WhatsApp, Telegram or send an enquiry. Your message goes straight to the lister.' },
                    { title: 'View safely', text: 'View the property and check the title deed (carta) and lease documents before you pay anything.' },
                  ]}
                />
              ),
            },
            {
              id: 'services',
              label: 'Getting quotes',
              content: (
                <Steps
                  cta={{ label: 'Request a service', href: '/request-service' }}
                  steps={[
                    { title: 'Describe the job', text: 'Choose the service, answer a few questions and add photos or plans. You do not need an account.' },
                    { title: 'We match it', text: 'HagerLand sends your request to up to three suitable providers who work where you need them. Emergencies are looked at first.' },
                    { title: 'Compare quotes', text: 'Providers contact you and send their quotes to your private request page.' },
                    { title: 'Choose and agree', text: 'Pick the provider you prefer. Agree the work, price and timing in writing before you pay anything.' },
                  ]}
                />
              ),
            },
            {
              id: 'listing',
              label: 'Listing',
              content: (
                <Steps
                  cta={{ label: 'List your property', href: '/signup?type=owner' }}
                  steps={[
                    { title: 'Create an account', text: 'Sign up with your email and phone. It takes about a minute.' },
                    { title: 'List your property', text: 'Add the basics, location, details, at least three photos and how buyers can contact you.' },
                    { title: 'We review it', text: 'Our team checks every listing before it goes live, usually within one business day.' },
                    { title: 'Manage enquiries', text: 'Enquiries arrive by email and in your account. Track each one and reply quickly.' },
                    { title: 'Renew or archive', text: 'Listings stay live for 60 days. Renew in one click if it is still available.' },
                  ]}
                />
              ),
            },
            {
              id: 'businesses',
              label: 'Businesses',
              content: (
                <Steps
                  cta={{ label: 'List your business', href: '/list-with-us' }}
                  steps={[
                    { title: 'Create a profile', text: 'Add your services, the areas you cover and how customers can reach you.' },
                    { title: 'Get Verified', text: 'Upload your trade licence and TIN certificate. We check them and add the Verified badge.' },
                    { title: 'Show your work', text: 'Add portfolio projects with photos. Real work wins more enquiries than words.' },
                    { title: 'Receive enquiries and requests', text: 'Customers contact you directly, and HagerLand sends you matching customer requests to quote for. Manage everything from your account, with your team.' },
                  ]}
                />
              ),
            },
          ]}
        />
      </Section>
      <Section labelledBy="modes">
        <SectionHeader id="modes" title="How each service is provided" description={`Every part of ${brand.name} shows which of these applies today.`} />
        <ul className="grid gap-4 md:grid-cols-3">
          {[
            { label: MODE_LABELS.direct, text: `${brand.name} does the work itself, for example our estate agency, Property Care, HagerLand Supply and recruitment.` },
            { label: MODE_LABELS.aggregate, text: 'Vetted providers, partners and listings, matched by us or found through search. They agree terms with you directly.' },
            { label: MODE_LABELS.interest, text: 'A service we are preparing. Register your interest and we tell you when it opens; your registration helps us decide what to open next.' },
          ].map((m) => (
            <li key={m.label} className="rounded-lg border border-border bg-white p-5">
              <h3 className="font-semibold">{m.label}</h3>
              <p className="mt-1 text-small text-muted">{m.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-small">
          <Link href="/#ecosystem-title" className="font-semibold text-green underline">
            See all ten services around the property lifecycle
          </Link>
        </p>
      </Section>
      <Section tone="stone">
        <SectionHeader title="Verification levels explained" />
        <ul className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Circle, title: 'Listed', text: 'We added this business from public information so customers can find it. It has not been claimed by its owner yet.' },
            { icon: CircleCheck, title: 'Claimed', text: 'The owner manages the profile. We confirmed they represent the business.' },
            { icon: BadgeCheck, title: 'Verified', text: 'We checked the business’s trade licence (and licence grade for contractors). The date of the check is shown on the badge.' },
          ].map((v) => (
            <li key={v.title} className="rounded-lg border border-border bg-white p-5">
              <v.icon className={`size-7 ${v.title === 'Verified' ? 'text-gold' : 'text-green'}`} aria-hidden />
              <h3 className="mt-3 font-semibold">{v.title}</h3>
              <p className="mt-1 text-small text-muted">{v.text}</p>
            </li>
          ))}
        </ul>
      </Section>
      <Section>
        <div className="max-w-3xl">
          <h2 className="hl-h2">Our marketplace rules</h2>
          <ul className="mt-5 space-y-3">
            <li><strong>Everything is reviewed.</strong> Listings and profiles go live only after our team checks them.</li>
            <li><strong>Listings stay current.</strong> Property listings expire after 60 days unless the owner renews them.</li>
            <li><strong>We are a participant too, and we say so.</strong> {brand.name} also sells materials through {brand.divisions.supply} and builds homes through {brand.divisions.developments}. Our own items are always labelled, and they are never pushed above other listings in search. Any promoted placement is clearly marked.</li>
            <li><strong>Reviews are from real jobs.</strong> Only customers who chose a provider through {brand.name} can review them, we check each review before it appears, and we never invent or import reviews.</li>
            <li><strong>Report problems.</strong> Every listing and profile has a “Report” link. We act on reports quickly.</li>
          </ul>
        </div>
      </Section>
    </>
  )
}
