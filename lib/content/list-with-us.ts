export interface Audience {
  id: string
  title: string
  who: string
  get: string[]
  how: string
  cta: { label: string; href: string }
}

export const AUDIENCES: Audience[] = [
  {
    id: 'owners',
    title: 'Private owners',
    who: 'You own a home, apartment, plot or commercial space and want to sell or let it yourself.',
    get: ['A listing seen by buyers and renters across Ethiopia and abroad', 'Enquiries straight to your phone, WhatsApp and email', 'Simple tools to pause, renew or archive your listing'],
    how: 'Create an account, add your property with at least three photos, and we review it, usually within one business day.',
    cta: { label: 'List your property', href: '/signup?type=owner' },
  },
  {
    id: 'agents',
    title: 'Estate agents & brokers',
    who: 'You list properties on behalf of owners and want more buyers and tenants.',
    get: ['An agency profile with all your listings in one place', 'The Verified badge once we check your licence', 'A lead inbox to track every enquiry'],
    how: 'Sign up as an agent, create your agency profile, then add listings. They appear under your agency name.',
    cta: { label: 'Join as an agent', href: '/signup?type=agent' },
  },
  {
    id: 'developers',
    title: 'Developers',
    who: 'You build and sell apartments, homes, condominiums or commercial projects.',
    get: ['A page for each development with unit types, prices and payment plan', 'Individual units listed and linked to the development', 'Register-interest enquiries from buyers'],
    how: 'Sign up as a developer, add your company, then add developments and link unit listings to them.',
    cta: { label: 'Join as a developer', href: '/signup?type=developer' },
  },
  {
    id: 'professionals',
    title: 'Contractors & professionals',
    who: 'You are an architect, engineer, contractor, tradesperson or other construction professional.',
    get: ['A profile listed under every service you offer and every area you cover', 'Portfolio projects with photos', 'Enquiries from people planning to build or renovate'],
    how: 'Sign up as a professional, choose your services and areas, add your work, and submit your documents to get Verified.',
    cta: { label: 'Join as a professional', href: '/signup?type=professional' },
  },
  {
    id: 'suppliers',
    title: 'Suppliers & manufacturers',
    who: 'You sell or make construction materials, fittings, tools or equipment.',
    get: ['A supplier profile in our directory, filtered by what you supply', 'Enquiries from builders, contractors and homeowners', 'The Verified badge once we check your documents'],
    how: 'Sign up as a supplier, add the categories you supply and the areas you deliver to.',
    cta: { label: 'Become a supplier', href: '/signup?type=supplier' },
  },
]

export const LIST_WITH_US_FAQ = [
  { question: 'How long does the review take?', answer: 'We aim to review listings and profiles within one business day. You get an email as soon as yours is live, or if anything needs changing.' },
  { question: 'Which documents do I need to get Verified?', answer: 'Your trade licence and TIN certificate. Contractors also add their licence certificate showing category and grade, and agents their broker licence if they have one.' },
  { question: 'How long does a property listing stay live?', answer: 'Sixty days. We remind you a week before it expires, and you can renew it in one click.' },
  { question: 'Can I manage several businesses?', answer: 'Yes. One account can belong to several organisations, and you can switch between them in your account.' },
]
