import type { PillarKey } from '@/lib/pillars'
import type { VerticalKey } from '@/lib/verticals'

/**
 * Copy for each service page (spec 26.4, 26.11): what it does, primary actions, deeper pages, an "abroad" panel and
 * next steps. Plain statements only: no prices, counts or claims that are not true today.
 * `needs` hides a link while the area it leads to is hidden; `agency` links show only while HagerLand's estate agency
 * is on for that side (sales or lettings); `content` links show only once that kind of guide has been published.
 */
export interface HubLink {
  label: string
  href: string
  text?: string
  icon?: string
  needs?: VerticalKey
  agency?: 'sales' | 'lettings'
  /** Published guides of this kind must exist ('any' = any published guide). */
  content?: 'any' | 'checklists' | 'glossary'
}

export interface PillarContent {
  headline: string
  actions: HubLink[]
  /** Deeper pages: what HagerLand does itself, then what visitors search and compare. */
  direct: HubLink[]
  aggregate: HubLink[]
  /** Heading for the second group when "Search and compare" does not fit. */
  aggregateTitle?: string
  /** Heading and text of the register-interest section while the service itself is open. */
  interestTitle?: string
  interestText?: string
  abroad: { title: string; text: string; links: HubLink[] }
  next: PillarKey[]
  /** Coming-soon copy, used while only Interest capture is on. */
  soon: { headline: string; points: string[] }
}

