import Link from 'next/link'
import { buildMetadata } from '@/lib/seo'
import { brand } from '@/lib/brand'
import { getBusinessDetails } from '@/lib/data/business'
import { legalUpdated } from '@/lib/content/legal'
import { Container } from '@/components/ui/Layout'
import { PageHero, TextSection } from '@/components/content/PageHero'
import { LegalEntity } from '@/components/content/LegalEntity'

export const revalidate = 3600
export const metadata = buildMetadata({ title: 'Terms of use', description: 'The terms for using HagerLand: listings, enquiries, quotes, verification, our role as a marketplace and a participant, and your responsibilities.', path: '/terms' })

export default async function TermsPage() {
  const [business, updated] = await Promise.all([getBusinessDetails(), legalUpdated('terms')])
  const { legal } = business
  return (
    <>
      <PageHero crumb="Terms" title="Terms of use" intro={`Last updated ${updated}`} />
      <Container className="max-w-3xl space-y-10 py-12 sm:py-16">
        <TextSection title="1. About these terms">
          <p>These terms apply when you use {brand.name}, including browsing, creating an account, listing a property or business, sending an enquiry or requesting a quote. By using {brand.name} you agree to them. If you do not agree, please do not use the site.</p>
          <LegalEntity legal={legal} />
        </TextSection>
        <TextSection title={`2. What ${brand.name} is`}>
          <p>{brand.name} is an online platform where people list and find property, construction materials, professionals and services in Ethiopia, and request quotes for work, including people who live abroad. Unless a listing is labelled as {brand.divisions.supply} or {brand.divisions.developments}, we are not a party to any agreement between you and another user, and we do not own, sell or let the properties listed by others.</p>
        </TextSection>
        <TextSection title="3. Our dual role">
          <p>{brand.name} also sells construction materials through {brand.divisions.supply}, offers estate agency services, and intends to develop homes through {brand.divisions.developments}. Our own products, services and projects are always clearly labelled. They are not ranked above other listings in organic search results, and any promoted placement is marked as such.</p>
        </TextSection>
        <TextSection title="4. Accounts">
          <ul>
            <li>You must give accurate details and keep your password secure. You are responsible for activity on your account.</li>
            <li>You must confirm your email address before you can list or publish anything.</li>
            <li>One person may belong to several business profiles. Only people authorised by a business may manage its profile.</li>
          </ul>
        </TextSection>
        <TextSection title="5. Listing rules">
          <ul>
            <li>You may only list a property you own or are authorised to list, and only a business you own or represent.</li>
            <li>Listings must be accurate, current and honest, including price, location, size and documents status. Photos must be of the actual property or product.</li>
            <li>Property listings expire after the period shown in your account (currently 60 days) unless renewed.</li>
            <li>Private owners may have a limited number of active listings at a time, shown when you list.</li>
          </ul>
        </TextSection>
        <TextSection title="6. Prohibited content">
          <p>You must not post anything that is false or misleading, fraudulent, offensive, discriminatory, illegal, infringes someone else’s rights, includes another person’s personal data without permission, or tries to take payment outside a genuine transaction. You must not scrape the site, collect other users’ contact details in bulk, or interfere with its security.</p>
        </TextSection>
        <TextSection title="7. Our moderation rights">
          <p>We review listings and profiles before they are published and may edit formatting, ask for changes, refuse, pause or remove any content, and suspend or close accounts that break these terms. We may keep records of removed content where the law requires or to prevent abuse.</p>
        </TextSection>
        <TextSection title="8. Third-party listings">
          <p>Listings by other users are their responsibility. We do not guarantee that any listing is accurate, available or lawful, or that any user will complete a transaction. Always view a property and check the title deed (carta) and lease documents before paying anything. Our <Link href="/help#safety">safety advice</Link> explains what to check.</p>
        </TextSection>
        <TextSection title="9. Verification badges">
          <p>“Listed”, “Claimed” and “Verified” describe the checks we have made, explained on our <Link href="/how-it-works">How it works</Link> page. A Verified badge means we checked documents on the date shown. It is not a guarantee of the quality of a business’s work.</p>
        </TextSection>
        <TextSection title={`10. Quotes from ${brand.divisions.supply}`}>
          <ul>
            <li>Prices on quotes are in Ethiopian Birr (ETB).</li>
            <li>Quotes are valid for 14 days unless the quote states otherwise. Prices of volatile materials such as steel and cement are confirmed on each quote.</li>
            <li>A quote is not a contract. An order is made only when you confirm the quote with us and we confirm payment and delivery terms with you.</li>
            <li>Prices and availability shown on product pages are a guide and may change before your quote is issued.</li>
          </ul>
        </TextSection>
        <TextSection title="11. Enquiries and contact details">
          <p>When you send an enquiry, we share your name, contact details and message with the recipient so they can reply. Contact details shown on listings may only be used to discuss that listing. Do not use them for marketing.</p>
        </TextSection>
        <TextSection title="12. Service requests and matching">
          <ul>
            <li>When you request a service, we send your request to up to three providers we believe can help, and they may contact you and send quotes. You choose whether to accept a quote.</li>
            <li>Any agreement for the work is between you and the provider. We are not a party to it, and we do not guarantee the work, price or timing. Agree everything in writing before you pay.</li>
            <li>Providers who receive requests must reply honestly, quote only for work they can do and keep customers’ details private. {brand.name} may receive a fee or commission from a provider for work that comes through the platform. This never changes the price we show you or the order of search results.</li>
          </ul>
        </TextSection>
        <TextSection title="13. Finance and insurance partners">
          <p>Where finance or insurance services are available, requests are passed to approved, licensed partners, who decide on eligibility, prices and terms and give you their own documents. {brand.name} does not give financial or insurance advice and is not a lender, insurer or broker.</p>
        </TextSection>
        <TextSection title="14. Jobs">
          <p>Where the jobs service is available, employers are responsible for their job adverts and for treating applicants fairly and lawfully. Employers must never ask candidates for money. Applicants’ details and CVs may only be used to recruit for the job applied for.</p>
        </TextSection>
        <TextSection title="15. People outside Ethiopia">
          <p>You may use {brand.name} from anywhere. Prices shown in other currencies are approximate and for guidance only; the price in Ethiopian Birr is the one that counts. Laws on owning, buying or renting property in Ethiopia, and on transferring money, may apply to you; check them with a qualified adviser before you commit.</p>
        </TextSection>
        <TextSection title="16. Trade accounts and Special Buys">
          <p>Trade accounts are for businesses we approve and may be closed if the account is misused. Trade prices are confidential to the account holder. Special Buys are available while the stated quantity lasts and until the end date shown.</p>
        </TextSection>
        <TextSection title="17. Intellectual property">
          <p>The {brand.name} name, logo and site design belong to us. You keep ownership of the content you upload, and you give us a licence to host, display, adapt (for example resize photos) and share it on {brand.name} and in our marketing of your listing, for as long as it is on the site and for a reasonable time after.</p>
        </TextSection>
        <TextSection title="18. Liability">
          <p>We provide the site with reasonable care, but we do not promise that it will always be available or error-free. To the extent the law allows, we are not liable for losses arising from dealings between users, from content posted by others, or for indirect losses. Nothing in these terms limits liability that cannot be limited by law.</p>
        </TextSection>
        <TextSection title="19. Changes">
          <p>We may update these terms. The date at the top shows the latest version. If a change is significant we will tell registered users by email.</p>
        </TextSection>
        {legal.governingLaw && (
          <TextSection title="20. Governing law">
            <p>These terms are governed by {legal.governingLaw}.</p>
          </TextSection>
        )}
        <TextSection title={legal.governingLaw ? '21. Contact' : '20. Contact'}>
          <p>
            Questions about these terms? <Link href="/contact">Contact us</Link>.
          </p>
        </TextSection>
      </Container>
    </>
  )
}
