/**
 * HagerLand acting as estate agent (spec 24.7, PLATFORM_VISION §3). Plain descriptions of what we do;
 * no fees, guarantees or sales figures are stated.
 */
export interface AgencyService {
  slug: string
  title: string
  short: string
  intro: string
  includes: string[]
  steps: { title: string; text: string }[]
  topic: string
  message: string
  forWho: string
  /** Which side of the agency offers it: sales follow Buy & Sell Direct, lettings follow Rent & Let Direct. */
  side: 'sales' | 'lettings'
}

export const AGENCY_SERVICES: AgencyService[] = [
  {
    slug: 'sell',
    title: 'Sell with HagerLand',
    short: 'We market your property, arrange viewings and negotiate for you.',
    intro: 'Selling a home, land or a commercial property in Ethiopia takes time and local knowledge. We can handle the sale for you, from the asking price to the signed agreement.',
    includes: ['Advice on the asking price, with a market appraisal if you want one', 'Photos and a clear listing marked “Marketed by HagerLand”', 'Checking buyers and arranging viewings', 'Negotiating offers on your behalf', 'Coordinating the paperwork with lawyers and the authorities'],
    steps: [
      { title: 'Talk to us', text: 'Tell us about the property and your plans.' },
      { title: 'Agree terms', text: 'We confirm in writing what we will do and our fee.' },
      { title: 'Market and show', text: 'We list it, answer enquiries and arrange viewings.' },
      { title: 'Agree a sale', text: 'We negotiate and coordinate until the sale completes.' },
    ],
    topic: 'Agency: selling',
    message: "I'd like HagerLand to help me sell a property.",
    forWho: 'Owners in Ethiopia and owners abroad',
    side: 'sales',
  },
  {
    slug: 'let',
    title: 'Let with HagerLand',
    short: 'We find and check tenants, and can manage the tenancy.',
    intro: 'Letting out a home or commercial space is easier with someone on the ground. We find tenants, check them and, if you want, look after the tenancy afterwards.',
    includes: ['Advice on the rent and the number of months in advance', 'Marketing, enquiries and viewings', 'Checking tenants before they move in', 'A written tenancy agreement', 'Optional ongoing management through HagerLand Property Care'],
    steps: [
      { title: 'Talk to us', text: 'Tell us about the property and the tenant you want.' },
      { title: 'Agree terms', text: 'We confirm our service and fee in writing.' },
      { title: 'Find a tenant', text: 'We market the property and check applicants.' },
      { title: 'Move in', text: 'We handle the agreement and the hand-over.' },
    ],
    topic: 'Agency: letting',
    message: "I'd like HagerLand to help me let a property.",
    forWho: 'Landlords in Ethiopia and abroad',
    side: 'lettings',
  },
  {
    slug: 'buyer-representation',
    title: 'Buyer representation',
    short: 'We search, check and negotiate for you as a buyer.',
    intro: 'If you want someone on your side when buying, we can search for suitable property, check what is on offer and negotiate for you.',
    includes: ['Understanding exactly what you want and your budget', 'Searching listings and off-market options', 'Viewing coordination, including video viewings for buyers abroad', 'Checks on documents such as the title deed (carta) and lease, with a lawyer', 'Negotiating the price and terms for you'],
    steps: [
      { title: 'Your brief', text: 'Location, budget, type and timing.' },
      { title: 'Shortlist', text: 'We find and check suitable properties.' },
      { title: 'View', text: 'In person or by video, with our notes.' },
      { title: 'Negotiate', text: 'We agree price and terms on your behalf.' },
    ],
    topic: 'Agency: buyer representation',
    message: "I'd like HagerLand to help me find and buy a property.",
    forWho: 'Buyers in Ethiopia and abroad',
    side: 'sales',
  },
  {
    slug: 'property-sourcing',
    title: 'Property sourcing for diaspora buyers',
    short: 'Buying from abroad, with someone you can trust on the ground.',
    intro: 'Buying in Ethiopia while you live abroad is hard to do well. We find property that fits your brief, check it, show it to you by video and help you through the purchase, including investment property.',
    includes: ['A brief agreed with you at a time that suits your time zone', 'Searching for homes, land and investment property', 'Video viewings and written reports with photos', 'Due diligence with lawyers: ownership, title deed and lease', 'Negotiation and help with the purchase steps'],
    steps: [
      { title: 'Call', text: 'We agree your brief and budget.' },
      { title: 'Search', text: 'We find and check options for you.' },
      { title: 'Choose', text: 'Video viewings and reports help you decide.' },
      { title: 'Buy', text: 'We negotiate and coordinate the purchase.' },
    ],
    topic: 'Agency: diaspora property sourcing',
    message: "I live abroad and would like HagerLand to find a property for me in Ethiopia.",
    forWho: 'Ethiopians abroad and investors',
    side: 'sales',
  },
  {
    slug: 'developer-sales',
    title: 'Developer sales',
    short: 'Sales and marketing for new developments.',
    intro: 'For developers: we can market and sell units in your project to buyers in Ethiopia and abroad, with clear information on plans, prices and payment plans.',
    includes: ['A development page and unit listings on HagerLand', 'Handling enquiries and registering interest', 'Viewings and show-flat coordination', 'Reaching buyers abroad through Diaspora Services', 'Regular reports on enquiries and sales'],
    steps: [
      { title: 'Meet', text: 'We learn about your project and timeline.' },
      { title: 'Agree', text: 'Scope, reporting and fees in writing.' },
      { title: 'Launch', text: 'Development page, listings and marketing.' },
      { title: 'Sell', text: 'We manage enquiries through to reservation.' },
    ],
    topic: 'Agency: developer sales',
    message: "I'm a developer and would like to discuss sales and marketing for a project.",
    forWho: 'Real-estate developers',
    side: 'sales',
  },
  {
    slug: 'landlords',
    title: 'Landlord services',
    short: 'Let only, let and manage, or management only.',
    intro: 'Choose how much you want HagerLand to do. We can find you a tenant, find a tenant and look after the tenancy, or look after a property you have already let.',
    includes: [
      'Let only: rent advice, marketing, viewings, tenant checks and a written tenancy agreement',
      'Let and manage: everything in let only, then rent collection, repairs and regular inspections through HagerLand Property Care',
      'Management only: HagerLand Property Care for a property that already has a tenant',
      'A rent-ready checklist so the property is ready before marketing starts',
      'Renewal and notice dates tracked and reminded',
    ],
    steps: [
      { title: 'Choose a service', text: 'Let only, let and manage, or management only.' },
      { title: 'Agree terms', text: 'Our service and fee confirmed in writing.' },
      { title: 'Get rent-ready', text: 'We go through the checklist with you.' },
      { title: 'Let and look after', text: 'We find the tenant and, if you choose, manage the tenancy.' },
    ],
    topic: 'Agency: landlord services',
    message: "I'm a landlord and would like to talk about letting or managing my property.",
    forWho: 'Landlords in Ethiopia and abroad',
    side: 'lettings',
  },
]

/** The agency services in PLATFORM_VISION §3, and where each is offered. */
export const AGENCY_CAPABILITIES: { label: string; slug: string }[] = [
  { label: 'Property sales', slug: 'sell' },
  { label: 'Property letting', slug: 'let' },
  { label: 'Buyer representation', slug: 'buyer-representation' },
  { label: 'Seller representation', slug: 'sell' },
  { label: 'Property sourcing', slug: 'property-sourcing' },
  { label: 'Property marketing', slug: 'sell' },
  { label: 'Market appraisal coordination', slug: 'sell' },
  { label: 'Viewing coordination', slug: 'buyer-representation' },
  { label: 'Negotiation assistance', slug: 'buyer-representation' },
  { label: 'Diaspora property acquisition', slug: 'property-sourcing' },
  { label: 'Developer sales', slug: 'developer-sales' },
  { label: 'Investment property sourcing', slug: 'property-sourcing' },
]
