import Link from 'next/link'
import { ClipboardList, Clock, Flag, Home, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react'
import { buildMetadata } from '@/lib/seo'
import { getBusinessDetails } from '@/lib/data/business'
import { formatPhone, telegramLink, whatsappLink } from '@/lib/format'
import { brand } from '@/lib/brand'
import { Container } from '@/components/ui/Layout'
import { PageHero } from '@/components/content/PageHero'
import { EnquiryForm } from '@/components/enquiry/EnquiryForm'

export const revalidate = 600

export const metadata = buildMetadata({
  title: 'Contact HagerLand',
  description: 'Contact the HagerLand team about property, construction supplies, professionals, HagerLand Developments, or your account.',
  path: '/contact',
})

const TOPICS = [
  { value: 'general', label: 'General question' },
  { value: 'property-request', label: "I'm looking for a property" },
  { value: 'find-a-professional', label: 'Help finding a professional' },
  { value: 'search', label: "I couldn't find what I searched for" },
  { value: 'account', label: 'My account or listing' },
  { value: 'claim-dispute', label: 'A business claim' },
  { value: 'partnership', label: 'Partnerships and press' },
]

export default async function ContactPage(props: { searchParams: Promise<{ topic?: string }> }) {
  const searchParams = await props.searchParams
  const { contact } = await getBusinessDetails()
  const telegram = contact.telegram ? telegramLink(contact.telegram) : null
  const channels = [
    contact.phone && { icon: Phone, label: 'Call us', value: formatPhone(contact.phone), href: `tel:${contact.phone}` },
    contact.whatsapp && { icon: MessageCircle, label: 'WhatsApp', value: formatPhone(contact.whatsapp), href: whatsappLink(contact.whatsapp, `Hello ${brand.name}, `) },
    telegram && { icon: Send, label: 'Telegram', value: `@${contact.telegram.replace(/^@/, '')}`, href: telegram },
    contact.email && { icon: Mail, label: 'Email', value: contact.email, href: `mailto:${contact.email}` },
  ].filter((x): x is { icon: typeof Phone; label: string; value: string; href: string } => Boolean(x))

  return (
    <>
      <PageHero crumb="Contact" title="Contact us" intro="Send us a message and the right person will get back to you." />
      <Container className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_480px]">
        <div className="space-y-8">
          {channels.length > 0 && (
            <section aria-labelledby="ways-h">
              <h2 id="ways-h" className="hl-h3 mb-4">
                Ways to reach us
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {channels.map((c) => (
                  <li key={c.label}>
                    <a href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="flex min-h-16 items-center gap-3 rounded-lg border border-border bg-white p-4 hover:border-green">
                      <c.icon className="size-5 text-green" aria-hidden />
                      <span>
                        <span className="block text-small text-muted">{c.label}</span>
                        <span className="font-semibold">{c.value}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {(contact.address || contact.hours) && (
            <section aria-labelledby="visit-h" className="space-y-2">
              <h2 id="visit-h" className="hl-h3">
                Visit us
              </h2>
              {contact.address && (
                <p className="flex gap-2">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-green" aria-hidden /> {contact.address}
                </p>
              )}
              {contact.hours && (
                <p className="flex gap-2">
                  <Clock className="mt-0.5 size-5 shrink-0 text-green" aria-hidden /> {contact.hours}
                </p>
              )}
            </section>
          )}
          <section aria-labelledby="quick-h">
            <h2 id="quick-h" className="hl-h3 mb-4">
              Quick links
            </h2>
            <ul className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: ClipboardList, label: 'Request a quote', href: '/supplies/materials-list' },
                { icon: Home, label: 'Register interest in our homes', href: '/our-developments#register' },
                { icon: Flag, label: 'Report a listing', href: '/help#reporting' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="flex h-full min-h-20 flex-col justify-between rounded-lg border border-border bg-white p-4 font-semibold hover:border-green">
                    <l.icon className="size-5 text-green" aria-hidden /> {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <section aria-labelledby="form-h" className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
          <h2 id="form-h" className="hl-h3 mb-4">
            Send us a message
          </h2>
          <EnquiryForm askCallTimes
            target={{ type: 'general', recipientLabel: `the ${brand.name} team` }}
            intents={[{ value: 'other', label: 'Message', message: '' }]}
            topic={searchParams.topic}
            topicOptions={TOPICS}
            submitLabel="Send message"
            idPrefix="contact"
          />
        </section>
      </Container>
    </>
  )
}
