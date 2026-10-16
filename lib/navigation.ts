import { brand } from '@/lib/brand'
import { pillarHref, type Pillar, type PillarKey } from '@/lib/pillars'
import { SERVICE_COPY, SERVICE_GROUPS } from '@/lib/content/services'
import { verticalHref, type Vertical, type VerticalKey } from '@/lib/verticals'

export interface NavLink {
  label: string
  href: string
  description?: string
  icon?: string
  /** Set when the link leads to a coming-soon pillar or vertical. */
  soon?: boolean
}

export interface NavGroup {
  id: string
  label: string
  /** The full service name, for "Explore …" in its menu. */
  title: string
  href: string
  links: NavLink[]
  featured?: NavLink[]
  cta?: NavLink
  soon?: boolean
}

/** One service in the "All services" panel, the mobile menu and the homepage services section. */
export interface ServiceTile {
  key: string
  name: string
  /** One short benefit line in customer language. */
  tagline: string
  href: string
  icon: string
  /** The card's call to action ("Get a quote", "Register interest"). */
  action: string
  soon: boolean
}

export interface ServiceGroup {
  id: string
  title: string
  text: string
  tiles: ServiceTile[]
}

/** The ten services in four customer groups, plus the two audiences that run through all of them. */
export interface AllServices {
  groups: ServiceGroup[]
  diaspora: ServiceTile | null
  professionals: ServiceTile | null
}

