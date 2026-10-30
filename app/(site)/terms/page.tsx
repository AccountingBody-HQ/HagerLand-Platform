import Link from 'next/link'
import { buildMetadata } from '@/lib/seo'
import { brand } from '@/lib/brand'
import { getBusinessDetails } from '@/lib/data/business'
import { amharicVersionOn, legalUpdated } from '@/lib/content/legal'
import { Container } from '@/components/ui/Layout'
import { PageHero, TextSection } from '@/components/content/PageHero'
import { LegalEntity } from '@/components/content/LegalEntity'
import { licenceText } from '@/components/content/LicenceNote'
import { readSupplySwitches } from '@/lib/supply/partner-switches'
import { readJobsSwitches } from '@/lib/jobs-switches'

export const revalidate = 3600
export const metadata = buildMetadata({ title: 'Terms of use', description: 'The terms for using HagerLand: listings, enquiries, quotes, estate agency, service requests, reviews, our role as a marketplace and a participant.', path: '/terms' })

export default async function TermsPage() {
  const [business, updated, jobsSwitches, amharicOn, supplySwitches] = await Promise.all([getBusinessDetails(), legalUpdated('terms'), readJobsSwitches(), amharicVersionOn(), readSupplySwitches()])
  const { legal } = business
  // Sections are numbered in order of appearance, so optional sections never leave a gap.
  let section = 0
  const n = (title: string) => `${++section}. ${title}`
  return (
    <>
      <PageHero crumb="Terms" title="Terms of use" intro={`Last updated ${updated}`} />
      <Container className="max-w-3xl space-y-10 py-12 sm:py-16">
        <TextSection title={n('About these terms')}>
          <p>These terms apply when you use {brand.name}, including browsing, creating an account, listing a property or business, sending an enquiry or requesting a quote. By using {brand.name} you agree to them. If you do not agree, please do not use the site.</p>
          <LegalEntity legal={legal} />
        </TextSection>
        <TextSection title={n(`What ${brand.name} is`)}>
          <p>{brand.name} is an online platform where people list and find property, construction materials, professionals and services in Ethiopia, and request quotes for work, including people who live abroad. Unless a listing is labelled as {brand.divisions.supply} or {brand.divisions.developments}, we are not a party to any agreement between you and another user, and we do not own, sell or let the properties listed by others.</p>
          <p>Some products on {brand.name} are sold by other businesses. Their product pages say “Sold by” and the business name, and the contract for those products is between you and that business.</p>
        </TextSection>
        <TextSection title={n('Our dual role')}>
          <p>{brand.name} also sells construction materials through {brand.divisions.supply}, offers estate agency services, and intends to develop homes through {brand.divisions.developments}. Our own products, services and projects are always clearly labelled. They are not ranked above other listings in organic search results, and any promoted placement is marked as such.</p>
        </TextSection>
        <TextSection title={n('Accounts')}>
          <ul>
            <li>You must give accurate details and keep your password secure. You are responsible for activity on your account.</li>
            <li>You must confirm your email address before you can list or publish anything.</li>
            <li>One person may belong to several business profiles. Only people authorised by a business may manage its profile.</li>
          </ul>
        </TextSection>
        <TextSection title={n('Listing rules')}>
          <ul>
            <li>You may only list a property you own or are authorised to list, and only a business you own or represent.</li>
            <li>Listings must be accurate, current and honest, including price, location, size and documents status. Photos must be of the actual property or product.</li>
            <li>Property listings expire after the period shown in your account (currently 60 days) unless renewed.</li>
            <li>Private owners may have a limited number of active listings at a time, shown when you list.</li>
          </ul>
        </TextSection>
        <TextSection title={n('Prohibited content')}>
          <p>You must not post anything that is false or misleading, fraudulent, offensive, discriminatory, illegal, infringes someone else’s rights, includes another person’s personal data without permission, or tries to take payment outside a genuine transaction. You must not scrape the site, collect other users’ contact details in bulk, or interfere with its security.</p>
        </TextSection>
        <TextSection title={n('Our moderation rights')}>
          <p>We review listings and profiles before they are published and may edit formatting, ask for changes, refuse, pause or remove any content, and suspend or close accounts that break these terms. We may keep records of removed content where the law requires or to prevent abuse.</p>
        </TextSection>
        <TextSection title={n('Third-party listings')}>
          <p>Listings by other users are their responsibility. We do not guarantee that any listing is accurate, available or lawful, or that any user will complete a transaction. Always view a property and check the title deed (carta) and lease documents before paying anything. Our <Link href="/help#safety">safety advice</Link> explains what to check. When we say we check listings, partners or businesses, we mean we review them before they appear and make the checks described on our How it works page. A check is not a guarantee.</p>
        </TextSection>
        <TextSection title={n('Verification badges')}>
          <p>“Listed”, “Claimed” and “Verified” describe the checks we have made, explained on our <Link href="/how-it-works">How it works</Link> page.</p>
          <p>A Verified badge means HagerLand checked the business&apos;s trade licence and tax number on the date shown. Verified badges are checked again every 12 months and can be removed at any time. It is not a guarantee of the business&apos;s work.</p>
        </TextSection>
        <TextSection title={n(`Quotes from ${brand.divisions.supply}`)}>
          <ul>
            <li>Prices on quotes are in Ethiopian Birr (ETB).</li>
            <li>Quotes are valid for 3 days unless the quote states otherwise. Prices of volatile materials such as steel and cement are confirmed on each quote.</li>
            <li>A quote is not a contract. An order is made only when you confirm the quote with us and we confirm payment and delivery terms with you.</li>
            <li>Prices and availability shown on product pages are a guide and may change before your quote is issued.</li>
          </ul>
        </TextSection>
        {/* QC-2 (W8): only while catalogue ordering is on (approved text). */}
        {supplySwitches.catalogueOrdering && (
          <TextSection title={n(`Buying from ${brand.divisions.supply}`)}>
            <ul>
              <li>When you buy from {brand.divisions.supply}, the seller is {brand.legalName}, {brand.legalAddress}.</li>
              <li>Prices are in Ethiopian Birr (ETB) and include VAT.</li>
              <li>When we reserve your order, we tell you the total and how long the reservation lasts. A reservation ends automatically if we do not receive your payment by then, and you are not charged.</li>
              <li>Pay only by one of the payment methods shown on your order page, and include your order reference. We give you an official receipt for every payment.</li>
              <li>We deliver in Addis Ababa. Your goods become yours, and our responsibility for them ends, when they are delivered.</li>
              <li>Please check your goods when they arrive. If anything is missing, damaged or not what you ordered, tell us as soon as you can.</li>
              <li>You can cancel before we confirm delivery is on its way, and we refund what you paid by the same method. After that, we accept returns of goods that are faulty or not what you ordered.</li>
              <li>Nothing in these terms affects your rights under Ethiopian consumer law.</li>
            </ul>
          </TextSection>
        )}
        <TextSection title={n('Enquiries and contact details')}>
          <p>When you send an enquiry, we share your name, contact details and message with the recipient so they can reply. Contact details shown on listings may only be used to discuss that listing. Do not use them for marketing.</p>
        </TextSection>
        <TextSection title={n('Service requests and matching')}>
          <ul>
            <li>When you request a service, we send your request to up to three providers at a time who we believe can help, and they may contact you and send quotes. You choose whether to accept a quote.</li>
            <li>Any agreement for the work is between you and the provider. We are not a party to it, and we do not guarantee the work, price or timing. Agree everything in writing before you pay.</li>
            <li>Providers who receive requests must reply honestly, quote only for work they can do and keep customers’ details private. {brand.name} may receive a fee or commission from a provider for work that comes through the platform. This never changes the price we show you or the order of search results.</li>
          </ul>
        </TextSection>
        <TextSection title={n('Finance and insurance partners')}>
          <p>Where finance or insurance services are available, requests are passed to approved, licensed partners, who decide on eligibility, prices and terms and give you their own documents. {brand.name} introduces you to partners; it does not give financial or insurance advice and is not a lender or insurer.</p>
          {business.licences.finance && <p>{licenceText('finance', business.licences.finance)}.</p>}
          {business.licences.insurance && <p>{licenceText('insurance', business.licences.insurance)}.</p>}
        </TextSection>
        <TextSection title={n('Jobs')}>
          <p>Employers are responsible for their job adverts and for treating applicants fairly and lawfully. Employers must never ask candidates for money. Applicants’ details and CVs may only be used to recruit for the job applied for. When {brand.name} recruits for an employer (a staffing requirement), the service and its fees are agreed with the employer in writing; candidates are never charged.</p>
          {/* QC-2 (W37): shown only while "Report this job" (jobs_reports_enabled) is on. */}
          {jobsSwitches.reportsEnabled && <p>Anyone can report a job; HagerLand reviews reports and may pause or remove a job.</p>}
          {/* Jobs Phase 4 (W27): shown only while the owner's private-client switch is on. */}
          {jobsSwitches.privateClientPosts && <p>HagerLand may post jobs for private clients, labelled &quot;Posted by HagerLand for a private client&quot;. HagerLand checks these jobs and handles the applications.</p>}
          {/* Jobs Phase 3 (W row 19): shown only while the owner's recruitment desk switch is on. */}
          {jobsSwitches.recruitmentDesk && (
            <p>The fee is either a fixed amount or a percentage of pay, as agreed in writing before work starts. If a person we place leaves within the replacement period in that agreement, we look for a replacement at no extra cost. Employers may use the details of people we introduce only for that requirement.</p>
          )}
          {business.licences.recruitment && <p>{licenceText('recruitment', business.licences.recruitment)}.</p>}
        </TextSection>
        <TextSection title={n('People outside Ethiopia')}>
          <p>You may use {brand.name} from anywhere. Prices shown in other currencies are approximate and for guidance only; the price in Ethiopian Birr is the one that counts. Laws on owning, buying or renting property in Ethiopia, and on transferring money, may apply to you; check them with a qualified adviser before you commit.</p>
        </TextSection>
        <TextSection title={n('Trade accounts and Special Buys')}>
          <p>Trade accounts are for businesses we approve and may be closed if the account is misused. Trade prices are confidential to the account holder. Special Buys are available while the stated quantity lasts and until the end date shown.</p>
        </TextSection>
        <TextSection title={n(`${brand.name} estate agency: terms of business`)}>
          <p>When {brand.name} acts as your estate agent (selling, letting, buyer representation or sourcing), these points apply in addition to the written agreement we sign with you.</p>
          <ul>
            <li>Instructions: we act for you only once you have signed a written agreement. It sets out the services, whether the agency is sole or multi-agency, how long it lasts and how either side can end it.</li>
            <li>Fees: our fees are agreed with you in writing before we start{business.agencyFeeSchedule ? ', and our published fee schedule is shown on our agency pages' : ''}. We do not charge a fee that is not in your agreement.</li>
            <li>Viewings: we arrange viewings in person or by video call. Please tell us in good time if you cannot attend.</li>
            <li>Offers: an offer made through {brand.name} is an expression of interest only. It does not bind the buyer or the owner. A sale is agreed only when a written sale agreement is signed.</li>
            <li>Tenant applications: applicants give us their details and, if they choose, documents, so that we and the landlord can consider the application. A tenancy starts only when a written tenancy agreement is signed. Never pay rent or a deposit before that.</li>
            <li>Listings we market are labelled “Marketed by {brand.name}” and are never given hidden priority in search results.</li>
          </ul>
          {business.licences.estate_agency && <p>{licenceText('estate_agency', business.licences.estate_agency)}.</p>}
        </TextSection>
        <TextSection title={n(`${brand.divisions.propertyCare} and the owner portal`)}>
          <p>Property management is provided under a written agreement with each owner, which sets out the services, fees and how rent is collected and paid to the owner. Owners whose property we manage can see inspections, statements, documents and messages in the owner portal once we link it to their account. Keep your sign-in details private.</p>
          {business.licences.property_management && <p>{licenceText('property_management', business.licences.property_management)}.</p>}
        </TextSection>
        <TextSection title={n('Building projects')}>
          <p>When you start a building project, we create the service requests and materials quote you ask for and match them to providers as described above. Any agreement for design, building or materials is between you and the provider (or {brand.divisions.supply} for materials).</p>
        </TextSection>
        <TextSection title={n('Reviews')}>
          <ul>
            <li>Only a customer who chose a provider for a job through {brand.name} can review that provider, once per job. We never invent, buy or copy reviews from elsewhere.</li>
            <li>We check every review before it is published and may refuse reviews that are abusive, off-topic, include personal details or are not about the job. We do not change what reviewers write.</li>
            <li>The provider may publish one reply to each review.</li>
          </ul>
        </TextSection>
        <TextSection title={n('Intellectual property')}>
          <p>{brand.name}® is a registered trade mark of AccountingBody Ltd in the United Kingdom. The {brand.name} name, logo and site design are protected, and you may not use them without written permission. You keep ownership of the content you upload, and you give us a licence to host, display, adapt (for example resize photos) and share it on {brand.name} and in our marketing of your listing, for as long as it is on the site and for a reasonable time after.</p>
        </TextSection>
        <TextSection title={n('Liability')}>
          <p>We provide the site with reasonable care, but we do not promise that it will always be available or error-free. To the extent the law allows, we are not liable for losses arising from dealings between users, from content posted by others, or for indirect losses. Nothing in these terms limits liability that cannot be limited by law.</p>
        </TextSection>
        <TextSection title={n('Changes')}>
          <p>We may update these terms. The date at the top shows the latest version. If a change significantly affects you, we will tell you before it applies.</p>
          {/* Jobs Phase 5 (W20): only while the Amharic version or Amharic for Jobs is on. */}
          {amharicOn && <p>These terms are written in English. If a translation differs, the English version applies.</p>}
        </TextSection>
        {/* QC-2 (W4): always shown; the Settings "governing law" value is no longer used here. */}
        <TextSection title={n('Governing law')}>
          <p>These terms are governed by the laws of the Federal Democratic Republic of Ethiopia, and the courts of Addis Ababa deal with any dispute. If you are a consumer living outside Ethiopia, you keep any rights that the law where you live gives you and that cannot be removed by agreement.</p>
        </TextSection>
        <TextSection title={n('Contact')}>
          <p>
            Questions about these terms? <Link href="/contact">Contact us</Link>.
          </p>
        </TextSection>
      </Container>
    </>
  )
}
