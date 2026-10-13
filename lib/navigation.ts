import { brand } from '@/lib/brand'
import { verticalHref, type Vertical, type VerticalKey } from '@/lib/verticals'

export interface NavLink {
  label: string
  href: string
  description?: string
  icon?: string
  /** Set when the link leads to a coming-soon vertical. */
  soon?: boolean
}

export interface NavGroup {
  id: string
  label: string
  href: string
  /** Verticals this menu belongs to: it disappears when all of them are hidden. */
  verticals: VerticalKey[]
  links: NavLink[]
  featured?: NavLink[]
  cta?: NavLink
  /** A plain link in the header (no dropdown). */
  plain?: boolean
  soon?: boolean
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

/** Links inside each vertical's menu. Keys are vertical keys; a link shows only when its vertical is visible. */
const VERTICAL_LINKS: Record<VerticalKey, NavLink[]> = {
  property: [
    { label: 'For sale', href: '/property/for-sale', description: 'Homes, apartments and villas to buy' },
    { label: 'To rent', href: '/property/to-rent', description: 'Places to rent across Ethiopia' },
    { label: 'New developments', href: '/developments', description: 'Off-plan and new-build projects' },
    { label: 'Land & plots', href: '/property/for-sale?type=land', description: 'Plots ready to build on' },
    { label: 'Commercial', href: '/property/for-sale?type=commercial', description: 'Offices, shops and warehouses' },
    { label: 'Find an agent', href: '/agents', description: 'Estate agents and brokers' },
  ],
  'building-supplies': [
    { label: 'Shop all categories', href: '/supplies' },
    { label: 'Request a quote', href: '/supplies/quote' },
    { label: 'Send your materials list', href: '/supplies/materials-list' },
    { label: 'Find suppliers', href: '/suppliers' },
  ],
  professionals: [
    { label: 'Architects', href: '/professionals/architects', description: 'Design your home or project' },
    { label: 'Engineers', href: '/professionals/design-consultancy', description: 'Structural, civil and MEP engineers' },
    { label: 'Interior designers', href: '/professionals/interior-designers', description: 'Finishes, layouts and furnishing' },
    { label: 'All professionals', href: '/professionals', description: 'Every professional service' },
  ],
  contractors: [
    { label: 'Contractors & builders', href: '/contractors', description: 'Describe your project and get quotes' },
    { label: 'Tradespeople', href: '/professionals/trades', description: 'Electricians, plumbers, tilers and more' },
  ],
  'repairs-maintenance': [{ label: 'Repairs & Maintenance', href: '/repairs-maintenance', description: 'Fixes, servicing and emergency repairs' }],
  finance: [],
  insurance: [],
  diaspora: [
    { label: 'Diaspora services', href: '/diaspora', description: 'Buy, build and manage property from abroad' },
    { label: 'HagerLand Property Care', href: '/diaspora/property-care', description: 'Property management for owners abroad' },
    { label: 'Services where you live', href: '/diaspora/services-abroad', description: 'Ethiopian-run trades and professionals near you' },
  ],
  jobs: [],
  'our-developments': [],
}

function statusOf(verticals: Vertical[], key: VerticalKey): Vertical | undefined {
  return verticals.find((v) => v.key === key)
}

function linksFor(verticals: Vertical[], keys: VerticalKey[]): NavLink[] {
  return keys.flatMap((k) => {
    const v = statusOf(verticals, k)
    if (!v) return []
    return VERTICAL_LINKS[k].map((l) => ({ ...l, soon: v.status === 'coming_soon' || undefined }))
  })
}

/** Sub-links of one vertical (empty for verticals that are a single page). */
export function verticalLinks(verticals: Vertical[], key: VerticalKey): NavLink[] {
  return linksFor(verticals, [key])
}

/** Header menus in the order of spec 24.3, built from the registry (hidden verticals disappear). */
export function buildMainNav(verticals: Vertical[]): NavGroup[] {
  const groups: NavGroup[] = []
  const property = statusOf(verticals, 'property')
  if (property)
    groups.push({ id: 'property', label: property.navLabel, href: verticalHref(property), verticals: ['property'], links: linksFor(verticals, ['property']), cta: { label: 'Sell or let your property', href: '/list-with-us#owners' }, soon: property.status === 'coming_soon' })
  const supplies = statusOf(verticals, 'building-supplies')
  if (supplies)
    groups.push({ id: 'supplies', label: supplies.navLabel, href: verticalHref(supplies), verticals: ['building-supplies'], featured: SUPPLY_TOP_CATEGORIES, links: linksFor(verticals, ['building-supplies']), cta: { label: 'Become a supplier', href: '/list-with-us#suppliers' }, soon: supplies.status === 'coming_soon' })
  const pros = statusOf(verticals, 'professionals')
  const contractors = statusOf(verticals, 'contractors')
  if (pros || contractors)
    groups.push({
      id: 'professionals',
      label: 'Professionals & Contractors',
      href: pros ? verticalHref(pros) : '/contractors',
      verticals: ['professionals', 'contractors'],
      links: linksFor(verticals, ['contractors', 'professionals']),
      cta: { label: 'Join as a professional', href: '/list-with-us#professionals' },
    })
  const repairs = statusOf(verticals, 'repairs-maintenance')
  if (repairs) groups.push({ id: 'repairs', label: repairs.navLabel, href: verticalHref(repairs), verticals: ['repairs-maintenance'], links: [], plain: true, soon: repairs.status === 'coming_soon' })
  const diaspora = statusOf(verticals, 'diaspora')
  if (diaspora)
    groups.push({ id: 'diaspora', label: diaspora.navLabel, href: verticalHref(diaspora), verticals: ['diaspora'], links: linksFor(verticals, ['diaspora']), cta: { label: 'Request a Property Care consultation', href: '/diaspora/property-care#consultation' }, soon: diaspora.status === 'coming_soon' })
  const more = (['finance', 'insurance', 'jobs', 'our-developments'] as const)
    .map((k) => statusOf(verticals, k))
    .filter((v): v is Vertical => Boolean(v))
  if (more.length)
    groups.push({
      id: 'more',
      label: 'More',
      href: verticalHref(more[0]),
      verticals: more.map((v) => v.key),
      links: more.map((v) => ({ label: v.name, href: verticalHref(v), description: v.shortDescription, icon: v.icon, soon: v.status === 'coming_soon' || undefined })),
    })
  return groups
}

/** "List with us" menu (spec 24.3). "Post a job" follows the jobs vertical. */
export function buildListWithUs(verticals: Vertical[]): NavLink[] {
  const jobs = statusOf(verticals, 'jobs')
  return [
    { label: 'Sell or let a property', href: '/list-with-us#owners' },
    { label: 'List your business', href: '/list-with-us#businesses' },
    { label: 'Become a supplier', href: '/list-with-us#suppliers' },
    { label: 'Join as a professional', href: '/list-with-us#professionals' },
    ...(jobs ? [{ label: 'Post a job', href: jobs.status === 'live' ? '/account/jobs/new' : '/jobs#register', soon: jobs.status === 'coming_soon' || undefined }] : []),
  ]
}

/** Extra links at the end of the mobile drawer (spec 24.3). */
export const DRAWER_EXTRAS: NavLink[] = [
  { label: 'Request a service', href: '/request-service' },
  { label: 'Request a quote', href: '/supplies/quote' },
  { label: 'Help & advice', href: '/help' },
  { label: 'My account', href: '/account' },
]

/** Footer link columns, built from the registry. */
export function buildFooterColumns(verticals: Vertical[]): { title: string; links: NavLink[] }[] {
  const v = (k: VerticalKey) => statusOf(verticals, k)
  const vLink = (k: VerticalKey): NavLink[] => {
    const x = v(k)
    return x ? [{ label: x.name, href: verticalHref(x), soon: x.status === 'coming_soon' || undefined }] : []
  }
  return [
    {
      title: 'Property',
      links: v('property')
        ? [
            { label: 'For sale', href: '/property/for-sale' },
            { label: 'To rent', href: '/property/to-rent' },
            { label: 'New developments', href: '/developments' },
            { label: 'Land', href: '/property/for-sale?type=land' },
            { label: 'Commercial', href: '/property/for-sale?type=commercial' },
            { label: 'Find an agent', href: '/agents' },
            ...vLink('our-developments'),
          ]
        : vLink('our-developments'),
    },
    {
      title: 'Build & maintain',
      links: [...vLink('building-supplies'), ...(v('building-supplies') ? [{ label: 'Request a quote', href: '/supplies/quote' }] : []), ...vLink('professionals'), ...vLink('contractors'), ...vLink('repairs-maintenance'), { label: 'Request a service', href: '/request-service' }],
    },
    { title: 'Services', links: [...vLink('diaspora'), ...vLink('finance'), ...vLink('insurance'), ...vLink('jobs')] },
    {
      title: brand.name,
      links: [
        { label: 'About', href: '/about' },
        { label: 'How it works', href: '/how-it-works' },
        { label: 'List with us', href: '/list-with-us' },
        { label: 'Advertise', href: '/advertise' },
        { label: 'Contact', href: '/contact' },
        { label: 'Help & FAQs', href: '/help' },
      ],
    },
  ].filter((c) => c.links.length > 0)
}
