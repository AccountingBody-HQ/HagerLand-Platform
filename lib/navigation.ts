import { brand } from '@/lib/brand'

export interface NavLink {
  label: string
  href: string
  description?: string
  icon?: string
}

export interface NavGroup {
  id: 'property' | 'supplies' | 'professionals' | 'developments'
  label: string
  href: string
  links: NavLink[]
  featured?: NavLink[]
  cta: NavLink
}

export const SUPPLY_TOP_CATEGORIES: NavLink[] = [
  { label: 'Building materials', href: '/supplies/building-materials', icon: 'brick-wall' },
  { label: 'Roofing', href: '/supplies/roofing', icon: 'house' },
  { label: 'Plumbing', href: '/supplies/plumbing', icon: 'droplets' },
  { label: 'Electrical', href: '/supplies/electrical', icon: 'zap' },
  { label: 'Tiles & flooring', href: '/supplies/tiles-flooring', icon: 'layout-grid' },
  { label: 'Bathroom & sanitaryware', href: '/supplies/bathroom', icon: 'bath' },
  { label: 'Paint & decorating', href: '/supplies/paint-decorating', icon: 'paint-roller' },
  { label: 'Solar & power', href: '/supplies/solar-power', icon: 'sun' },
]

export const MAIN_NAV: NavGroup[] = [
  {
    id: 'property',
    label: 'Property',
    href: '/property',
    links: [
      { label: 'For sale', href: '/property/for-sale', description: 'Homes, apartments and villas to buy' },
      { label: 'To rent', href: '/property/to-rent', description: 'Places to rent across Ethiopia' },
      { label: 'New developments', href: '/developments', description: 'Off-plan and new-build projects' },
      { label: 'Land & plots', href: '/property/for-sale?type=land', description: 'Plots ready to build on' },
      { label: 'Commercial', href: '/property/for-sale?type=commercial', description: 'Offices, shops and warehouses' },
      { label: 'Find an agent', href: '/agents', description: 'Estate agents and brokers' },
    ],
    cta: { label: 'Sell or let your property', href: '/list-with-us#owners' },
  },
  {
    id: 'supplies',
    label: 'Supplies',
    href: '/supplies',
    featured: SUPPLY_TOP_CATEGORIES,
    links: [
      { label: 'Shop all categories', href: '/supplies' },
      { label: 'Request a quote', href: '/supplies/quote' },
      { label: 'Send your materials list', href: '/supplies/materials-list' },
      { label: 'Find suppliers', href: '/suppliers' },
    ],
    cta: { label: 'Become a supplier', href: '/list-with-us#suppliers' },
  },
  {
    id: 'professionals',
    label: 'Professionals',
    href: '/professionals',
    links: [
      { label: 'Contractors', href: '/professionals/building-contracting', description: 'General, building and specialist contractors' },
      { label: 'Architects', href: '/professionals/architects', description: 'Design your home or project' },
      { label: 'Engineers', href: '/professionals/design-consultancy', description: 'Structural, civil and MEP engineers' },
      { label: 'Tradespeople', href: '/professionals/trades', description: 'Electricians, plumbers, tilers and more' },
      { label: 'Interior designers', href: '/professionals/interior-designers', description: 'Finishes, layouts and furnishing' },
      { label: 'All services', href: '/professionals', description: 'Every service category' },
    ],
    cta: { label: 'Join as a professional', href: '/list-with-us#professionals' },
  },
  {
    id: 'developments',
    label: 'Developments',
    href: '/developments',
    links: [
      { label: brand.divisions.developments, href: '/our-developments', description: 'Homes we build ourselves' },
      { label: 'All developments', href: '/developments', description: 'New-build projects across Ethiopia' },
      { label: 'Find developers', href: '/developers', description: 'Real-estate developers' },
    ],
    cta: { label: 'Register interest', href: '/our-developments#register' },
  },
]

export const FOOTER_COLUMNS: { title: string; links: NavLink[] }[] = [
  {
    title: 'Property',
    links: [
      { label: 'For sale', href: '/property/for-sale' },
      { label: 'To rent', href: '/property/to-rent' },
      { label: 'New developments', href: '/developments' },
      { label: 'Land', href: '/property/for-sale?type=land' },
      { label: 'Commercial', href: '/property/for-sale?type=commercial' },
      { label: 'Find an agent', href: '/agents' },
    ],
  },
  {
    title: 'Supplies & Services',
    links: [
      { label: 'Supplies', href: '/supplies' },
      { label: 'Request a quote', href: '/supplies/quote' },
      { label: 'Suppliers', href: '/suppliers' },
      { label: 'Professionals', href: '/professionals' },
      { label: 'Contractors', href: '/professionals/building-contracting' },
      { label: 'Architects', href: '/professionals/architects' },
    ],
  },
  {
    title: 'HagerLand',
    links: [
      { label: 'About', href: '/about' },
      { label: brand.divisions.developments, href: '/our-developments' },
      { label: 'How it works', href: '/how-it-works' },
      { label: 'List with us', href: '/list-with-us' },
      { label: 'Contact', href: '/contact' },
      { label: 'Help & FAQs', href: '/help' },
    ],
  },
]
