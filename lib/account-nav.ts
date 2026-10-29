import 'server-only'
import type { AccountNavItem } from '@/components/account/AccountNav'
import type { Membership } from '@/lib/auth'
import { TRADE_TEXT } from '@/lib/supply/trade-prices'

/** Account menu items, adapted to what the user's organisation does (spec 7.3). */
export interface AccountExtras {
  /** HagerLand estate agency is on (sales or lettings). */
  agency?: boolean
  /** The user owns a property HagerLand manages (owner portal, spec 26.7). */
  owner?: boolean
  /** An approved trade customer while trade pricing is on (S6-4). */
  tradeOrders?: boolean
}

export function accountNavItems(active: Membership | null, newEnquiries: number, newMatches = 0, jobsLive = false, extras: AccountExtras = {}): AccountNavItem[] {
  const kind = active?.org.kind
  const items: AccountNavItem[] = [{ href: '/account', label: 'Overview', icon: 'overview' }]
  if (!kind || ['agency', 'developer', 'hagerland'].includes(kind)) items.push({ href: '/account/listings', label: 'Listings', icon: 'listings' })
  if (kind === 'developer') items.push({ href: '/account/developments', label: 'Developments', icon: 'developments' })
  if (kind === 'supplier' || kind === 'manufacturer') items.push({ href: '/account/products', label: 'Products', icon: 'products' })
  if (active) items.push({ href: '/account/company', label: 'Company profile', icon: 'company' }, { href: '/account/company/team', label: 'Team', icon: 'team' }, { href: '/account/company/branches', label: 'Branches', icon: 'branches' })
  if (kind && ['contractor', 'professional_firm', 'sole_trader', 'developer'].includes(kind)) items.push({ href: '/account/company/portfolio', label: 'Portfolio', icon: 'portfolio' })
  items.push({ href: '/account/enquiries', label: 'Enquiries', icon: 'enquiries', badge: newEnquiries || undefined })
  // Requests HagerLand matched to the business (spec 24.5).
  if (active) items.push({ href: '/account/requests', label: 'Customer requests', icon: 'leads', badge: newMatches || undefined }, { href: '/account/reviews', label: 'Reviews', icon: 'reviews' })
  // Jobs & Recruitment (spec 24.9), only while the vertical is live.
  if (jobsLive && active) items.push({ href: '/account/jobs', label: 'Jobs', icon: 'jobs' })
  items.push({ href: '/account/service-requests', label: 'My service requests', icon: 'requests' })
  items.push({ href: '/account/projects', label: 'Building projects', icon: 'projects' })
  // Valuations, viewings, offers, applications and tenancies with HagerLand's estate agency (spec 26.5).
  if (extras.agency) items.push({ href: '/account/agency', label: 'Viewings, offers and tenancies', icon: 'agency' })
  if (extras.owner) items.push({ href: '/owner', label: 'Owner portal', icon: 'owner' })
  if (jobsLive) items.push({ href: '/account/applications', label: 'My job applications', icon: 'applications' }, { href: '/account/candidate', label: 'Candidate profile', icon: 'candidate' })
  items.push({ href: '/account/quotes', label: 'Quotes', icon: 'quotes' })
  if (extras.tradeOrders) items.push({ href: '/account/trade-orders', label: TRADE_TEXT.ordersHeading, icon: 'trade' })
  items.push({ href: '/account/saved', label: 'Saved', icon: 'saved' })
  items.push({ href: '/account/alerts', label: 'Search alerts', icon: 'alerts' })
  items.push({ href: '/account/settings', label: 'Settings', icon: 'settings' })
  return items
}