export const PILLAR_CONTENT: Record<PillarKey, PillarContent> = {
  buy: {
    headline: 'Buy property in Ethiopia, or sell yours with an agent you can trust.',
    actions: [
      { label: 'Search property for sale', href: '/property/for-sale', icon: 'search' },
      { label: 'Book a market appraisal', href: '/agency/valuation', icon: 'clipboard-check', agency: 'sales' },
      { label: 'Sell with HagerLand', href: '/agency/sell', icon: 'handshake', agency: 'sales' },
    ],
    direct: [
      { label: 'Sell with HagerLand', href: '/agency/sell', text: 'Market appraisal, marketing, viewings and offers handled by our agents.', icon: 'handshake', agency: 'sales' },
      { label: 'Buyer representation', href: '/agency/buyer-representation', text: 'We search, check and negotiate on your behalf.', icon: 'user-check', agency: 'sales' },
      { label: 'Property sourcing', href: '/agency/property-sourcing', text: 'Tell us your brief and we find what fits.', icon: 'search-check', agency: 'sales' },
      { label: 'Developer sales', href: '/agency/developer-sales', text: 'Sales and marketing for developers’ projects.', icon: 'building-2', agency: 'sales' },
      { label: 'Book a market appraisal', href: '/agency/valuation', text: 'A HagerLand agent visits and values your property.', icon: 'clipboard-check', agency: 'sales' },
    ],
    aggregate: [
      { label: 'Property for sale', href: '/property/for-sale', text: 'Homes, land and commercial property from owners, agents and developers.', icon: 'house', needs: 'property' },
      { label: 'New developments', href: '/developments', text: 'Off-plan and new-build projects.', icon: 'building', needs: 'property' },
      { label: 'Estate agents', href: '/agents', text: 'Agents and brokers across Ethiopia.', icon: 'briefcase', needs: 'property' },
      { label: 'Compare properties', href: '/property/compare', text: 'Up to four side by side.', icon: 'columns-3', needs: 'property' },
      { label: 'Saved searches and alerts', href: '/account/alerts', text: 'Get an email when new matches go live.', icon: 'bell', needs: 'property' },
    ],
    abroad: {
      title: 'Buying from abroad?',
      text: 'Ask for a video viewing, let our agents represent you, or have us source a property that fits your brief. You do not need to travel until you are ready.',
      links: [
        { label: 'Buyer representation', href: '/agency/buyer-representation', agency: 'sales' },
        { label: 'Property sourcing', href: '/agency/property-sourcing', agency: 'sales' },
        { label: 'Diaspora services', href: '/diaspora', needs: 'diaspora' },
      ],
    },
    next: ['finance', 'insurance', 'build', 'manage'],
    soon: { headline: 'Buying and selling property with HagerLand opens soon.', points: ['Property for sale from owners, agents and developers.', 'HagerLand’s own estate agency for sellers and buyers.'] },
  },
  rent: {
    headline: 'Find a place to rent, or let your property with HagerLand.',
    actions: [
      { label: 'Search property to rent', href: '/property/to-rent', icon: 'search' },
      { label: 'Let with HagerLand', href: '/agency/let', icon: 'key-round', agency: 'lettings' },
      { label: 'Landlord services', href: '/agency/landlords', icon: 'clipboard-list', agency: 'lettings' },
    ],
    direct: [
      { label: 'Let with HagerLand', href: '/agency/let', text: 'We market your property, show it and check applicants.', icon: 'key-round', agency: 'lettings' },
      { label: 'Landlord services', href: '/agency/landlords', text: 'Let only, let and manage, or management only.', icon: 'clipboard-list', agency: 'lettings' },
      { label: 'Renting: a guide for tenants', href: '/agency/tenants', text: 'Viewings, applications, advance rent and tenancies.', icon: 'book-open' },
    ],
    aggregate: [
      { label: 'Property to rent', href: '/property/to-rent', text: 'Homes, rooms and commercial space from owners and agents.', icon: 'house', needs: 'property' },
      { label: 'Letting agents', href: '/agents', text: 'Agents and brokers who let property.', icon: 'briefcase', needs: 'property' },
    ],
    abroad: {
      title: 'Letting or renting from abroad?',
      text: 'We can let your property, check tenants and, with HagerLand Property Care, look after it while you are away. Moving to Ethiopia? Book a video viewing before you arrive.',
      links: [
        { label: 'Let with HagerLand', href: '/agency/let', agency: 'lettings' },
        { label: 'HagerLand Property Care', href: '/diaspora/property-care', needs: 'diaspora' },
      ],
    },
    next: ['manage', 'maintain', 'insurance', 'advice'],
    soon: { headline: 'Renting and letting with HagerLand opens soon.', points: ['Places to rent from owners and agents.', 'Letting and tenant services run by HagerLand.'] },
  },
  build: {
    headline: 'Plan, design and build: one brief, the right people, the materials to match.',
    actions: [
      { label: 'Start a building project', href: '/build/project', icon: 'hard-hat' },
      { label: 'Get contractor quotes', href: '/contractors', icon: 'clipboard-list', needs: 'contractors' },
      { label: 'Find a professional', href: '/professionals', icon: 'ruler', needs: 'professionals' },
    ],
    direct: [],
    aggregate: [
      { label: 'Start a building project', href: '/build/project', text: 'Describe your plot and plans once; we link the requests you need.', icon: 'hard-hat' },
      { label: 'Contractors & builders', href: '/contractors', text: 'Describe your project and get quotes from up to three contractors at a time.', icon: 'hammer', needs: 'contractors' },
      { label: 'Architects and engineers', href: '/professionals/design-consultancy', text: 'Design, structure and building services.', icon: 'ruler', needs: 'professionals' },
      { label: 'New developments', href: '/developments', text: 'Projects by developers across Ethiopia.', icon: 'building', needs: 'property' },
    ],
    abroad: {
      title: 'Building from abroad?',
      text: 'Send one brief for your plot, get quotes from contractors and professionals, and have the materials quoted by HagerLand Supply. Ask for site photos and progress updates as work goes on.',
      links: [
        { label: 'Start a building project', href: '/build/project' },
        { label: 'Diaspora services', href: '/diaspora', needs: 'diaspora' },
      ],
    },
    next: ['finance', 'supplies', 'insurance', 'maintain'],
    aggregateTitle: 'Find the right people',
    interestTitle: 'Hear first about HagerLand’s own developments',
    interestText: 'We intend to build carefully chosen homes ourselves. Register your interest to hear first about locations, plans and prices. No obligation.',
    soon: { headline: 'Build & Develop opens soon.', points: ['Contractors, architects and engineers with quotes on request.', 'One brief for your whole building project.'] },
  },
  maintain: {
    headline: 'Repairs, servicing and emergencies, coordinated for you.',
    actions: [
      { label: 'Request a repair', href: '/repairs-maintenance', icon: 'wrench', needs: 'repairs-maintenance' },
      { label: 'Emergency repairs', href: '/repairs-maintenance#emergency', icon: 'siren', needs: 'repairs-maintenance' },
    ],
    direct: [{ label: 'Coordinated by HagerLand', href: '/repairs-maintenance', text: 'We check every request and can send our own team as well as, or instead of, a tradesperson we work with.', icon: 'shield-check', needs: 'repairs-maintenance' }],
    aggregateTitle: 'Find a tradesperson',
    aggregate: [
      { label: 'Repairs & maintenance', href: '/repairs-maintenance', text: 'Plumbing, electrical, roofing, cleaning and more.', icon: 'wrench', needs: 'repairs-maintenance' },
      { label: 'Tradespeople', href: '/professionals/trades', text: 'Electricians, plumbers, tilers and other trades.', icon: 'hammer', needs: 'professionals' },
    ],
    abroad: {
      title: 'Your property is in Ethiopia and you are not?',
      text: 'Request a repair from wherever you are. HagerLand coordinates it, and Property Care clients get it handled as part of their service.',
      links: [
        { label: 'Request a repair', href: '/repairs-maintenance', needs: 'repairs-maintenance' },
        { label: 'HagerLand Property Care', href: '/diaspora/property-care', needs: 'diaspora' },
      ],
    },
    next: ['manage', 'supplies', 'insurance', 'build'],
    soon: { headline: 'Repairs & maintenance opens soon.', points: ['Repairs and servicing requests with emergency handling.'] },
  },
  manage: {
    headline: 'Property management you can rely on, wherever you live.',
    actions: [
      { label: 'Request a consultation', href: '/diaspora/property-care#consultation', icon: 'calendar-check', needs: 'diaspora' },
      { label: 'Owner portal', href: '/owner', icon: 'layout-dashboard' },
    ],
    direct: [
      { label: 'HagerLand Property Care', href: '/diaspora/property-care', text: 'Inspections with photo reports, tenants, rent collection and maintenance.', icon: 'key-round', needs: 'diaspora' },
      { label: 'Owner portal', href: '/owner', text: 'Owners of properties we manage see inspections, statements and documents.', icon: 'layout-dashboard' },
    ],
    aggregateTitle: 'Other property managers',
    aggregate: [{ label: 'Property managers', href: '/professionals/property-management', text: 'Independent property managers across Ethiopia.', icon: 'users', needs: 'professionals' }],
    abroad: {
      title: 'Own property in Ethiopia and live abroad?',
      text: 'HagerLand Property Care was made for you: regular inspections with photos, tenant finding, rent statements and repairs, without relying on friends and relatives.',
      links: [{ label: 'HagerLand Property Care', href: '/diaspora/property-care', needs: 'diaspora' }],
    },
    next: ['maintain', 'rent', 'insurance', 'advice'],
    soon: { headline: 'Property management opens soon.', points: ['HagerLand Property Care for owners in Ethiopia and abroad.'] },
  },
  finance: {
    headline: 'Property finance through approved, licensed partners.',
    actions: [],
    direct: [],
    aggregate: [],
    abroad: { title: 'Financing from abroad?', text: 'Diaspora mortgages and construction finance are among the categories our partners will cover. Register your interest to hear first.', links: [] },
    next: ['buy', 'build', 'insurance', 'advice'],
    soon: { headline: 'Property finance is coming soon.', points: [] },
  },
  insurance: {
    headline: 'Property insurance through approved, licensed partners.',
    actions: [],
    direct: [],
    aggregate: [],
    abroad: { title: 'Insuring from abroad?', text: 'Landlord and building cover for owners abroad are among the categories our partners will cover.', links: [] },
    next: ['buy', 'manage', 'build', 'advice'],
    soon: { headline: 'Property insurance is coming soon.', points: [] },
  },
  advice: {
    headline: 'Clear, practical advice before you buy, build or rent.',
    actions: [
      { label: 'Read the guides', href: '/guides', icon: 'book-open', content: 'any' },
      { label: 'Help & FAQs', href: '/help', icon: 'circle-help' },
      { label: 'Market insight', href: '/advice/market-insight', icon: 'chart-column' },
    ],
    direct: [
      { label: 'Guides', href: '/guides', text: 'Buying, renting, building and selling, step by step.', icon: 'book-open', content: 'any' },
      { label: 'Process checklists', href: '/advice/checklists', text: 'What to do, and in what order.', icon: 'list-checks', content: 'checklists' },
      { label: 'Glossary', href: '/advice/glossary', text: 'Carta, lease, G+X, condominium and more.', icon: 'book-a', content: 'glossary' },
      { label: 'Help & FAQs', href: '/help', text: 'Staying safe, checking documents and answers to common questions.', icon: 'circle-help' },
      { label: 'Market insight', href: '/advice/market-insight', text: 'What sellers and landlords are asking, by area and type.', icon: 'chart-column' },
      { label: 'Ask our team', href: '/contact', text: 'A question about buying, building or renting? Ask us.', icon: 'message-circle' },
    ],
    aggregate: [],
    abroad: { title: 'Planning from abroad?', text: 'We explain each step in plain English, including what you can do remotely and what needs a visit or a representative.', links: [{ label: 'Diaspora services', href: '/diaspora', needs: 'diaspora' }] },
    next: ['buy', 'rent', 'build', 'finance'],
    soon: { headline: 'Knowledge & Advice opens soon.', points: ['Guides, checklists and market insight.'] },
  },
  supplies: {
    headline: 'Construction materials from HagerLand Supply and suppliers we work with, with one clear quote.',
    actions: [],
    direct: [],
    aggregate: [],
    abroad: { title: 'Building from abroad?', text: 'Send your materials list and we quote, deliver to site and keep you updated, so the right materials arrive without you being there.', links: [{ label: 'Send your materials list', href: '/supplies/materials-list' }] },
    next: ['build', 'maintain', 'finance', 'jobs'],
    soon: { headline: 'Building supplies open soon.', points: [] },
  },
  jobs: {
    headline: 'Jobs, recruitment and staffing for construction and property.',
    actions: [],
    direct: [],
    aggregate: [],
    abroad: { title: 'Hiring or job hunting from abroad?', text: 'Employers abroad can post roles in Ethiopia, and candidates anywhere can search jobs in Ethiopia.', links: [] },
    next: ['build', 'supplies', 'maintain', 'advice'],
    soon: { headline: 'Jobs & recruitment open soon.', points: [] },
  },
}
