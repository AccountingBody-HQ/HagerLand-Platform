export interface FaqGroup {
  id: string
  title: string
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
