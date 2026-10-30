import type { VerticalKey } from '@/lib/verticals'

export type PartnerType = 'bank' | 'lender' | 'insurer' | 'broker' | 'microfinance' | 'recruiter' | 'other'

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  bank: 'Bank',
  lender: 'Lender or housing finance provider',
  insurer: 'Insurer',
  broker: 'Broker',
  microfinance: 'Microfinance institution',
  recruiter: 'Recruitment agency',
  other: 'Other',
}

export interface Option {
  value: string
  label: string
}

/**
 * Copy for a vertical's "Coming soon" landing page (spec 24.2): what the service will be,
 * who it is for and how it will work. Plain statements of intent only: no prices, providers,
 * rates or claims of current activity.
 */
export interface ComingSoonContent {
  headline: string
  what: string[]
  whoFor: string[]
  how: { title: string; text: string }[]
  /** Interest form: optional "what are you interested in" choices. */
  categories?: Option[]
  categoryLabel?: string
  /** Interest form: optional "I am…" choices (e.g. employer or candidate). */
  audiences?: Option[]
  partner?: { intro: string; types: PartnerType[] }
  /** Shown under the headline, e.g. the licensed-partners statement. */
  notice?: string
  /** Live parts of HagerLand that already help with this need. */
  related: Option[]
}

const opts = (labels: string[]): Option[] =>
  labels.map((label) => ({ value: label.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), label }))

export const FINANCE_CATEGORIES = opts([
  'Mortgages',
  'Diaspora mortgages',
  'Housing finance',
  'Land financing',
  'Construction finance',
  'Development finance',
  'Bridging finance',
  'Commercial property finance',
  'Home-improvement finance',
  'Supplier credit',
  'Equipment finance',
])

export const INSURANCE_CATEGORIES = opts([
  'Home insurance',
  'Building insurance',
  'Landlord insurance',
  'Contents insurance',
  'Commercial property insurance',
  'Construction insurance',
  'Development and project insurance',
  'Contractor insurance',
  'Professional indemnity insurance',
  'Public liability insurance',
])

export const JOB_CATEGORIES = opts([
  'Construction',
  'Engineering',
  'Architecture',
  'Skilled trades',
  'Project management',
  'Site management',
  'Quantity surveying',
  'Property',
  'Estate agency',
  'Sales',
  'Procurement',
  'Administration',
  'Finance',
  'Graduate opportunities',
  'Temporary labour',
  'Permanent recruitment',
  'Executive recruitment',
  'International placements',
])

/**
 * Categories no form or filter offers: overseas placement is hidden until a lawyer confirms the rules (Jobs decision 3).
 * They stay in JOB_CATEGORIES so jobs and registrations that already use them keep their label.
 */
export const HIDDEN_JOB_CATEGORIES: readonly string[] = ['international-placements']
export const OFFERED_JOB_CATEGORIES = JOB_CATEGORIES.filter((c) => !HIDDEN_JOB_CATEGORIES.includes(c.value))

const PARTNERS_STATEMENT = 'These services will be provided through approved, licensed partners. HagerLand does not give financial or insurance advice.'

