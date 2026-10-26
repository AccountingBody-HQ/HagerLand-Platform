import Link from 'next/link'
import { buildMetadata } from '@/lib/seo'
import { brand } from '@/lib/brand'
import { getBusinessDetails } from '@/lib/data/business'
import { legalUpdated } from '@/lib/content/legal'
import { Container } from '@/components/ui/Layout'
import { PageHero, TextSection } from '@/components/content/PageHero'
import { LegalEntity } from '@/components/content/LegalEntity'

export const revalidate = 3600
export const metadata = buildMetadata({ title: 'Privacy policy', description: 'What personal information HagerLand collects, why we use it, who we share it with, how long we keep it, and your rights, including getting a copy of your data.', path: '/privacy' })

export default async function PrivacyPage() {
  const [business, updated] = await Promise.all([getBusinessDetails(), legalUpdated('privacy')])
  return (
    <>
      <PageHero crumb="Privacy" title="Privacy policy" intro={`Last updated ${updated}`} />
      <Container className="max-w-3xl space-y-10 py-12 sm:py-16">
        <TextSection title="Who we are">
          <p>This policy explains how {brand.name} handles personal information.</p>
          <LegalEntity legal={business.legal} />
        </TextSection>
        <TextSection title="What we collect">
          <ul>
            <li><strong>Account details:</strong> your name, email, phone number, password (stored securely by our authentication provider) and contact preferences.</li>
            <li><strong>Listings and profiles:</strong> the property, business and portfolio details and photos you add, and the contact details you choose to show.</li>
            <li><strong>Enquiries:</strong> your name, phone, email, message and the listing you contacted.</li>
            <li><strong>Quote requests:</strong> your contact details, delivery area and address, the items you need and any files you upload.</li>
            <li><strong>Service requests:</strong> your contact details, where the work is, what you need, your answers to the questions and any photos or plans you add. Providers we match you with add their quotes.</li>
            <li><strong>Property Care and interest registrations:</strong> the details you give when you ask about Property Care, register interest in a service that is coming soon or apply to become a partner.</li>
            <li><strong>Trade accounts:</strong> your business name, type, phone and tax number if you give it.</li>
            <li><strong>Verification documents:</strong> trade licences, TIN certificates and similar documents you upload to get Verified or to claim a business.</li>
            <li><strong>Jobs:</strong> when you apply for a job, your name, contact details, cover note and CV. If you create a candidate profile, your skills, qualifications, experience, availability and CV. If you apply by phone or join the worker register: your name, phone, trade, area, preferred language, how you want to be contacted, and that you confirmed you are 18 or older. If HagerLand&apos;s recruitment team introduces you to an employer: that you agreed, when and how, the employer, and whether you were hired.</li>
            <li><strong>Reports:</strong> if you report a job or listing, your reason and anything you write, your phone or email if you give them, and a coded version of your internet address so we can stop repeated reports.</li>
            <li><strong>Estate agency:</strong> when you ask us to value, sell or let a property, book a viewing, make an offer or apply to rent, your contact details, the property, your preferred times and time zone, your offer or application (work, income note, move-in date, number of people) and any documents you add. We keep a contact record for each person we deal with, including whether and when you agreed to receive property emails.</li>
            <li><strong>Buying and renting requirements:</strong> if you ask us to look for property for you, what you are looking for (budget, areas, type, bedrooms), so we can send you matching listings with your agreement.</li>
            <li><strong>Tenancies and managed properties:</strong> tenancy details (parties, dates, rent, deposit) and, for properties we manage, inspection reports and photos, statements, the maintenance log, documents and messages in the owner portal.</li>
            <li><strong>Building projects:</strong> your plot, plans, budget and the services you need.</li>
            <li><strong>Reviews:</strong> the rating and words you write about a provider you chose; your first name is shown with it.</li>
            <li><strong>Newsletter:</strong> your email, name if given, and when and how you agreed to receive it.</li>
            <li><strong>Contact reveals:</strong> when you reveal a phone number or other contact detail, we record which listing and a one-way coded version of your internet address, to prevent bulk copying.</li>
            <li><strong>Usage analytics:</strong> anonymous, cookieless statistics about which pages are visited and how fast they load. These do not identify you.</li>
          </ul>
          <p>Photos you upload are re-saved by us, which removes hidden location data (GPS) and other camera information.</p>
        </TextSection>
        <TextSection title="Why we use it">
          <ul>
            <li>To run your account and show your listings and profile.</li>
            <li>To pass your enquiry or quote request to the right person and let them reply.</li>
            <li>To match a service request with up to three suitable providers, and to keep a record of the work and any fee or commission a provider owes us.</li>
            <li>To review listings and businesses, keep the marketplace safe and prevent fraud and abuse.</li>
            <li>To send you service emails, such as listing approvals, expiry reminders and quote updates.</li>
            <li>To send you news and offers, only if you have chosen to receive them. You can opt out at any time.</li>
          </ul>
        </TextSection>
        <TextSection title="Who we share it with">
          <ul>
            <li><strong>The people you contact:</strong> when you send an enquiry, the lister or business receives your name, contact details and message.</li>
            <li><strong>Employers you apply to:</strong> the employer receives your application and CV. CVs are never public. Your candidate profile is private unless you choose to make it visible to verified businesses and businesses that have had a job approved by HagerLand, and even then they see neither your contact details nor your CV.</li>
            <li><strong>Employers we recruit for:</strong> when HagerLand recruits for an employer, we share your name, trade and the contact details you choose, but only after you agree to be introduced to that employer. You can say no or change your mind at any time.</li>
            <li><strong>Private clients we recruit for:</strong> when HagerLand posts a job for a private client, your application stays with HagerLand. The client sees your details only if you agree to be introduced (as for any employer we recruit for).</li>
            <li><strong>Providers matched to your request:</strong> up to three providers receive your request and contact details so they can quote. We tell you who they are on your request page.</li>
            <li><strong>Finance and insurance partners:</strong> where these services are available and you ask for them, we pass your request to an approved, licensed partner. They handle your information under their own privacy policy.</li>
            <li><strong>Owners and landlords we act for:</strong> when you book a viewing, make an offer or apply to rent a property we market, we share your details, offer or application with the owner so they can decide. We do not share documents you upload beyond what is needed to consider the application.</li>
            <li><strong>Providers you review:</strong> your first name, rating and review are published on their profile after we check them.</li>
            <li><strong>Visitors to your listing:</strong> the contact details you choose to show are revealed to visitors who ask for them.</li>
            <li><strong>Service providers who run the site for us:</strong> Supabase (database, file storage and sign-in), Vercel (hosting), Resend (email), Cloudflare (bot protection) and Google (maps on listing pages). They process data only on our instructions.</li>
            <li><strong>Authorities:</strong> where the law requires it.</li>
          </ul>
          <p>We do not sell personal information.</p>
        </TextSection>
        <TextSection title="People outside Ethiopia">
          <p>Many people use {brand.name} from abroad. Our service providers may store and process information outside Ethiopia. We protect it in the same way wherever it is processed, and we only use providers that keep it secure.</p>
        </TextSection>
        <TextSection title="How long we keep it">
          <ul>
            <li>Account and listing details: while your account is open, and removed within 30 days of a deletion request.</li>
            <li>Enquiries: 24 months.</li>
            <li>Verification documents: deleted 90 days after our decision, unless we need them to deal with a dispute or fraud.</li>
            <li>Contact reveal records: 12 months.</li>
            <li>Registrations of interest in services that are coming soon: 24 months.</li>
            <li>CVs and other details sent with job applications (your name, contact details and cover note): deleted 12 months after the application. Your candidate profile and its CV: until you delete them.</li>
            <li>If you are hired through HagerLand&apos;s recruitment service, we keep your name, contact details and the placement record for as long as we need them for our fee and accounting records, then delete them. Your CV is still deleted after 12 months.</li>
            <li>Records of people our recruitment team contacted for a role but who were not hired: deleted 12 months after the last contact.</li>
            <li>Job reports: your details, contact and the coded internet address are deleted 12 months after the report; the reason and what we did about it are kept.</li>
            <li>Worker register: deleted 12 months after you last updated it.</li>
            <li>Viewings, offers and applications to rent: 24 months after the last activity, unless they lead to a sale or tenancy, which we keep for as long as the law requires for our records.</li>
            <li>Agency contact records and requirements: while we act for you or you want matching listings, and removed on request.</li>
            <li>Newsletter: until you unsubscribe (one click in every email).</li>
          </ul>
        </TextSection>
        <TextSection title="Your rights">
          <p>We handle personal information in line with the data protection laws that apply to us and to you, including Ethiopia’s personal data protection law and, for people in the UK, the UK GDPR. We use your information to provide the services you ask for, to keep the platform safe, to meet legal duties and, for news and offers, only with your consent.</p>
          <p className="mt-3">You can see and update your details in your account, download a copy of your data (My account → Settings → Download my data), ask us to correct or delete it, and object to marketing. To delete your account, go to My account → Settings. For anything else, <Link href="/contact">contact us</Link>.</p>
        </TextSection>
        <TextSection title="Security">
          <p>Access to personal information is restricted, verification documents, applications and inspection photos are stored privately and opened through links that expire after 10 minutes, and contact details are only released one at a time on request.</p>
          <p className="mt-3">Our staff use individual accounts with two-factor sign-in, see only the areas their role needs, and every action they take is recorded in an audit log.</p>
        </TextSection>
        <TextSection title="Changes">
          <p>We will update this policy when our practices change. The date at the top shows the latest version.</p>
        </TextSection>
      </Container>
    </>
  )
}
