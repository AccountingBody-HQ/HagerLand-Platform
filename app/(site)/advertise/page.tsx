import { BadgeCheck, Megaphone, Star } from 'lucide-react'
import { buildMetadata } from '@/lib/seo'
import { PageHero } from '@/components/content/PageHero'
import { Section } from '@/components/ui/Layout'
import { EnquiryForm } from '@/components/enquiry/EnquiryForm'

export const revalidate = 3600

export const metadata = buildMetadata({
  title: 'Advertise with HagerLand',
  description: 'Feature your listings, developments, products or business on HagerLand. Promotions are always labelled, and never change organic search order.',
  path: '/advertise',
})

const OPTIONS = [
  { icon: Star, title: 'Featured listings', text: 'Up to two labelled “Featured” places at the top of matching search results.' },
  { icon: Megaphone, title: 'Homepage and category spotlights', text: 'A labelled place on the homepage or a category page for a set period.' },
  { icon: BadgeCheck, title: 'Verified profile first', text: 'Get Verified so customers trust your profile. Verification is free and based on your documents.' },
]

/** Advertising enquiries (PLATFORM_VISION supporting area). No prices are published: we reply with options. */
export default function AdvertisePage() {
  return (
    <>
      <PageHero crumb="Advertise" eyebrow="For businesses" title="Advertise with HagerLand" intro="Reach people buying, building, renting and maintaining property in Ethiopia and abroad. Every promotion is clearly labelled, and paid placement never changes the order of normal search results." />
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_440px]">
          <div>
            <h2 className="hl-h2">Ways to promote</h2>
            <ul className="mt-6 space-y-4">
              {OPTIONS.map((o) => (
                <li key={o.title} className="flex gap-4 rounded-lg border border-border bg-white p-5">
                  <o.icon className="size-6 shrink-0 text-green" aria-hidden />
                  <div>
                    <h3 className="font-semibold text-ink">{o.title}</h3>
                    <p className="mt-1 text-muted">{o.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-small text-muted">Tell us what you would like to promote and for how long, and we will reply with the options available.</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
            <h2 className="hl-h3 mb-4">Ask about advertising</h2>
            <EnquiryForm target={{ type: 'general', recipientLabel: 'the HagerLand team' }} intents={[{ value: 'more_info', label: 'Advertising', message: "I'd like to know about advertising options for my business." }]} topic="Advertising" idPrefix="adv" />
          </div>
        </div>
      </Section>
    </>
  )
}
