import type { VerticalKey } from '@/lib/verticals'

export interface FaqGroup {
  id: string
  title: string
  /** Shown only while this vertical is live (so help never describes a service that is not open yet). */
  liveVertical?: VerticalKey
  items: { question: string; answer: string }[]
}

export const HELP_FAQ: FaqGroup[] = [
  {
    id: 'safety',
    title: 'Buying and renting safely',
    items: [
      { question: 'How do I avoid scams?', answer: 'Never pay a deposit or fee before you have viewed the property in person and checked the ownership documents. Be wary of prices far below similar properties, and of anyone who pressures you to pay quickly or to a personal account.' },
      { question: 'Which documents should I ask to see?', answer: 'Ask to see the title deed (carta) and the lease documents for the land, and check that the name on them matches the person selling or letting, or that they hold a valid authorisation from the owner. For condominiums, ask for the condominium title. A property lawyer can check documents for you.' },
      { question: 'How should I arrange a viewing?', answer: 'Meet in daylight, take someone with you, and tell a friend where you are going. Agree the time and address through HagerLand messages, WhatsApp or phone so there is a record.' },
      { question: 'What about off-plan purchases?', answer: "Check the developer's licence and the project's permits, ask for the payment plan in writing, and never pay without a signed contract. Look at the developer's other completed projects." },
    ],
  },
  {
    id: 'requests',
    title: 'Getting quotes for work',
    items: [
      { question: 'How does a service request work?', answer: 'Choose the service, describe the job and send it. You do not need an account. HagerLand sends it to up to three suitable providers who work in your area, and their quotes appear on your private request page.' },
      { question: 'Is it free to ask for quotes?', answer: 'Yes. You pay only the provider you choose, for the work you agree with them.' },
      { question: 'I lost the link to my request.', answer: 'Go to www.hagerland.com/requests/resend (the expired request page links there too) and enter the email you used. If a request exists, we email you a fresh link.' },
      { question: 'What if it is an emergency?', answer: 'Mark the request as an emergency and we look at it first. If anyone is in danger, call the emergency services.' },
    ],
  },
  {
    id: 'agency',
    title: 'Viewings, offers and renting through HagerLand',
    liveVertical: 'property',
    items: [
      { question: 'How do I book a viewing?', answer: 'On a listing marked “Marketed by HagerLand”, choose “Book a viewing”, say whether you want to view in person or by video call and when suits you. We confirm a time by email and remind you before the viewing. For other listings, contact the lister through the listing.' },
      { question: 'Is my offer binding?', answer: 'No. An offer made through HagerLand is an expression of interest. Nothing is agreed until a written sale agreement is signed by both sides.' },
      { question: 'How do I apply to rent?', answer: 'On a let marked “Marketed by HagerLand”, choose “Apply to rent”. We check your application with the landlord and tell you the decision. Never pay rent or a deposit before you sign a written tenancy agreement.' },
      { question: 'Where can I follow my viewings and offers?', answer: 'Sign in with the same email you used and open My account → Viewings, offers and tenancies.' },
    ],
  },
  {
    id: 'reviews',
    title: 'Reviews',
    items: [
      { question: 'Who can write a review?', answer: 'Only a customer who chose a provider for a job through HagerLand. The review box appears on your request page once you have chosen the provider. One review per job.' },
      { question: 'Why is my review not showing yet?', answer: 'We check every review before it appears. We publish reviews about the job and do not change what you wrote.' },
    ],
  },
  {
    id: 'listing',
    title: 'Listing a property',
    items: [
      { question: 'How do I list a property?', answer: 'Create an account, then choose “List a property”. Add the basics, location, details, at least three photos and how buyers can contact you, then submit it for review.' },
      { question: 'How long does a listing stay live?', answer: 'Sixty days. We email you a week before it expires, and you can renew it in one click from your account.' },
      { question: 'Can I edit a live listing?', answer: 'Yes. Your changes are reviewed quickly while the current version stays live.' },
      { question: 'Why was my listing not approved?', answer: 'We email you the reason, for example missing details or unclear photos. Edit the listing and submit it again.' },
    ],
  },
  {
    id: 'accounts',
    title: 'Your account',
    items: [
      { question: 'I did not get the confirmation email.', answer: 'Check your spam folder. If it is not there after a few minutes, try signing up again with the same email, or use “Email me a sign-in link” on the sign-in page.' },
      { question: 'How do I change my email or password?', answer: 'Go to My account → Settings.' },
      { question: 'How do I delete my account?', answer: 'Go to My account → Settings → Delete account. We remove your account and personal details within 30 days.' },
      { question: 'Can I get a copy of my data?', answer: 'Yes. Go to My account → Settings → Download my data.' },
      { question: 'How do I add colleagues to my business?', answer: 'Owners and admins can invite people from My account → Team. The invitation link works for 7 days and only for the email address it was sent to.' },
    ],
  },
  {
    id: 'supplies',
    title: 'Supplies and quotes',
    items: [
      { question: 'How do I get a quote?', answer: 'Add products to your quote list and send it, or upload your materials list or bill of quantities. We reply with one clear price including delivery.' },
      { question: 'Do I pay online?', answer: 'No. You confirm the quote with us, and payment and delivery are arranged directly with you.' },
      { question: 'How long is a quote valid?', answer: 'Quotes are valid for 14 days unless the quote says otherwise. Prices of steel and cement change often, so we confirm the price on each quote.' },
      { question: 'What if the product I need is not listed?', answer: 'Add it to your quote list as a custom item, or include it in your materials list. We can source many items we do not list online.' },
    ],
  },
  {
    id: 'abroad',
    title: 'If you live abroad',
    liveVertical: 'diaspora',
    items: [
      { question: 'Can I buy or build in Ethiopia from abroad?', answer: 'Yes. Search and contact listers as anyone else, request quotes for building work, and ask HagerLand Property Care about looking after your property. Always check ownership documents and agree everything in writing.' },
      { question: 'Can I see prices in my own currency?', answer: 'Yes. Choose a currency at the bottom of the page. Converted prices are approximate and labelled "approx."; the price in birr is the one that counts.' },
    ],
  },
  {
    id: 'jobs',
    title: 'Jobs',
    liveVertical: 'jobs',
    items: [
      { question: 'Who can see my CV?', answer: 'Only the employers you apply to, and HagerLand. Your candidate profile is private unless you choose to show it to approved employers, and even then they never see your contact details or CV.' },
      { question: 'How long do you keep CVs?', answer: 'CVs sent with applications are deleted 12 months after the application. You can delete your candidate profile and its CV at any time.' },
      { question: 'Should I pay to get a job?', answer: 'Never. No employer on HagerLand may ask candidates for money. Report any advert that does.' },
    ],
  },
  {
    id: 'verification',
    title: 'Verification',
    items: [
      { question: 'What does the Verified badge mean?', answer: "It means our team checked the business's trade licence, and for contractors their licence category and grade. The badge shows the date of the check." },
      { question: 'How do I get Verified?', answer: 'Go to My account → Company profile → Get Verified and upload your trade licence and TIN certificate. We check them within one to two business days.' },
      { question: 'My business is listed but I did not add it.', answer: 'We add some businesses from public information so customers can find them. Use “Claim this business” on your profile to take control of it.' },
    ],
  },
  {
    id: 'reporting',
    title: 'Reporting problems',
    items: [
      { question: 'How do I report a listing or profile?', answer: 'Use the “Report this listing” or “Report this profile” link on the page. Tell us what is wrong and, if you like, how to contact you.' },
      { question: 'What happens after I report something?', answer: 'Our team reviews every report. If a listing breaks our rules we remove it, and we may suspend the account behind it.' },
    ],
  },
]