/** What the header, drawer and footer need, built on the server from the registries. */
export interface SiteNav {
  main: NavGroup[]
  /** Mobile drawer: every service and both audiences with their links (spec 26.4: "the mobile drawer shows everything"). */
  drawer: { tile: ServiceTile; links: NavLink[] }[]
  all: AllServices
  listWithUs: NavLink[]
  extras: NavLink[]
  abroad: NavLink | null
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

/** Context the menus need beyond the registries. */
export interface NavContext {
  agencySales: boolean
  agencyLettings: boolean
  ownerPortal: boolean
}

/** Links inside each pillar's menu, in order. A link appears only when what it leads to is switched on. */
export function pillarLinks(key: PillarKey, verticals: Vertical[], ctx: NavContext): NavLink[] {
  const has = (k: VerticalKey) => verticals.some((v) => v.key === k)
  const soon = (k: VerticalKey) => verticals.find((v) => v.key === k)?.status === 'coming_soon' || undefined
  switch (key) {
    case 'buy':
      return [
        { label: 'Property for sale', href: '/property/for-sale', description: 'Homes, apartments and villas to buy' },
        { label: 'New developments', href: '/developments', description: 'Off-plan and new-build projects' },
        { label: 'Land & plots', href: '/property/for-sale?type=land', description: 'Plots ready to build on' },
        { label: 'Commercial', href: '/property/for-sale?type=commercial', description: 'Offices, shops and warehouses' },
        { label: 'Investment property', href: '/property/for-sale?features=investment', description: 'Income and already-let property' },
        ...(ctx.agencySales
          ? [
              { label: 'Sell with HagerLand', href: '/agency/sell', description: 'Our estate agency sells for you' },
              { label: 'Buyer representation', href: '/agency/buyer-representation', description: 'We search and negotiate for you' },
              { label: 'Book a valuation', href: '/agency/valuation', description: 'A HagerLand agent values your property' },
            ]
          : [{ label: 'Request a valuation', href: '/request-service/property-valuers', description: 'Quotes from property valuers' }]),
        { label: 'Compare properties', href: '/property/compare', description: 'Up to four side by side' },
        { label: 'Find an agent', href: '/agents', description: 'Estate agents and brokers' },
      ]
    case 'rent':
      return [
        { label: 'Property to rent', href: '/property/to-rent', description: 'Places to rent across Ethiopia' },
        ...(ctx.agencyLettings
          ? [
              { label: 'Let with HagerLand', href: '/agency/let', description: 'We find and check tenants for you' },
              { label: 'Landlord services', href: '/agency/landlords', description: 'Let only, let and manage, or management only' },
            ]
          : []),
        { label: 'Renting: a guide for tenants', href: '/agency/tenants', description: 'Viewings, applications and tenancies' },
        { label: 'Find an agent', href: '/agents', description: 'Letting agents and brokers' },
      ]
    case 'build':
      return [
        { label: 'Start a building project', href: '/build/project', description: 'One brief for design, building and materials' },
        { label: 'Contractors & builders', href: '/contractors', description: 'Describe your project and get quotes' },
        { label: 'Architects', href: '/professionals/architects', description: 'Design your home or project' },
        { label: 'Engineers', href: '/professionals/design-consultancy', description: 'Structural, civil and MEP engineers' },
        { label: 'Find a professional', href: '/professionals', description: 'Every professional service' },
        { label: 'New developments', href: '/developments', description: 'Projects by developers' },
        ...(has('our-developments') ? [{ label: 'Our Developments', href: '/our-developments', description: 'Homes HagerLand intends to develop', soon: soon('our-developments') }] : []),
      ]
    case 'maintain':
      return [
        { label: 'Repairs & maintenance', href: '/repairs-maintenance', description: 'Fixes, servicing and upkeep' },
        { label: 'Emergency repairs', href: '/repairs-maintenance#emergency', description: 'Burst pipes, power faults, roof leaks' },
        { label: 'Tradespeople', href: '/professionals/trades', description: 'Electricians, plumbers, tilers and more' },
        { label: 'Request a service', href: '/request-service', description: 'Tell us what needs doing' },
      ]
    case 'manage':
      return [
        { label: 'HagerLand Property Care', href: '/diaspora/property-care', description: 'We look after your property' },
        ...(ctx.ownerPortal ? [{ label: 'Owner portal', href: '/owner', description: 'For owners of properties we manage' }] : []),
        { label: 'Property managers', href: '/professionals/property-management', description: 'Third-party managers' },
      ]
    case 'supplies':
      return [
        { label: 'Shop all categories', href: '/supplies' },
        { label: 'Request a quote', href: '/supplies/quote' },
        { label: 'Send your materials list', href: '/supplies/materials-list' },
        { label: 'Special Buys', href: '/supplies/special-buys' },
        { label: 'Trade accounts', href: '/supplies/trade' },
        { label: 'Find suppliers', href: '/suppliers' },
      ]
    case 'advice':
      return [
        { label: 'Advice & guides', href: '/advice', description: 'Guides, checklists and market insight' },
        { label: 'Guides', href: '/guides' },
        { label: 'Help & FAQs', href: '/help' },
      ]
    default:
      return []
  }
}

const PILLAR_CTA: Partial<Record<PillarKey, NavLink>> = {
  buy: { label: 'Sell or let your property', href: '/list-with-us#owners' },
  rent: { label: 'List a property to rent', href: '/list-with-us#owners' },
  build: { label: 'Join as a professional', href: '/list-with-us#professionals' },
  maintain: { label: 'Join as a tradesperson', href: '/list-with-us#professionals' },
  manage: { label: 'Request a Property Care consultation', href: '/diaspora/property-care#consultation' },
  supplies: { label: 'Become a supplier', href: '/list-with-us#suppliers' },
}

/** Header menus: HagerLand's priorities first (Supplies, Jobs, Advice), then Buy · Rent · Build · Maintain · Manage · More. */
export function buildMainNav(pillars: Pillar[], verticals: Vertical[], ctx: NavContext): NavGroup[] {
  const groups: NavGroup[] = []
  for (const key of ['supplies', 'jobs', 'advice', 'buy', 'rent', 'build', 'maintain', 'manage'] as const) {
    const p = pillars.find((x) => x.key === key)
    if (!p) continue
    groups.push({
      id: key,
      label: p.navLabel,
      title: p.name,
      href: pillarHref(p),
      links: p.status === 'live' ? pillarLinks(key, verticals, ctx) : [],
      featured: key === 'supplies' && p.status === 'live' ? SUPPLY_TOP_CATEGORIES : undefined,
      cta: p.status === 'live' ? PILLAR_CTA[key] : undefined,
      soon: p.status === 'coming_soon',
    })
  }
  const more = (['finance', 'insurance'] as const).map((k) => pillars.find((x) => x.key === k)).filter((p): p is Pillar => Boolean(p))
  if (more.length)
    groups.push({
      id: 'more',
      label: 'More',
      title: 'More services',
      href: pillarHref(more[0]),
      links: more.map((p) => ({ label: p.name, href: pillarHref(p), description: SERVICE_COPY[p.key].benefit, icon: p.icon, soon: p.status === 'coming_soon' || undefined })),
    })
  return groups
}

/** One service as a card or menu entry, in customer language. Coming-soon services lead to their register form. */
export function serviceTile(p: Pillar): ServiceTile {
  const soon = p.status === 'coming_soon'
  const copy = SERVICE_COPY[p.key]
  return { key: p.key, name: p.name, tagline: copy.benefit, href: soon ? `${pillarHref(p)}#register` : pillarHref(p), icon: p.icon, action: soon ? copy.soonAction : copy.action, soon }
}

/** "All services": the visible services in four customer groups, plus Living abroad and Professionals. */
export function buildAllServices(pillars: Pillar[], verticals: Vertical[]): AllServices {
  const audience = (key: VerticalKey, name: string, tagline: string, icon: string, action: string): ServiceTile | null => {
    const v = verticals.find((x) => x.key === key)
    return v ? { key, name, tagline, href: verticalHref(v), icon, action, soon: v.status === 'coming_soon' } : null
  }
  return {
    groups: SERVICE_GROUPS.map((g) => {
      const tiles = g.keys.map((k) => pillars.find((p) => p.key === k)).filter((p): p is Pillar => Boolean(p)).map(serviceTile)
      return { id: g.id, title: g.soonTitle && tiles.every((x) => x.soon) ? g.soonTitle : g.title, text: g.text, tiles }
    }).filter((g) => g.tiles.length > 0),
    diaspora: audience('diaspora', 'Living abroad', 'Buy, build and look after property in Ethiopia from wherever you live.', 'globe', 'Services for Ethiopians abroad'),
    professionals: audience('professionals', 'Find a professional', 'Architects, engineers, contractors, agents and trades.', 'users', 'Browse professionals'),
  }
}

/** "List with us" menu. "Post a job" follows the Jobs pillar. */
export function buildListWithUs(pillars: Pillar[]): NavLink[] {
  const jobs = pillars.find((p) => p.key === 'jobs')
  return [
    { label: 'Sell or let a property', href: '/list-with-us#owners' },
    { label: 'List your business', href: '/list-with-us#businesses' },
    { label: 'Become a supplier', href: '/list-with-us#suppliers' },
    { label: 'Join as a professional', href: '/list-with-us#professionals' },
    ...(jobs ? [{ label: 'Post a job', href: jobs.status === 'live' ? '/account/jobs/new' : '/jobs#register', soon: jobs.status === 'coming_soon' || undefined }] : []),
  ]
}

/** Extra links at the end of the mobile drawer. */
export const DRAWER_EXTRAS: NavLink[] = [
  { label: 'Request a service', href: '/request-service' },
  { label: 'Request a quote', href: '/supplies/quote' },
  { label: 'Find a professional', href: '/professionals' },
  { label: 'Help & advice', href: '/help' },
  { label: 'My account', href: '/account' },
]

export function buildSiteNav(pillars: Pillar[], verticals: Vertical[], ctx: NavContext): SiteNav {
  const diaspora = verticals.find((v) => v.key === 'diaspora')
  const all = buildAllServices(pillars, verticals)
  const layerLinks: Record<string, NavLink[]> = {
    diaspora: [
      { label: 'Services for Ethiopians abroad', href: '/diaspora' },
      { label: 'HagerLand Property Care', href: '/diaspora/property-care' },
      { label: 'Services where you live', href: '/diaspora/services-abroad' },
    ],
    professionals: [
      { label: 'All professionals', href: '/professionals' },
      { label: 'Architects', href: '/professionals/architects' },
      { label: 'Tradespeople', href: '/professionals/trades' },
      { label: 'Estate agents', href: '/agents' },
      { label: 'Developers', href: '/developers' },
      { label: 'Suppliers', href: '/suppliers' },
    ],
  }
  const drawer = [
    ...all.groups.flatMap((g) => g.tiles).map((tile) => {
      const p = pillars.find((x) => x.key === tile.key)
      return { tile, links: p && p.status === 'live' ? pillarLinks(p.key, verticals, ctx) : [] }
    }),
    ...[all.diaspora, all.professionals].filter((x): x is ServiceTile => Boolean(x)).map((tile) => ({ tile, links: tile.soon ? [] : layerLinks[tile.key] ?? [] })),
  ]
  return {
    main: buildMainNav(pillars, verticals, ctx),
    drawer,
    all,
    listWithUs: buildListWithUs(pillars),
    extras: DRAWER_EXTRAS,
    abroad: diaspora ? { label: 'Living abroad?', href: verticalHref(diaspora), soon: diaspora.status === 'coming_soon' || undefined } : null,
  }
}

/** Footer link columns, grouped the way customers look for them. */
export function buildFooterColumns(pillars: Pillar[], verticals: Vertical[]): { title: string; links: NavLink[] }[] {
  const p = (k: PillarKey): NavLink[] => {
    const x = pillars.find((y) => y.key === k)
    return x ? [{ label: x.name, href: pillarHref(x), soon: x.status === 'coming_soon' || undefined }] : []
  }
  const v = (k: VerticalKey, label?: string): NavLink[] => {
    const x = verticals.find((y) => y.key === k)
    return x ? [{ label: label ?? x.name, href: verticalHref(x), soon: x.status === 'coming_soon' || undefined }] : []
  }
  return [
    { title: 'Property', links: [...p('buy'), ...p('rent'), ...p('manage'), ...v('our-developments'), ...(pillars.some((x) => x.key === 'buy') ? [{ label: 'Find an agent', href: '/agents' }] : [])] },
    { title: 'Build & maintain', links: [...p('build'), ...p('maintain'), ...p('supplies'), ...v('professionals', 'Professionals'), { label: 'Request a service', href: '/request-service' }] },
    { title: 'Services', links: [...p('finance'), ...p('insurance'), ...p('jobs'), ...p('advice'), ...v('diaspora')] },
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