export const COMING_SOON: Record<VerticalKey, ComingSoonContent> = {
  property: {
    headline: 'Ethiopia’s property marketplace is on its way',
    what: ['Homes, apartments, land and commercial property for sale and to rent across Ethiopia, from owners, agents and developers.', 'Every listing will be reviewed before it goes live, and listings expire unless they are renewed, so what you see is current.'],
    whoFor: ['People buying or renting in Ethiopia', 'Ethiopians abroad buying at home', 'Owners, agents and developers with property to list'],
    how: [
      { title: 'Search', text: 'Filter by place, type, price and features.' },
      { title: 'Contact', text: 'Reach the owner, agent or developer directly.' },
      { title: 'View safely', text: 'Check documents before paying anything.' },
    ],
    related: [{ value: '/supplies', label: 'Building supplies' }, { value: '/professionals', label: 'Find professionals' }],
  },
  'building-supplies': {
    headline: 'Building supplies, one clear price',
    what: ['Construction materials for every stage of a build, from cement and steel to tiles and fittings, with clear quotes and delivery to site in Addis Ababa.'],
    whoFor: ['Homeowners building or renovating', 'Contractors and builders', 'Developers'],
    how: [
      { title: 'Send your list', text: 'Or add products to a quote.' },
      { title: 'Get one price', text: 'Including delivery.' },
      { title: 'Delivered to site', text: 'Arranged with you.' },
    ],
    related: [{ value: '/property', label: 'Property' }, { value: '/professionals', label: 'Find professionals' }],
  },
  professionals: {
    headline: 'A directory of built-environment professionals',
    what: ['Architects, engineers, surveyors, valuers and other property professionals, with portfolios and a Verified badge for businesses we have checked.'],
    whoFor: ['Anyone planning a build or renovation', 'Property buyers who need advice', 'Professionals looking for clients'],
    how: [
      { title: 'Search', text: 'By service and location.' },
      { title: 'Compare', text: 'Portfolios and verification.' },
      { title: 'Enquire', text: 'Contact them directly.' },
    ],
    related: [{ value: '/supplies', label: 'Building supplies' }, { value: '/property', label: 'Property' }],
  },
  contractors: {
    headline: 'Contractors and trades, with quotes on request',
    what: ['Describe your project once and receive quotes from contractors and tradespeople who do that work in your area.'],
    whoFor: ['Homeowners building or renovating', 'Landlords and property managers', 'Businesses with building projects'],
    how: [
      { title: 'Describe the job', text: 'A few questions about the work.' },
      { title: 'We match you', text: 'With up to three suitable providers at a time.' },
      { title: 'Compare quotes', text: 'And choose who to hire.' },
    ],
    related: [{ value: '/professionals', label: 'Find professionals' }, { value: '/supplies', label: 'Building supplies' }],
  },
  'repairs-maintenance': {
    headline: 'Repairs and maintenance, without the search',
    what: ['Plumbing, electrical, roofing, cleaning, pest control and other repairs, including urgent call-outs.'],
    whoFor: ['Homeowners and tenants', 'Landlords', 'Owners who live abroad'],
    how: [
      { title: 'Tell us what needs fixing', text: 'And how urgent it is.' },
      { title: 'We find someone', text: 'Who does that work near you.' },
      { title: 'Get it fixed', text: 'Agree the price before work starts.' },
    ],
    related: [{ value: '/contractors', label: 'Contractors' }, { value: '/supplies', label: 'Building supplies' }],
  },
  finance: {
    headline: 'Property and construction finance, through licensed partners',
    notice: PARTNERS_STATEMENT,
    what: [
      'We are preparing a way to connect you with banks, lenders and other licensed finance providers for buying land or property, building, improving your home and financing a business in construction.',
      'When it opens you will be able to ask about financing directly from a property, development or construction project page. Until then, register your interest and tell us what you need.',
    ],
    whoFor: ['People buying a home or land in Ethiopia', 'Ethiopians abroad buying or building at home', 'Developers and contractors financing projects', 'Suppliers and trade buyers who need credit'],
    how: [
      { title: 'Tell us what you need', text: 'The type of finance and the project.' },
      { title: 'We pass it to a partner', text: 'A licensed provider who offers that product.' },
      { title: 'The partner contacts you', text: 'They explain their terms and decide on eligibility.' },
    ],
    categories: FINANCE_CATEGORIES,
    categoryLabel: 'Which type of finance interests you?',
    partner: { intro: 'Banks, lenders, microfinance institutions and brokers who want to reach people buying, building and improving property.', types: ['bank', 'lender', 'microfinance', 'broker', 'other'] },
    related: [{ value: '/property', label: 'Find property' }, { value: '/contractors', label: 'Get building quotes' }],
  },
  insurance: {
    headline: 'Property and construction insurance, through licensed partners',
    notice: PARTNERS_STATEMENT,
    what: [
      'We are preparing a way to request insurance quotes for homes, buildings, rental property, construction projects and contractors from licensed insurers and brokers.',
      'Until it opens, register your interest and tell us what you would like to insure.',
    ],
    whoFor: ['Homeowners and landlords', 'Owners abroad with property in Ethiopia', 'Developers and contractors', 'Professionals who need indemnity or liability cover'],
    how: [
      { title: 'Tell us what to insure', text: 'The property or project and the cover you want.' },
      { title: 'We pass it to a partner', text: 'A licensed insurer or broker.' },
      { title: 'The partner quotes', text: 'They advise on cover and price directly.' },
    ],
    categories: INSURANCE_CATEGORIES,
    categoryLabel: 'What would you like to insure?',
    partner: { intro: 'Insurers and brokers who want to reach property owners, landlords, developers and contractors.', types: ['insurer', 'broker', 'other'] },
    related: [{ value: '/property', label: 'Find property' }, { value: '/repairs-maintenance', label: 'Repairs & maintenance' }],
  },
  diaspora: {
    headline: 'Property services for Ethiopians abroad',
    what: ['Help with buying, building and looking after property in Ethiopia from wherever you live, and finding Ethiopian-run services near you.'],
    whoFor: ['Ethiopians living abroad', 'Owners of property in Ethiopia who live overseas'],
    how: [
      { title: 'Tell us what you need', text: 'Buying, building, managing or a local service.' },
      { title: 'We connect you', text: 'With the right people or our own team.' },
      { title: 'Stay informed', text: 'With clear updates wherever you are.' },
    ],
    related: [{ value: '/property', label: 'Find property' }, { value: '/professionals', label: 'Find professionals' }],
  },
  jobs: {
    headline: 'Jobs in construction, engineering and property',
    what: [
      'We are building a jobs board and recruitment service for construction, engineering, architecture, the trades and property, in Ethiopia and for Ethiopians abroad.',
      'Employers will be able to advertise vacancies and ask for help with recruitment. Candidates will be able to search jobs, apply with a CV and choose whether employers can find them.',
    ],
    whoFor: ['Contractors, developers, consultancies and suppliers who are hiring', 'Engineers, architects, surveyors and site managers', 'Skilled tradespeople and labourers', 'Graduates starting a career in the built environment'],
    how: [
      { title: 'Employers post jobs', text: 'Or tell us what staff they need.' },
      { title: 'Candidates apply', text: 'With a CV, or register for placement.' },
      { title: 'We help match', text: 'For recruitment requests.' },
    ],
    categories: OFFERED_JOB_CATEGORIES,
    categoryLabel: 'Which area of work?',
    audiences: [
      { value: 'employer', label: 'I am hiring' },
      { value: 'candidate', label: 'I am looking for work' },
    ],
    related: [{ value: '/professionals', label: 'Find professionals' }, { value: '/contractors', label: 'Contractors' }],
  },
  'our-developments': {
    headline: 'Homes we intend to build',
    what: [
      'HagerLand intends to develop carefully selected residential and, potentially, commercial projects. We are not building or selling any development yet, and we will say so plainly until we are.',
      'Because HagerLand Supply sources construction materials, we expect to build with closer control over the cost and quality of materials. Register your interest to hear first when a project is announced.',
    ],
    whoFor: ['Families looking for a home in Ethiopia', 'Ethiopians abroad buying at home', 'Investors interested in new-build property'],
    how: [
      { title: 'Land', text: 'Clear title and lease documents first.' },
      { title: 'Design', text: 'Homes designed for how families live.' },
      { title: 'Materials', text: 'Sourced through HagerLand Supply.' },
      { title: 'Build and handover', text: 'Managed directly, with documents in order.' },
    ],
    related: [{ value: '/developments', label: 'Developments by other builders' }, { value: '/property/for-sale', label: 'Property for sale' }],
  },
}
